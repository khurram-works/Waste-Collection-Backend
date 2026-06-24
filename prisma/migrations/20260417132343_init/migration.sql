-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'WORKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WasteType" AS ENUM ('PET', 'CARDBOARD', 'PAPER', 'METAL', 'NON_RECYCLABLE');

-- CreateEnum
CREATE TYPE "WasteCondition" AS ENUM ('PROPER', 'MIXED', 'CONTAMINATED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ASSIGNED', 'COLLECTED', 'VERIFIED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteType" AS ENUM ('recycling', 'landfill');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CASH', 'BANK', 'WALLET');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionSourceType" AS ENUM ('PICKUP', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayoutMethodType" AS ENUM ('BANK', 'EASYPAISA', 'JAZZCASH');

-- CreateTable
CREATE TABLE "users" (
    "userId" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "address" TEXT,
    "zoneId" INTEGER,
    "vehicle" VARCHAR(50),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "addresses" (
    "addressId" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("addressId")
);

-- CreateTable
CREATE TABLE "zones" (
    "zoneId" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "city" VARCHAR(20),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("zoneId")
);

-- CreateTable
CREATE TABLE "routes" (
    "routeId" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "RouteType" NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "schedule" TEXT,
    "capacityPerDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("routeId")
);

-- CreateTable
CREATE TABLE "pickup_requests" (
    "requestId" SERIAL NOT NULL,
    "citizenId" INTEGER NOT NULL,
    "workerId" INTEGER,
    "routeId" INTEGER,
    "wasteType" "WasteType" NOT NULL,
    "estimatedWeight" DECIMAL(8,3) NOT NULL,
    "actualWeight" DECIMAL(8,3),
    "condition" "WasteCondition",
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedDate" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "collectionDate" TIMESTAMP(3),
    "priority" "PriorityLevel" NOT NULL DEFAULT 'MEDIUM',
    "address" TEXT NOT NULL,
    "notes" TEXT,
    "photoUrl" TEXT,
    "rateApplied" DECIMAL(10,2),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("requestId")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transactionId" SERIAL NOT NULL,
    "citizenId" INTEGER NOT NULL,
    "requestId" INTEGER,
    "withdrawalId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "LedgerType" NOT NULL,
    "transactionStatus" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "sourceType" "TransactionSourceType" NOT NULL,
    "description" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transactionId")
);

-- CreateTable
CREATE TABLE "rate_configs" (
    "rateId" SERIAL NOT NULL,
    "wasteType" "WasteType" NOT NULL,
    "condition" "WasteCondition" NOT NULL,
    "ratePerKg" DECIMAL(8,3) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_configs_pkey" PRIMARY KEY ("rateId")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "auditId" BIGSERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "userRole" "Role" NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "targetType" VARCHAR(20) NOT NULL,
    "targetId" VARCHAR(20),
    "details" VARCHAR(100),
    "ipAddress" VARCHAR(50),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("auditId")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PayoutMethodType" NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountTitle" TEXT NOT NULL,
    "paymentReference" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "addresses_userId_idx" ON "addresses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "addresses_userId_address_key" ON "addresses"("userId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_key" ON "zones"("name");

-- CreateIndex
CREATE INDEX "pickup_requests_citizenId_idx" ON "pickup_requests"("citizenId");

-- CreateIndex
CREATE INDEX "pickup_requests_workerId_idx" ON "pickup_requests"("workerId");

-- CreateIndex
CREATE INDEX "pickup_requests_routeId_idx" ON "pickup_requests"("routeId");

-- CreateIndex
CREATE INDEX "pickup_requests_status_idx" ON "pickup_requests"("status");

-- CreateIndex
CREATE INDEX "pickup_requests_requestDate_idx" ON "pickup_requests"("requestDate");

-- CreateIndex
CREATE INDEX "pickup_requests_assignedDate_idx" ON "pickup_requests"("assignedDate");

-- CreateIndex
CREATE INDEX "pickup_requests_scheduledDate_idx" ON "pickup_requests"("scheduledDate");

-- CreateIndex
CREATE INDEX "pickup_requests_priority_idx" ON "pickup_requests"("priority");

-- CreateIndex
CREATE INDEX "Transaction_citizenId_idx" ON "Transaction"("citizenId");

-- CreateIndex
CREATE INDEX "Transaction_transactionStatus_idx" ON "Transaction"("transactionStatus");

-- CreateIndex
CREATE INDEX "rate_configs_isActive_idx" ON "rate_configs"("isActive");

-- CreateIndex
CREATE INDEX "rate_configs_createdBy_idx" ON "rate_configs"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "rate_configs_wasteType_condition_effectiveFrom_key" ON "rate_configs"("wasteType", "condition", "effectiveFrom");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_idx" ON "audit_logs"("targetType");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("zoneId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("zoneId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("routeId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "pickup_requests"("requestId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_configs" ADD CONSTRAINT "rate_configs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
