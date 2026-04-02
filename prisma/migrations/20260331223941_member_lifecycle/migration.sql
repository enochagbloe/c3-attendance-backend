-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "baptizedHere" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "joinedAt" TIMESTAMP(3);
