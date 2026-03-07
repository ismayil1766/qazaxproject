#!/usr/bin/env bash
set -euo pipefail

# Railway/Nixpacks build hook.
# IMPORTANT: Railway's build container often cannot reach the attached DB service.
# So we ONLY generate the Prisma client here (no db push/migrate).
# DB schema sync is handled in scripts/railway_start.sh at runtime with retries.

echo "[railway_build] Generating Prisma client (no DB access during build)..."
npx prisma generate

# Next.js standalone output does NOT automatically include static assets.
# Copy them so requests like /logo.jpeg and /_next/static/* work in production.
if [[ -d ".next/standalone" ]]; then
  echo "[railway_build] Preparing Next.js standalone static assets..."
  mkdir -p .next/standalone/.next

  if [[ -d ".next/static" ]]; then
    rm -rf .next/standalone/.next/static
    cp -r .next/static .next/standalone/.next/static
  fi

  if [[ -d "public" ]]; then
    rm -rf .next/standalone/public
    cp -r public .next/standalone/public
  fi
fi
