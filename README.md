# Dershane Portalı

Dershane Portalı; yöneticilerin kullanıcıları, sınıfları, dersleri, ders programlarını ve yoklamaları yönetebildiği, öğretmenlerin kendi programlarından yoklama alabildiği, öğrencilerin ise programlarını ve yoklama geçmişlerini takip edebildiği full-stack bir dershane yönetim sistemidir.

Proje, React tabanlı responsive bir web arayüzü ile Node.js ve Express üzerinde çalışan REST API'den oluşur. Uygulama verilerini PostgreSQL'de saklar ve `admin`, `teacher` ve `student` rolleri için farklı yetki ve ekranlar sunar.

## Özellikler

### Yönetici

- Toplam kullanıcı, ders, sınıf ve program sayılarını gösteren yönetim paneli
- Arama, filtreleme, sıralama ve sayfalama destekli kullanıcı yönetimi
- Kullanıcı oluşturma, güncelleme, aktif/pasif duruma alma ve silme
- Sınıf ve ders tanımlarını oluşturma, güncelleme ve silme
- FullCalendar üzerinden ders programı oluşturma, düzenleme ve silme
- Öğretmen, sınıf veya ders çakışmalarını engelleyen program doğrulaması
- Sınıf, öğrenci ve tarih aralığına göre filtrelenebilen günlük yoklama raporları
- Yoklama süresi dolmuş derslerde yönetici düzeltmesi

### Öğretmen

- Yalnızca kendisine atanmış dersleri içeren kişisel program
- Ders başladıktan sonra açılan sınıf yoklaması
- Öğrencileri `var`, `yok`, `geç` veya `izinli` olarak işaretleme
- Ders bitiminden 24 saat sonra otomatik olarak kilitlenen yoklama kayıtları

### Öğrenci

- Yalnızca kendi sınıfına ait ders programı
- Tarih aralığına göre filtrelenebilen kişisel yoklama geçmişi
- Yoklama durumlarına göre özet sayaçlar

### Ortak Uygulama Özellikleri

- HttpOnly cookie tabanlı güvenli oturum yönetimi
- Profil bilgilerini ve şifreyi güncelleme
- Tek kullanımlık bağlantı ve e-posta ile şifre sıfırlama
- Türkçe ve İngilizce arayüz
- Açık ve koyu tema
- Masaüstü, tablet ve mobil ekranlara uyumlu responsive tasarım
- Rol bazlı sayfa ve menü görünürlüğü
- Form doğrulama, bildirimler, yükleme durumları ve global hata ekranı
- Silme ve kaydedilmemiş değişiklikler için onay pencereleri

## Teknolojiler

### Frontend

- React 19 ve Vite
- Mantine UI ve Tabler Icons
- Tailwind CSS
- React Router
- TanStack Query
- Axios
- FullCalendar
- i18next ve react-i18next

### Backend

- Node.js ve Express 5
- PostgreSQL ve `pg`
- JWT ve cookie-parser
- bcrypt
- Nodemailer
- CORS ve dotenv

### Test ve Kod Kalitesi

- Vitest
- React Testing Library
- Node.js yerleşik test runner
- Oxlint

## Proje Yapısı

```text
.
├── app.js                       # Express uygulaması ve API router kayıtları
├── server.js                    # Backend başlangıç noktası
├── components/                 # Backend feature modülleri
│   ├── auth/
│   ├── attendance/
│   ├── classes/
│   ├── courses/
│   ├── dashboard/
│   ├── roles/
│   ├── schedules/
│   └── users/
├── db/
│   ├── create.sql              # Yeni veritabanı şeması
│   ├── migrate.js              # Migration çalıştırıcısı
│   ├── migrations/             # Sıralı SQL migration dosyaları
│   └── pool.js                 # PostgreSQL bağlantı havuzu
├── middlewares/                # Auth, rol, async ve hata middleware'leri
├── utils/                      # Ortak backend yardımcıları
├── test/                       # Backend testleri
├── frontend/
│   ├── src/
│   │   ├── app/                # Provider, router, guard ve i18n kurulumu
│   │   ├── components/         # Ortak UI ve layout bileşenleri
│   │   ├── features/           # Ekranlar, API istemcileri ve feature kodları
│   │   ├── lib/                # Axios, React Query ve bildirim yardımcıları
│   │   └── locales/            # Türkçe ve İngilizce çeviriler
│   └── package.json
└── docs/                       # Frontend ve backend mimari kuralları
```

Backend feature'ları aşağıdaki katman akışını izler:

```text
route → controller → service → repository → PostgreSQL
```

Frontend kodu da kullanıcı, program, yoklama ve kimlik doğrulama gibi alanlara göre feature-bazlı olarak ayrılmıştır. Daha ayrıntılı kurallar için:

- [Frontend Architecture](docs/frontend-architecture.md)
- [Backend Architecture](docs/backend-architecture.md)

## Gereksinimler

- Node.js ve npm
- PostgreSQL
- Şifre sıfırlama e-postalarını göndermek için bir SMTP hesabı

Projede Docker yapılandırması veya otomatik veritabanı seed komutu bulunmadığından PostgreSQL veritabanı ve başlangıç kayıtları manuel olarak hazırlanır.

## Kurulum

### 1. Projeyi hazırlayın

Backend bağımlılıklarını proje kökünde yükleyin:

```bash
npm install
```

Frontend bağımlılıklarını yükleyin:

```bash
cd frontend
npm install
cd ..
```

### 2. Backend ortam değişkenlerini ayarlayın

Proje kökündeki `.env.example` dosyasını `.env` adıyla kopyalayın ve değerleri doldurun:

```env
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/dershane
JWT_SECRET=replace-with-a-long-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=no-reply@example.com
CLIENT_URL=http://localhost:5173
RESET_URL_BASE=http://localhost:5173/reset-password
```

| Değişken | Açıklama |
| --- | --- |
| `PORT` | Backend HTTP portu. Varsayılan değer `3000`'dir. |
| `DATABASE_URL` | PostgreSQL bağlantı adresi. |
| `JWT_SECRET` | JWT imzalamak ve doğrulamak için kullanılan gizli anahtar. |
| `SMTP_HOST` | Şifre sıfırlama e-postaları için SMTP sunucusu. |
| `SMTP_PORT` | SMTP sunucusunun portu. |
| `SMTP_SECURE` | Güvenli SMTP bağlantısının kullanılıp kullanılmayacağı. |
| `SMTP_USER` | SMTP kullanıcı adı. |
| `SMTP_PASSWORD` | SMTP şifresi. |
| `SMTP_FROM` | Gönderilen e-postalarda kullanılacak gönderen adresi. |
| `CLIENT_URL` | CORS tarafından izin verilen frontend adresi. |
| `RESET_URL_BASE` | E-postadaki şifre sıfırlama bağlantısının temel adresi. |

SMTP ayarları yapılmadan uygulamanın diğer bölümleri çalışır; ancak şifre sıfırlama e-postası teslim edilemez. Gizli değerleri repoya eklemeyin.

### 3. Frontend ortam değişkenini ayarlayın

`frontend/.env.example` dosyasını `frontend/.env` adıyla kopyalayın:

```env
VITE_API_URL=http://localhost:3000/api
```

`VITE_API_URL`, frontend'in kullanacağı API temel adresidir.

### 4. Veritabanını hazırlayın

Yeni bir kurulumda önce PostgreSQL veritabanını oluşturun, ardından `db/create.sql` dosyasını çalıştırın. Örneğin `psql` ile:

```bash
psql -d dershane -f db/create.sql
```

Uygulamanın kullandığı sabit sistem rollerini ekleyin:

```sql
INSERT INTO roles (name)
VALUES ('admin'), ('teacher'), ('student')
ON CONFLICT (name) DO NOTHING;
```

Şema oluşturulduktan sonra migration'ları da çalıştırın. Böylece ek indeksler uygulanır ve migration geçmişi `schema_migrations` tablosunda kaydedilir:

```bash
npm run migrate
```

İlk yönetici hesabı için bir bcrypt şifre hash'i üretin:

```bash
node -e "require('bcrypt').hash('ChangeMe123!', 10).then(console.log)"
```

Komutun ürettiği hash'i aşağıdaki sorgudaki yer tutucuyla değiştirerek başlangıç yöneticisini oluşturun:

```sql
INSERT INTO users (role_id, name, email, password, is_active)
SELECT id, 'Sistem Yöneticisi', 'admin@example.com', 'BCRYPT_HASH_BURAYA', true
FROM roles
WHERE name = 'admin';
```

İlk girişten sonra örnek e-posta adresini ve şifreyi profil ekranından değiştirin.

Mevcut bir veritabanını güncellemek için migration'ları çalıştırın:

```bash
npm run migrate
```

Migration dosyaları isim sırasına göre uygulanır; daha önce tamamlanan migration'lar tekrar çalıştırılmaz.

### 5. Uygulamayı çalıştırın

Bir terminalde backend geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Başka bir terminalde frontend'i başlatın:

```bash
cd frontend
npm run dev
```

Varsayılan geliştirme adresleri:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- API temel adresi: `http://localhost:3000/api`

## NPM Komutları

### Backend

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Backend'i Nodemon ile geliştirme modunda başlatır. |
| `npm start` | Backend'i production başlangıç komutuyla çalıştırır. |
| `npm run migrate` | Uygulanmamış PostgreSQL migration'larını çalıştırır. |
| `npm test` | Backend servis ve yardımcı testlerini çalıştırır. |

### Frontend

Komutları `frontend/` dizininde çalıştırın.

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Vite geliştirme sunucusunu başlatır. |
| `npm run build` | Production frontend paketini oluşturur. |
| `npm run preview` | Oluşturulan production paketini yerel olarak sunar. |
| `npm run lint` | Frontend kodunu Oxlint ile kontrol eder. |
| `npm test` | Vitest ve React Testing Library testlerini çalıştırır. |

## Kimlik Doğrulama ve Güvenlik

- Başarılı girişten sonra JWT, JavaScript tarafından okunamayan `access_token` adlı HttpOnly cookie'ye yazılır.
- Frontend API isteklerini cookie ile göndermek için Axios'ta `withCredentials` kullanır.
- Backend her korumalı istekte JWT'yi doğrular ve kullanıcının güncel rolünü, aktiflik durumunu, sınıfını ve `token_version` değerini PostgreSQL'den tekrar okur.
- Şifre değiştirme veya sıfırlama işlemi `token_version` değerini artırarak mevcut oturumları geçersiz kılar.
- Şifreler bcrypt ile hashlenir ve en az sekiz karakter olmalıdır.
- Şifre sıfırlama tokenları veritabanında yalnızca SHA-256 hash olarak tutulur, tek kullanımlıktır ve 30 dakika sonra geçersiz olur.
- Giriş ve şifre sıfırlama endpointleri process içi rate limiting ile korunur.
- Backend CORS isteklerini yalnızca `CLIENT_URL` üzerinden ve credentials desteğiyle kabul eder.
- Beklenen API hataları kararlı bir `{ error, errorCode }` yapısıyla döner; beklenmeyen hatalarda dahili ayrıntılar istemciye açılmaz.

## Roller ve Yetkiler

| Özellik | Admin | Öğretmen | Öğrenci |
| --- | :---: | :---: | :---: |
| Yönetim paneli | ✓ | — | — |
| Kullanıcı, sınıf ve ders yönetimi | ✓ | — | — |
| Tüm ders programını yönetme | ✓ | — | — |
| Kendi ders programını görme | ✓ | ✓ | ✓ |
| Ders yoklaması alma | ✓ | Kendi dersi | — |
| Yoklama raporlarını görme | ✓ | — | Kendi geçmişi |
| Profil ve şifre güncelleme | ✓ | ✓ | ✓ |

Öğretmenler yalnızca kendilerine atanmış dersleri, öğrenciler ise yalnızca bağlı oldukları sınıfın programını görür. Bu filtreleme yalnızca arayüzde değil, backend repository sorgularında da uygulanır.

## API Modülleri

Tüm API endpointleri `/api` altında sunulur:

| Modül | Prefix | Açıklama |
| --- | --- | --- |
| Auth | `/api/auth` | Giriş, çıkış, profil ve şifre işlemleri |
| Users | `/api/users` | Kullanıcı yönetimi, arama, filtreleme ve sayfalama |
| Roles | `/api/roles` | Sabit sistem rollerini listeleme |
| Classes | `/api/classes` | Sınıf yönetimi |
| Courses | `/api/courses` | Ders yönetimi |
| Schedules | `/api/schedules` | Rol bazlı program ve ders yoklaması işlemleri |
| Attendance | `/api/attendance` | Kişisel yoklama geçmişi ve yönetici raporları |
| Dashboard | `/api/dashboard` | Yönetici özet metrikleri |

## Testler

Backend testleri servis kurallarını, kullanıcı doğrulamalarını, program çakışmalarını, parola sıfırlamayı, rate limiting'i ve yoklama yetkilerini kapsar:

```bash
npm test
```

Frontend testleri formları, route guard'ları, sidebar yetkilerini, hata ve yükleme ekranlarını, takvim etkileşimlerini ve yoklama akışlarını kapsar:

```bash
cd frontend
npm test
```

Production frontend paketini doğrulamak için:

```bash
cd frontend
npm run lint
npm run build
```
