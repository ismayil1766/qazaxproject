# Railway deploy (qısa)

## 0) Vacib qeydlər
- `.env` faylını repoya qoyma. Railway-də bütün dəyişənləri **Variables** bölməsində saxla.
- Bu layihədə Prisma `provider = "postgresql"` istifadə edir, yəni Railway-də **Postgres** plugin tövsiyə olunur.

## 1) Railway-də Postgres qoş
Railway → **Add Plugin → Postgres**.

Sonra Variables-da Prisma üçün connection string set et:
- `DATABASE_URL` → Postgres-in verdiyi `postgresql://...` URL

> Əgər Railway sənə `POSTGRES_URL` və s. verirsə, sadəcə `DATABASE_URL`-u ona referenslə set et.

## 2) Deploy zamanı 502 olmasın deyə (tövsiyə)
Runtime-da `prisma db push` bəzən DB hazır olmamış işlədiyi üçün gecikmə yarada bilər.

Variables əlavə et:
- `SKIP_DB_PUSH=true`

Sonra ilk deploydan sonra bir dəfə manuel schema apply et:
```bash
npx prisma db push
```

## 3) Şəkillər (uploads) — opsional
Bu layihə default olaraq `public/uploads` istifadə edir.
Railway-də şəkillər silinməsin deyə **Persistent Volume** yaradıb mount et:
- Mount path: `/app/public/uploads`

## 4) Prisma log mesajı (opsional)
Prisma "Update available" mesajı çıxmasın deyə:
- `PRISMA_HIDE_UPDATE_MESSAGE=true`


## Admin email OTP (SMTP və ya Brevo API)

### Variant A — Brevo API (tövsiyə)
Railway Variables:
- `BREVO_API_KEY` = Brevo transactional API key (xkeysib-...)
- `BREVO_SENDER_EMAIL` = Brevo-da təsdiqli sender email (məs: a3c76b001@smtp-brevo.com və ya sənin verified sender-in)
- `BREVO_SENDER_NAME` = Göndərən adı (məs: Qazax Elan)

> `BREVO_API_KEY` set olsa, admin email OTP-ləri **SMTP-dən əvvəl** Brevo API ilə göndərilir.

### Variant B — SMTP
Railway Variables:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Debug üçün:
- `SMTP_DEBUG=1`

> Production-da Brevo/SMTP yoxdursa admin login email OTP mərhələsində dayanacaq. Yalnız fövqəladə hal üçün `ALLOW_CONSOLE_EMAIL_FALLBACK=1` istifadə et.
