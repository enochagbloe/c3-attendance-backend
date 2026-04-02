-- CreateTable
CREATE TABLE "MemberUpdateToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberUpdateToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberInviteToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberUpdateToken_token_key" ON "MemberUpdateToken"("token");

-- CreateIndex
CREATE INDEX "MemberUpdateToken_memberId_idx" ON "MemberUpdateToken"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberInviteToken_token_key" ON "MemberInviteToken"("token");

-- AddForeignKey
ALTER TABLE "MemberUpdateToken" ADD CONSTRAINT "MemberUpdateToken_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
