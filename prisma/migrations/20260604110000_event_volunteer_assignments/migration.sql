CREATE TYPE "EventVolunteerAssignmentStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'COMPLETED',
  'MISSED',
  'CANCELLED'
);

CREATE TABLE "EventVolunteerAssignment" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "volunteerRoleId" TEXT,
  "departmentId" TEXT,
  "assignmentTitle" TEXT,
  "assignmentKey" TEXT NOT NULL,
  "status" "EventVolunteerAssignmentStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "assignedByUserId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventVolunteerAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventVolunteerAssignment_eventId_memberId_assignmentKey_key"
  ON "EventVolunteerAssignment"("eventId", "memberId", "assignmentKey");

CREATE INDEX "EventVolunteerAssignment_eventId_status_idx"
  ON "EventVolunteerAssignment"("eventId", "status");

CREATE INDEX "EventVolunteerAssignment_eventId_volunteerRoleId_idx"
  ON "EventVolunteerAssignment"("eventId", "volunteerRoleId");

CREATE INDEX "EventVolunteerAssignment_eventId_departmentId_idx"
  ON "EventVolunteerAssignment"("eventId", "departmentId");

CREATE INDEX "EventVolunteerAssignment_memberId_status_idx"
  ON "EventVolunteerAssignment"("memberId", "status");

ALTER TABLE "EventVolunteerAssignment"
  ADD CONSTRAINT "EventVolunteerAssignment_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventVolunteerAssignment"
  ADD CONSTRAINT "EventVolunteerAssignment_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EventVolunteerAssignment"
  ADD CONSTRAINT "EventVolunteerAssignment_volunteerRoleId_fkey"
  FOREIGN KEY ("volunteerRoleId") REFERENCES "VolunteerRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventVolunteerAssignment"
  ADD CONSTRAINT "EventVolunteerAssignment_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventVolunteerAssignment"
  ADD CONSTRAINT "EventVolunteerAssignment_assignedByUserId_fkey"
  FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
