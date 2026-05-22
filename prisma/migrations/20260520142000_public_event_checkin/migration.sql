ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "publicCheckInToken" TEXT,
ADD COLUMN IF NOT EXISTS "publicCheckInEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Event_publicCheckInToken_key" ON "Event"("publicCheckInToken");
