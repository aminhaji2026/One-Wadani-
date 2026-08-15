#!/bin/sh
set -e
echo "Waiting for database and applying migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma
exec node dist/index.js
