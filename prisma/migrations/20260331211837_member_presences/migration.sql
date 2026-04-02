/*
  Warnings:

  - You are about to drop the column `departmentId` on the `Member` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Member" DROP CONSTRAINT "Member_departmentId_fkey";

-- AlterTable
ALTER TABLE "Member" DROP COLUMN "departmentId",
ADD COLUMN     "attendanceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inChurch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
