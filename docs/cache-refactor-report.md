# Cache ve API İstekleri Refactor Raporu

## Amaç

Bu refactor, kullanıcı sayfalar arasında gezerken aynı verilerin gereksiz yere tekrar indirilmesini ve backend'in aynı kullanıcıyı kısa süre içinde Supabase'den tekrar tekrar doğrulamasını azaltır.

Sistemde periyodik istek (polling) yoktur. Bir cache süresinin dolması tek başına istek başlatmaz. İstek ancak veri yeniden gerektiğinde, süresi dolmuş aktif bir ekran odaklandığında veya yapılan bir değişiklik ilgili veriyi geçersiz kıldığında gönderilir.

## Yapılan Değişiklikler

### Frontend

- React Query için ortak cache süreleri tanımlandı.
- Liste, detay ve seçim verilerinin birbiriyle çakışmaması için merkezi query key yapısı oluşturuldu.
- Roller, sınıflar, dersler ve aktif öğretmenler `GET /api/lookups` üzerinden tek istekte birleştirildi.
- Öğrenci ve öğretmen seçim alanları için tüm kullanıcı sayfalarını indiren yöntem kaldırıldı.
- Seçim alanları artık `GET /api/users/options` üzerinden yalnızca `id`, `name` ve `class_id` alanlarını alıyor.
- Schedule, Users, Attendance, Dashboard ve tanım ekranları ortak cache kurallarına geçirildi.
- Mutation cevapları mümkün olduğunda doğrudan cache'e yazılıyor.
- Attendance kaydından sonra aynı attendance verisini tekrar isteyen GET kaldırıldı.
- Sayfa ve filtre değişimlerinde cache anahtarları birbirinden açıkça ayrıldı.

### Backend

- `GET /api/lookups` endpointi eklendi. Dört referans listesini tek SQL round-trip'iyle döndürüyor.
- `GET /api/users/options?role=student|teacher&class_id=<optional>` endpointi eklendi.
- User options endpointi yalnızca aktif kullanıcıları döndürüyor ve rol parametresini allowlist ile doğruluyor.
- JWT doğrulaması korunurken kullanıcı auth durumu 30 saniyelik process-memory cache'e alındı.
- Aynı kullanıcıya ait eşzamanlı auth istekleri tek Supabase sorgusunu paylaşıyor.
- Auth cache 10.000 kayıtla sınırlandırıldı ve süresi dolan kayıtlar temizleniyor.
- Rol, sınıf, aktiflik veya şifre değişikliği ile kullanıcı silme işlemi ilgili auth cache kaydını temizliyor.
- Yönetici tarafından şifre değiştirildiğinde `token_version` artırılıyor; önceki oturumlar geçersiz hale geliyor.
- Schedule create/update cevapları artık güncel ve ilişkisel isimleri içeren schedule detayını döndürüyor.
- Attendance save endpointi öğrenci filtresini koruyarak cache'e doğrudan yazılabilecek güncel sonucu döndürüyor.

## Hangi Veriler Cache'te Tutuluyor?

Frontend cache yalnızca tarayıcı belleğindedir. Sekme tamamen yenilenirse cache sıfırlanır. Backend, iş verilerini cache'lemez; backend tarafında yalnızca kısa süreli kullanıcı auth durumu tutulur.

| Veri grubu | Örnekler | Taze kabul edilme süresi |
|---|---|---:|
| Lookup verileri | Roller, sınıflar, dersler, aktif öğretmenler | 30 dakika |
| Operasyonel veriler | Kullanıcı listeleri, schedule, attendance ve raporlar, öğrenci seçenekleri | 2 dakika |
| Dashboard | Kullanıcı, ders, sınıf ve schedule özetleri | 5 dakika |
| Kullanıcı profili | Giriş yapan kullanıcının profil bilgisi | 5 dakika |
| Backend auth durumu | Rol, sınıf, aktiflik ve token version | 30 saniye |

Kullanılmayan frontend sorguları 30 dakika bellekte kalır (`gcTime`). Bu süre, verinin 30 dakika güncel sayıldığı anlamına gelmez. Örneğin bir kullanıcı listesi 2 dakika sonra eski sayılır fakat tekrar gerekmezse en fazla 30 dakika bellekte tutulabilir.

## İstek Ne Zaman Atılır?

Bir veri için istek şu durumlarda gönderilir:

1. Veri ilk kez istendiğinde.
2. Verinin tazelik süresi dolduktan sonra ilgili ekran tekrar açıldığında.
3. Verinin tazelik süresi dolmuşken kullanıcı tarayıcı penceresine geri döndüğünde.
4. Ekleme, güncelleme veya silme işlemi ilgili cache'i geçersiz kıldığında.
5. Tam sayfa yenilenip tarayıcı belleğindeki cache sıfırlandığında.

Şu durumlarda istek gönderilmez:

- Kullanıcı aynı route'a verinin tazelik süresi içinde dönerse.
- Cache süresi dolsa bile ilgili veri hiçbir ekranda kullanılmıyorsa.
- İlgisiz bir mutation yapıldıysa.
- Attendance save cevabı güncel attendance kaydını zaten içeriyorsa aynı kayıt tekrar GET ile alınmaz.

## Sayfa Bazında Beklenen İstek Sayıları

Aşağıdaki sayılar global profil isteğini değil, sayfanın kendi ana veri isteklerini gösterir.

| Ekran | İlk açılış | Lookup cache sıcaksa | 2 dakika içinde aynı route'a dönüş |
|---|---:|---:|---:|
| Schedule (admin) | 2: lookup + schedule | 1: schedule | 0 |
| Users | 2: lookup + sayfalı kullanıcı listesi | 1: kullanıcı listesi | 0 |
| Attendance (admin) | 3: lookup + öğrenci seçenekleri + rapor | 2: seçenekler + rapor | 0 |
| Class/Course/Role | 1: lookup | 0 | 0 |
| Dashboard | 1 | 1 | 5 dakika içinde 0 |

Filtre veya sayfa parametresi değişirse bu farklı bir veri kümesi sayıldığı için yeni istek gönderilir. Daha önce aynı parametrelerle alınmış ve hâlâ taze olan bir sonuç varsa cache kullanılır.

## Mutation Sonrası Davranış

| İşlem | Doğrudan güncellenen cache | Yenilenmek üzere işaretlenen veriler |
|---|---|---|
| Kullanıcı ekleme/güncelleme/silme | Düzenlenen kullanıcı detayı | Kullanıcı listeleri, kullanıcı seçenekleri, lookup ve dashboard |
| Schedule ekleme/güncelleme/silme | Düzenlenen schedule detayı | Schedule listeleri ve dashboard |
| Attendance kaydetme | Açık attendance kaydı | Attendance raporları |
| Sınıf/ders değişikliği | Düzenlenen tanım detayı | Lookup, schedule, attendance raporları ve dashboard |

React Query yalnızca aktif olan geçersiz sorguları hemen yeniler. O anda ekranda kullanılmayan sorgular için HTTP isteği atılmaz; bu sorgular sonraki kullanımda yenilenir.

## Backend Auth Cache Davranışı

- JWT imzası her istekte kontrol edilir.
- İlk geçerli istekte auth durumu Supabase'den okunur.
- Aynı Vercel instance'ında sonraki 30 saniyelik istekler bu sonucu kullanır.
- İlk anda birden fazla istek gelirse hepsi aynı devam eden veritabanı sorgusunu paylaşır.
- Güvenlikle ilgili kullanıcı değişiklikleri cache'i hemen temizler.
- Vercel instance'ları bellek paylaşmadığı için başka bir instance eski durumu en fazla 30 saniye görebilir.
- Redis veya dağıtık cache kullanılmamıştır.

## Kod Kalitesi

- Süreler bileşenlere dağılmış sayılar yerine `cache-policy` içinde isimlendirilmiştir.
- Query key üretimi `query-keys` içinde merkezileştirilmiştir.
- API erişimi, cache politikası ve ekran bileşenleri ayrı sorumluluklarda tutulmuştur.
- Auth cache küçük ve bağımsız bir modüldür; TTL, eşzamanlı yükleme paylaşımı, invalidation ve kapasite sınırı ayrı ayrı test edilebilir.
- Mevcut endpointler geriye dönük uyumluluk için korunmuştur.
- Veritabanı şeması değişmemiştir ve migration gerekmemektedir.

## Doğrulama

Refactor sonunda aşağıdaki kontroller çalıştırılmıştır:

- Backend testleri: 24 test
- Frontend testleri: 34 test
- Frontend lint: başarılı
- Frontend production build: başarılı

Canlı ortamda son kontrol için Vercel Network/Function metrikleri ve Supabase sorgu sayıları eski durumla karşılaştırılmalıdır. Özellikle Schedule ekranının ilk açılışı, route'a geri dönüş ve eşzamanlı API çağrılarındaki auth sorgu sayısı izlenmelidir.
