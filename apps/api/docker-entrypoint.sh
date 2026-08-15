#!/bin/sh
set -e
echo "Applying Prisma migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding database..."
  npx tsx scripts/seed.ts || echo "Seed skipped/failed"
fi
exec node apps/api/dist/index.js
