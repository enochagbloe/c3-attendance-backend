BEGIN;

CREATE TYPE "AttendeeType" AS ENUM ('MEMBER', 'VISITOR', 'NEW_ATTENDEE');
CREATE TYPE "RegistrationSource" AS ENUM ('PRE_EVENT_FORM', 'CHECKIN_AUTO', 'ADMIN_MANUAL');
CREATE TYPE "EventRegistrationStatus" AS ENUM ('REGISTERED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "CheckInMethod" AS ENUM ('DESK', 'QR', 'MANUAL');
CREATE TYPE "CheckInSource" AS ENUM ('SELF', 'STAFF', 'TABLET');

CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "email" TEXT,
    "attendeeType" "AttendeeType" NOT NULL,
    "registrationSource" "RegistrationSource" NOT NULL,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventCheckIn" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrationId" TEXT,
    "memberId" TEXT,
    "fullNameSnapshot" TEXT NOT NULL,
    "phoneNumberSnapshot" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "attendeeType" "AttendeeType" NOT NULL,
    "checkInMethod" "CheckInMethod" NOT NULL,
    "checkInSource" "CheckInSource" NOT NULL DEFAULT 'TABLET',
    "accompanyingCount" INTEGER NOT NULL DEFAULT 0,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventRegistration_eventId_phoneKey_key" ON "EventRegistration"("eventId", "phoneKey");
CREATE UNIQUE INDEX "EventRegistration_eventId_memberId_key" ON "EventRegistration"("eventId", "memberId");
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");
CREATE INDEX "EventRegistration_eventId_attendeeType_idx" ON "EventRegistration"("eventId", "attendeeType");
CREATE INDEX "EventRegistration_memberId_idx" ON "EventRegistration"("memberId");
CREATE INDEX "EventRegistration_phoneKey_idx" ON "EventRegistration"("phoneKey");

CREATE UNIQUE INDEX "EventCheckIn_registrationId_key" ON "EventCheckIn"("registrationId");
CREATE UNIQUE INDEX "EventCheckIn_eventId_phoneKey_key" ON "EventCheckIn"("eventId", "phoneKey");
CREATE UNIQUE INDEX "EventCheckIn_eventId_memberId_key" ON "EventCheckIn"("eventId", "memberId");
CREATE INDEX "EventCheckIn_eventId_checkedInAt_idx" ON "EventCheckIn"("eventId", "checkedInAt");
CREATE INDEX "EventCheckIn_eventId_attendeeType_idx" ON "EventCheckIn"("eventId", "attendeeType");
CREATE INDEX "EventCheckIn_eventId_checkInMethod_idx" ON "EventCheckIn"("eventId", "checkInMethod");
CREATE INDEX "EventCheckIn_memberId_idx" ON "EventCheckIn"("memberId");
CREATE INDEX "EventCheckIn_phoneKey_idx" ON "EventCheckIn"("phoneKey");

ALTER TABLE "EventRegistration"
ADD CONSTRAINT "EventRegistration_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "EventRegistration"
ADD CONSTRAINT "EventRegistration_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "Member"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "EventCheckIn"
ADD CONSTRAINT "EventCheckIn_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "EventCheckIn"
ADD CONSTRAINT "EventCheckIn_registrationId_fkey"
FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "EventCheckIn"
ADD CONSTRAINT "EventCheckIn_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "Member"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "EventCheckIn"
ADD CONSTRAINT "EventCheckIn_checkedInByUserId_fkey"
FOREIGN KEY ("checkedInByUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

COMMIT;
