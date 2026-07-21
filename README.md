# Dershane Node API

Basit bir dershane yonetim sistemi icin gelistirilmis Node.js + Express backend API projesidir. Frontend yoktur; endpointler Postman veya benzeri API clientlari ile test edilebilir.

## Ozellikler

- JWT tabanli login sistemi
- Role-based authorization
- Admin, teacher ve student rolleri
- Kullanici CRUD islemleri
- Rol CRUD islemleri
- Sinif/alan CRUD islemleri
- Ders CRUD islemleri
- Ders programi CRUD islemleri
- PostgreSQL veritabani
- Sifrelerin bcrypt ile hashlenmesi

## Teknolojiler

- Node.js
- Express.js
- PostgreSQL
- pg
- bcrypt
- jsonwebtoken
- dotenv
- nodemon

## Proje Yapisi

```text
.
+-- app.js
+-- server.js
+-- db/
|   +-- pool.js
|   +-- create.sql
+-- middlewares/
|   +-- auth-middleware.js
|   +-- role-middleware.js
+-- components/
|   +-- auth/
|   |   +-- auth.route.js
|   |   +-- auth.controller.js
|   |   +-- auth.service.js
|   |   +-- auth.repository.js
|   +-- users/
|   |   +-- users.route.js
|   |   +-- users.controller.js
|   |   +-- users.service.js
|   |   +-- users.repository.js
|   +-- roles/
|   |   +-- roles.route.js
|   |   +-- roles.controller.js
|   |   +-- roles.service.js
|   |   +-- roles.repository.js
|   +-- classes/
|   |   +-- classes.route.js
|   |   +-- classes.controller.js
|   |   +-- classes.service.js
|   |   +-- classes.repository.js
|   +-- courses/
|   |   +-- courses.route.js
|   |   +-- courses.controller.js
|   |   +-- courses.service.js
|   |   +-- courses.repository.js
|   +-- schedules/
|       +-- schedules.route.js
|       +-- schedules.controller.js
|       +-- schedules.service.js
|       +-- schedules.repository.js
```

Component dosyalarinin gorevi:

- `*.route.js`: Endpoint adreslerini ve middleware siralamasini tanimlar.
- `*.controller.js`: `req` bilgisini alir, service sonucunu HTTP response olarak dondurur.
- `*.service.js`: Is kurallarini ve validasyonlari yonetir.
- `*.repository.js`: PostgreSQL sorgularini calistirir.

## Kurulum

Bagimliliklari yukle:

```bash
npm install
```

`.env` dosyasi olustur:

```env
PORT=3000
DATABASE_URL=postgres://postgres:123456@localhost:5432/postgres
JWT_SECRET=your-secret-key
```

PostgreSQL tarafinda `create.sql` dosyasindaki tablolari calistir.

Gelisitirme sunucusunu baslat:

```bash
npm run dev
```

Production calistirma:

```bash
npm start
```

## Veritabani Tablolari

Projede temel olarak 5 tablo vardir:

- `roles`: admin, teacher, student gibi rolleri tutar.
- `classes`: Sozel, Sayisal, TM, Dil gibi sinif/alan bilgisini tutar.
- `users`: tum kullanicilari tutar.
- `courses`: dersleri tutar.
- `schedules`: ders programini tutar.

## Auth Mantigi

Login disindaki endpointler token ile korunur. Token header icinde gonderilir:

```text
Authorization: Bearer TOKEN
```

Token dogrulama:

- `auth-middleware.js` token var mi, format dogru mu ve token gecerli mi kontrol eder.
- Gecerli token varsa token payload bilgisini `req.user` icine koyar.

Rol kontrolu:

- `role-middleware.js` kullanicinin ilgili endpoint icin gerekli role sahip olup olmadigini kontrol eder.
- Admin olmayan kullanici admin endpointlerine erisirse `403 Forbidden` alir.

## Endpoint Ozeti

Base URL:

```text
http://localhost:3000
```

### Auth

```text
POST /api/auth/login
GET  /api/auth/profile
```

Login body:

```json
{
  "email": "admin@example.com",
  "password": "123456"
}
```

### Users

Tum users endpointleri admin yetkisi ister.

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

User create body:

```json
{
  "role_id": 3,
  "class_id": 2,
  "name": "Yavuz",
  "email": "yavuz@example.com",
  "password": "123456"
}
```

### Roles

Roles CRUD endpointleri admin yetkisi ister.

```text
GET    /api/roles
GET    /api/roles/:id
POST   /api/roles
PUT    /api/roles/:id
DELETE /api/roles/:id
```

Role create body:

```json
{
  "name": "admin"
}
```

### Classes

Class listeleme icin token yeterlidir. Create, update ve delete islemleri admin yetkisi ister.

```text
GET    /api/classes
GET    /api/classes/:id
POST   /api/classes
PUT    /api/classes/:id
DELETE /api/classes/:id
```

Class create body:

```json
{
  "name": "Sayisal"
}
```

### Courses

Course listeleme icin token yeterlidir. Create, update ve delete islemleri admin yetkisi ister.

```text
GET    /api/courses
GET    /api/courses/:id
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id
```

Course create body:

```json
{
  "name": "Matematik"
}
```

### Schedules

Schedule listeleme token ister ve role gore filtrelenir:

- Admin tum ders programini gorur.
- Teacher sadece kendi derslerini gorur.
- Student sadece kendi class programini gorur.

Create, update ve delete islemleri admin yetkisi ister.

```text
GET    /api/schedules
GET    /api/schedules/:id
POST   /api/schedules
PUT    /api/schedules/:id
DELETE /api/schedules/:id
```

Schedule create body:

```json
{
  "course_id": 1,
  "class_id": 2,
  "teacher_id": 5,
  "start_time": "2026-07-15 09:00:00",
  "end_time": "2026-07-15 10:30:00"
}
```

## Ornek Roller

Baslangic icin veritabanina su roller eklenebilir:

```sql
INSERT INTO roles (name)
VALUES ('admin'), ('teacher'), ('student');
```

## Ornek Siniflar

```sql
INSERT INTO classes (name)
VALUES ('Sozel'), ('Sayisal'), ('TM'), ('Dil');
```

## Notlar

- `users.password` alaninda duz sifre degil, bcrypt hash tutulur.
- `schedules.teacher_id`, `users.id` degeridir ve bu kullanicinin role degeri `teacher` olmalidir.
- `updated_at` alanlari update sorgularinda manuel olarak `NOW()` ile guncellenir.
- Delete islemleri hard delete seklindedir. Iliskili kayit varsa PostgreSQL foreign key hatasi doner.
