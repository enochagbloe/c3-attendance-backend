BEGIN;

CREATE TYPE "CheckInMode" AS ENUM ('MANUAL', 'QR', 'BOTH');

CREATE TYPE "EventStatus_new" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

ALTER TABLE "Event" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Event"
ALTER COLUMN "status" TYPE "EventStatus_new"
USING (
  CASE
    WHEN "status"::text = 'PLANNED' THEN 'SCHEDULED'
    WHEN "status"::text = 'ACTIVE' THEN 'ACTIVE'
    WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'
    WHEN "status"::text = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'DRAFT'
  END
)::"EventStatus_new";

ALTER TYPE "EventStatus" RENAME TO "EventStatus_old";
ALTER TYPE "EventStatus_new" RENAME TO "EventStatus";
DROP TYPE "EventStatus_old";

ALTER TABLE "Event" RENAME COLUMN "startDate" TO "date";

ALTER TABLE "Event"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN "startTime" TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN "endTime" TEXT NOT NULL DEFAULT '10:00',
ADD COLUMN "venue" TEXT NOT NULL DEFAULT 'Main Auditorium',
ADD COLUMN "attendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "checkInMode" "CheckInMode" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "organizerDepartmentId" TEXT,
ADD COLUMN "organizerName" TEXT,
ADD COLUMN "audience" TEXT,
ADD COLUMN "qrCheckInEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "colorTag" TEXT,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3);

UPDATE "Event"
SET "cancelledAt" = CURRENT_TIMESTAMP
WHERE "status" = 'CANCELLED' AND "cancelledAt" IS NULL;

ALTER TABLE "Event"
DROP COLUMN "endDate";

ALTER TABLE "Attendance"
ADD COLUMN "eventId" TEXT;

ALTER TABLE "Event"
ADD CONSTRAINT "Event_organizerDepartmentId_fkey"
FOREIGN KEY ("organizerDepartmentId") REFERENCES "Department"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Event_date_idx" ON "Event"("date");
CREATE INDEX "Event_status_date_idx" ON "Event"("status", "date");
CREATE INDEX "Event_type_date_idx" ON "Event"("type", "date");
CREATE INDEX "Event_attendanceEnabled_date_idx" ON "Event"("attendanceEnabled", "date");
CREATE INDEX "Attendance_eventId_checkInAt_idx" ON "Attendance"("eventId", "checkInAt");

COMMIT;
