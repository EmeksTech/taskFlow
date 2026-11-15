-- CreateEnum
CREATE TYPE "PersonalAccessTokenScope" AS ENUM ('tasks:read', 'tasks:write', 'profile:read');

-- CreateTable
CREATE TABLE "PersonalAccessToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "tokenPrefix" VARCHAR(24) NOT NULL,
    "scopes" "PersonalAccessTokenScope"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PersonalAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccessToken_tokenHash_key" ON "PersonalAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PersonalAccessToken_userId_revokedAt_idx" ON "PersonalAccessToken"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "PersonalAccessToken_expiresAt_idx" ON "PersonalAccessToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "PersonalAccessToken" ADD CONSTRAINT "PersonalAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
