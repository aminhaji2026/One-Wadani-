#!/bin/sh
set -e
echo "Applying Prisma schema..."
npx prisma db push --schema prisma/schema.prisma --skip-generate
if [ "${SEED_ON_BOOT}" = "true" ]; then
  echo "Running seed..."
  npx tsx scripts/seed.ts || node --import tsx scripts/seed.ts || true
fi
echo "Starting API..."
exec node dist/index.js
