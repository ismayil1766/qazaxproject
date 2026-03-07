# Live audit — 2026-03-07

Bu paketdə deploy öncəsi aşağıdakı sərtləşdirmələr edilib:

## Dəyişdirilən əsas məqamlar
- `VIP üçün müraciət et / Premium üçün müraciət et` user-side UI və API default olaraq deaktiv edildi.
- Admin üçün köhnə `?key=ADMIN_KEY` fallback default olaraq söndürüldü.
- Redirect helper yalnız same-origin daxili redirect-lərə icazə verir.
- Listing şəkilləri yalnız local `/media/...` və `/uploads/...` yolundan qəbul olunur.
- `next/image` üçün wildcard remote host icazəsi çıxarıldı.
- Upload route zədələnmiş/dəstəklənməyən şəkilləri və limitdən artıq fayl sayını daha sərt rədd edir.
- Admin cookie və login-flow cookie `SameSite=Strict` edildi.
- Production-da mail provider yoxdursa konsol OTP fallback explicit env olmadan istifadə olunmur.
- Committed `tsconfig.tsbuildinfo` silindi.

## Deploy öncəsi yoxlanmalı env-lər
- `DATABASE_URL`
- `OTP_SECRET`
- `ADMIN_SESSION_SECRET`
- `ADMIN_USER`
- `ADMIN_PASS`
- `ADMIN_EMAIL`
- `ADMIN_MFA_ENC_KEY`
- `BREVO_API_KEY` **və ya** `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` + `SMTP_FROM`
- `PROMOTION_REQUESTS_ENABLED=0`
- `NEXT_PUBLIC_PROMOTION_REQUESTS_ENABLED=0`
- `ALLOW_ADMIN_KEY_FALLBACK=0`

## Qeyd
Bu audit kod əsaslı best-effort yoxlamadır. Container mühitində package install/build tam işləmədiyi üçün tam compile/e2e smoke test burada yekunlaşdırılmayıb; deploy sonrası aşağıdakı 5 axını real mühitdə yoxla:
1. User qeydiyyat + login
2. Elan yaratma + şəkil upload
3. Admin login (email OTP + authenticator)
4. Admin approve/reject flow
5. Profil > Elanlarım səhifəsində promo düymələrinin görünməməsi
