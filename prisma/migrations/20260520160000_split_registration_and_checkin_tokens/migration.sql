ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "registrationToken" TEXT,
ADD COLUMN IF NOT EXISTS "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "registrationOpenAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "registrationCloseAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "checkInToken" TEXT,
ADD COLUMN IF NOT EXISTS "checkInOpenAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "checkInCloseAt" TIMESTAMP(3);

UPDATE "Event"
SET "checkInToken" = "publicCheckInToken"
WHERE "publicCheckInToken" IS NOT NULL
  AND "checkInToken" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Event_registrationToken_key" ON "Event"("registrationToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Event_checkInToken_key" ON "Event"("checkInToken");

DROP INDEX IF EXISTS "Event_publicCheckInToken_key";

ALTER TABLE "Event"
DROP COLUMN IF EXISTS "publicCheckInToken";
