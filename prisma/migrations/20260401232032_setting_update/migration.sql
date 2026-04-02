/*
  Warnings:

  - The values [MEMBER,WORKER,LEADER] on the enum `MemberStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `status` on the `Member` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MemberStatus_new" AS ENUM ('VISITOR', 'NEW_MEMBER', 'CHURCH_MEMBER');
ALTER TABLE "Member" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Member"
ALTER COLUMN "status" TYPE "MemberStatus_new"
USING (
  CASE
    WHEN "status"::text = 'VISITOR' THEN 'VISITOR'
    WHEN "status"::text = 'MEMBER' THEN 'CHURCH_MEMBER'
    WHEN "status"::text = 'WORKER' THEN 'CHURCH_MEMBER'
    WHEN "status"::text = 'LEADER' THEN 'CHURCH_MEMBER'
    ELSE 'VISITOR'
  END
)::"MemberStatus_new";
ALTER TYPE "MemberStatus" RENAME TO "MemberStatus_old";
ALTER TYPE "MemberStatus_new" RENAME TO "MemberStatus";
DROP TYPE "MemberStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Member" RENAME COLUMN "status" TO "primaryMembershipStatus";

-- AlterTable
ALTER TABLE "Member"
ADD COLUMN     "area" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "familyMemberName" TEXT,
ADD COLUMN     "familyMemberPhone" TEXT,
ADD COLUMN     "familyRelationship" TEXT,
ADD COLUMN     "gender" TEXT,
    ADD COLUMN     "hasFamilyMemberAtChurch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landmarkOrAddressLine" TEXT,
ADD COLUMN     "maritalStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "workplaceName" TEXT;

-- CreateTable
CREATE TABLE "VolunteerRecord" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "volunteerRoleId" TEXT NOT NULL,
    "departmentId" TEXT,
    "ministryName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadershipRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadershipRecord" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "leadershipRoleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadershipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fellowship" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Fellowship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberFellowship" (
    "memberId" TEXT NOT NULL,
    "fellowshipId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberFellowship_pkey" PRIMARY KEY ("memberId","fellowshipId")
);

-- CreateTable
CREATE TABLE "MembershipStatusHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "MemberStatus" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VolunteerRecord_memberId_idx" ON "VolunteerRecord"("memberId");

-- CreateIndex
CREATE INDEX "VolunteerRecord_volunteerRoleId_idx" ON "VolunteerRecord"("volunteerRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadershipRole_name_key" ON "LeadershipRole"("name");

-- CreateIndex
CREATE INDEX "LeadershipRecord_memberId_idx" ON "LeadershipRecord"("memberId");

-- CreateIndex
CREATE INDEX "LeadershipRecord_leadershipRoleId_idx" ON "LeadershipRecord"("leadershipRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerRole_name_key" ON "VolunteerRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Fellowship_name_key" ON "Fellowship"("name");

-- CreateIndex
CREATE INDEX "MemberFellowship_fellowshipId_idx" ON "MemberFellowship"("fellowshipId");

-- CreateIndex
CREATE INDEX "MembershipStatusHistory_memberId_status_idx" ON "MembershipStatusHistory"("memberId", "status");

-- AddForeignKey
ALTER TABLE "VolunteerRecord" ADD CONSTRAINT "VolunteerRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerRecord" ADD CONSTRAINT "VolunteerRecord_volunteerRoleId_fkey" FOREIGN KEY ("volunteerRoleId") REFERENCES "VolunteerRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolunteerRecord" ADD CONSTRAINT "VolunteerRecord_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipRecord" ADD CONSTRAINT "LeadershipRecord_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadershipRecord" ADD CONSTRAINT "LeadershipRecord_leadershipRoleId_fkey" FOREIGN KEY ("leadershipRoleId") REFERENCES "LeadershipRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFellowship" ADD CONSTRAINT "MemberFellowship_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFellowship" ADD CONSTRAINT "MemberFellowship_fellowshipId_fkey" FOREIGN KEY ("fellowshipId") REFERENCES "Fellowship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipStatusHistory" ADD CONSTRAINT "MembershipStatusHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
