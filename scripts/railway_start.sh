#!/usr/bin/env bash
set -euo pipefail

export PRISMA_HIDE_UPDATE_MESSAGE="${PRISMA_HIDE_UPDATE_MESSAGE:-1}"

# Generate Prisma client (safe at runtime; ensures the client exists in standalone output).
echo "[railway_start] Generating Prisma client (safe)..."
npm run prisma:generate

# DB schema apply is best-effort.
# - Build phase can't reach Railway Postgres
# - Runtime may race Postgres readiness
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[railway_start] DATABASE_URL is not set; skipping prisma db push." >&2
else
  # Prefer a non-pooling/external URL if available.
  EFFECTIVE_DATABASE_URL="${DATABASE_URL}"
  if [[ -n "${DATABASE_URL_NON_POOLING:-}" ]]; then
    EFFECTIVE_DATABASE_URL="${DATABASE_URL_NON_POOLING}"
  elif [[ -n "${POSTGRES_URL_NON_POOLING:-}" ]]; then
    EFFECTIVE_DATABASE_URL="${POSTGRES_URL_NON_POOLING}"
  elif [[ -n "${DATABASE_URL_PUBLIC:-}" ]]; then
    EFFECTIVE_DATABASE_URL="${DATABASE_URL_PUBLIC}"
  elif [[ -n "${DATABASE_URL_EXTERNAL:-}" ]]; then
    EFFECTIVE_DATABASE_URL="${DATABASE_URL_EXTERNAL}"
  fi
  export DATABASE_URL="${EFFECTIVE_DATABASE_URL}"

  if [[ "${SKIP_DB_PUSH:-false}" == "true" ]]; then
    echo "[railway_start] SKIP_DB_PUSH=true; skipping prisma db push."
  else
    echo "[railway_start] DATABASE_URL is set; attempting prisma db push with retries (best-effort)..."

    # Retry because Railway can start the app container before the DB is fully reachable.
    max_attempts="${PRISMA_DB_PUSH_ATTEMPTS:-10}"
    sleep_seconds="${PRISMA_DB_PUSH_SLEEP_SECONDS:-1}"

    attempt=1
    db_push_ok=false
    while [[ "$attempt" -le "$max_attempts" ]]; do
      if npx prisma db push; then
        echo "[railway_start] Prisma schema applied."
        db_push_ok=true
        break
      fi

      echo "[railway_start] prisma db push failed (attempt $attempt/$max_attempts). Retrying in ${sleep_seconds}s..." >&2
      attempt=$((attempt+1))
      sleep "$sleep_seconds"
    done

    if [[ "${db_push_ok}" != "true" ]]; then
      echo "[railway_start] WARNING: prisma db push could not reach the database after ${max_attempts} attempts." >&2
      echo "[railway_start] WARNING: The app will still start, but DB-backed routes may fail until DATABASE_URL is reachable." >&2
      echo "[railway_start] HINT: In Railway, set DATABASE_URL using a variable reference from the Postgres service (or use the public connection string from the Postgres 'Connect' panel)." >&2
    fi
  fi
fi

# Optional seed (should be idempotent).
if [[ -f "prisma/seed.mjs" ]]; then
  echo "[railway_start] Running seed (idempotent)..."
  node prisma/seed.mjs || echo "[railway_start] Seed finished with non-zero exit; continuing."
fi

echo "[railway_start] Starting Next.js standalone server..."
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-8080}"

# Minimal production env sanity checks (fail fast on the most dangerous misconfigurations)
if [[ "${NODE_ENV:-}" == "production" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[railway_start] ERROR: DATABASE_URL is required in production." >&2
    exit 1
  fi
  if [[ -z "${OTP_SECRET:-}" || "${OTP_SECRET:-}" == "dev-otp-secret" ]]; then
    echo "[railway_start] ERROR: OTP_SECRET is required in production (set a long random value)." >&2
    exit 1
  fi
  if [[ -z "${ADMIN_SESSION_SECRET:-}" ]]; then
    echo "[railway_start] WARNING: ADMIN_SESSION_SECRET is not set. OTP_SECRET will be reused for admin session signing." >&2
  fi
  if [[ "${ALLOW_ADMIN_KEY_FALLBACK:-0}" == "1" ]]; then
    echo "[railway_start] WARNING: Legacy ADMIN_KEY fallback is ENABLED. Turn it off after emergency access." >&2
  fi
  if [[ -z "${BREVO_API_KEY:-}" && ( -z "${SMTP_HOST:-}" || -z "${SMTP_USER:-}" || -z "${SMTP_PASS:-}" ) ]]; then
    echo "[railway_start] WARNING: No Brevo/SMTP configured. Admin email OTP will fail unless ALLOW_CONSOLE_EMAIL_FALLBACK=1 is set." >&2
  fi
fi

exec node .next/standalone/server.js
