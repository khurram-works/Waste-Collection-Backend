-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PICKUP_SUBMITTED', 'PICKUP_ASSIGNED', 'PICKUP_SCHEDULED', 'PICKUP_COLLECTED', 'PICKUP_VERIFIED', 'PICKUP_CANCELLED', 'PAYMENT_CREDITED', 'WITHDRAWAL_REQUESTED', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_PAID', 'WITHDRAWAL_REJECTED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
