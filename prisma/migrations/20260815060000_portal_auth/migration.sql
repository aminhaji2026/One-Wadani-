-- AlterTable
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Supporter" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Supporter" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Supporter" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Volunteer" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "Volunteer" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Volunteer" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Unique emails for portal login (PostgreSQL allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "Member_email_key" ON "Member"("email");
DROP INDEX IF EXISTS "Supporter_email_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Supporter_email_key" ON "Supporter"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Volunteer_email_key" ON "Volunteer"("email");
