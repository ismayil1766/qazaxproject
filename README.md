# Şəhər Elanları (Tap.az + Turbo.az üslubunda) — MVP

Bu layihə **iki bölməli** elan platformasıdır:
- **Avtomobillər** (Turbo.az kimi daha dərin filtr)
- **Ümumi elanlar** (Tap.az kimi kateqoriya + axtarış)

MVP-də:
- Elan əlavə et → **PENDING** statusu ilə düşür (moderasiya)
- Admin panel → təsdiqlə / rədd et
- Login → **telefon və ya email + şifrə** ilə birbaşa sessiya açılır (istifadəçi OTP deaktivdir).

## 1) Quraşdırma

> Təhlükəsizlik: `.env` faylına **heç vaxt** real parol / token yazıb repoya push etməyin.
> Bu layihədə `.gitignore` `.env`-i ignore edir, amma yenə də diqqətli olun.

```bash
npm i
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run seed
npm run dev
```

> Qeyd: Yeni versiyada əlavələr var:
> - `Listing.rejectReason` (rədd səbəbi)
> - `Favorite` (seçilmişlər)
> - `Notification` (sayt daxili bildirişlər)
> - `User.lastName`, `User.avatarUrl`
> Əgər köhnə DB-niz varsa, mütləq `npm run prisma:migrate` işlədib DB-ni yeniləyin.

Sonra aç: `http://localhost:3000`

## 2) Admin panel

Admin panel üçün MFA axını var:
- `.env` içində `ADMIN_USER`, `ADMIN_PASS`, `ADMIN_SESSION_SECRET`, `OTP_SECRET` dəyərlərini dəyiş
- Brevo və ya SMTP sazla ki admin email OTP real gəlsin
- Admin səhifə: `http://localhost:3000/admin`

> Qeyd: köhnə `?key=ADMIN_KEY` fallback-i default olaraq söndürülüb. Yalnız fövqəladə hal üçün `ALLOW_ADMIN_KEY_FALLBACK=1` edərək müvəqqəti aça bilərsiniz.

## 3) Data bazası
Layihə **PostgreSQL** üçün qurulub (Prisma `provider = "postgresql"`).

- Lokal üçün ən rahat variant: Docker Postgres / Neon / Railway Postgres.
- `.env` içində `DATABASE_URL` dəyərini Postgres connection string edin.

## 4) Şəkil yükləmə (S3 / local fallback)
Upload route (`/api/upload`) S3 (Railway Buckets və s.) ilə işləyir.

- Əgər `S3_*` env-lər set olunubsa: şəkillər bucket-ə yazılır və `/media/...` ilə oxunur.
- Əgər S3 env-lər yoxdursa (lokal dev): şəkillər `UPLOADS_DIR` (yoxdursa `./public/uploads`) qovluğuna yazılır və yenə `/media/...` ilə oxunur.

## 5) Növbəti upgrade ideyaları (Tap/Turbo səviyyəsinə)
- Telefon OTP login (Supabase/Clerk)
- Şəkil upload (Cloudinary/S3)
- VIP/Premium paketlər + ödəniş (hazırda istifadəçi müraciəti deaktivdir)
- Favoritlər, elan müddəti, arxiv
- Anti-fırıldaq və limitlər
- SEO: schema.org Vehicle/Product + sitemap

Uğurlar! 🙂


## Qeydiyyat / Daxil ol
- Sayta baxmaq sərbəstdir.
- Elan yerləşdirmək və şəkil yükləmək üçün daxil olmaq lazımdır.

### Admin email OTP real gəlməsi üçün (SMTP/Brevo)
`.env` faylında bunları doldur:
- `SMTP_HOST`
- `SMTP_PORT` (587 və ya 465)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Production-da SMTP/Brevo doldurulmasa admin email OTP üçün login ya alınmayacaq, ya da yalnız explicit konsol fallback ilə işləyəcək.

### Demo hesab (seed sonrası)
- Email: demo@local.az
- Şifrə: Demo1234
