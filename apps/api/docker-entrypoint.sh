#!/bin/sh
set -e
npx prisma db push --schema prisma/schema.prisma --skip-generate
if [ "${SEED_ON_BOOT:-false}" = "true" ] && [ -f scripts/seed.ts ]; then
  npx tsx scripts/seed.ts || true
fi
exec node dist/index.js
