/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `audit_logs` table. All the data in the column will be lost.
  - Changed the type of `action` on the `audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `targetType` on the `audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ASSIGN', 'APPROVE', 'REJECT', 'STATUS_CHANGE', 'PAYMENT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('USER', 'ADDRESS', 'ZONE', 'ROUTE', 'PICKUP_REQUEST', 'TRANSACTION', 'WITHDRAWAL', 'RATE_CONFIG');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "deletedAt",
DROP COLUMN "details",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "newValue" JSONB,
ADD COLUMN     "oldValue" JSONB,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "status" "AuditStatus" NOT NULL DEFAULT 'SUCCESS',
ADD COLUMN     "userAgent" TEXT,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "userRole" DROP NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" "AuditAction" NOT NULL,
DROP COLUMN "targetType",
ADD COLUMN     "targetType" "AuditTargetType" NOT NULL,
ALTER COLUMN "targetId" SET DATA TYPE TEXT,
ALTER COLUMN "ipAddress" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_idx" ON "audit_logs"("targetType");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
