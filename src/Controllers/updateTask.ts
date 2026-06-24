import e from "express";
import { prisma } from "../../lib/prisma";
import { LedgerType, RequestStatus, TransactionSourceType, TransactionStatus } from "../../generated/prisma/enums";
import { AuditAction, AuditTargetType } from "../../generated/prisma/enums";
import { auditLogger } from "../utils/auditLogger"; // adjust path as needed
// import { pollingManager } from "../utils/pollingManager";
import { createNotification } from "../service/notificationService";

export async function updateTask(req: e.Request, res: e.Response) {
  const requestId = Number(req.params.requestId);
  const { values } = req.body;

  // Extract worker role from auth middleware (adjust based on your auth setup)
  const actorId = req.user?.id;
  // const actorRole = req.user?.role;

  if (isNaN(requestId)) {
    return res.status(400).json({ success: false, message: "Invalid requestId" });
  }

  try {
    // ─── Fetch old values BEFORE mutations ───────────────────────────────
    const oldPickupRequest = await prisma.pickupRequest.findUnique({
      where: { requestId },
    });

    const oldCitizen = await prisma.user.findUnique({
      where: { userId: values.citizenId },
      select: { totalEarnings: true, availableBalance: true },
    });

    const oldWorker = await prisma.user.findUnique({
      where: { userId: values.workerId },
      select: { totalEarnings: true },
    });

    // ─── 1. Update Pickup Request ─────────────────────────────────────────
    const updatedTask = await prisma.pickupRequest.update({
      where: { requestId },
      data: {
        condition: values.condition,
        actualWeight: values.weight,
        rateApplied: values.appliedRate,
        status: RequestStatus.VERIFIED,
        collectionDate: new Date(),
      },
    });

    await createNotification({
        userId: Number(updatedTask.citizenId),
        type: "PICKUP_VERIFIED",
        title: "Pickup Verified",
        message: `Your pickup request #${requestId} has been successfully verified.` ,
        metadata: {
          requestId: requestId,
          verifiedAt: new Date().toISOString(),
        }
    })

    await auditLogger({
      userId: actorId,
      userRole: "WORKER",
      action: AuditAction.STATUS_CHANGE,           // VERIFIED is a status change
      targetType: AuditTargetType.PICKUP_REQUEST,
      targetId: String(requestId),
      oldValue: {
        status: oldPickupRequest?.status,
        condition: oldPickupRequest?.condition,
        actualWeight: oldPickupRequest?.actualWeight,
        rateApplied: oldPickupRequest?.rateApplied,
      },
      newValue: {
        status: RequestStatus.VERIFIED,
        condition: values.condition,
        actualWeight: values.weight,
        rateApplied: values.appliedRate,
      },
      req,
    });

    // ─── 2. Create Transaction ────────────────────────────────────────────
    const transaction = await prisma.transaction.create({
      data: {
        citizenId: values.citizenId,
        requestId: values.requestId,
        amount: values.totalEarnings,
        type: LedgerType.CREDIT,
        sourceType: TransactionSourceType.PICKUP,
        transactionStatus: TransactionStatus.SUCCESS,
        description: "Waste Pickup Earning",
      },
    });

    await createNotification({
        userId: Number(transaction.citizenId),
        type: "PAYMENT_CREDITED",
        title: "Payment Received",
        message: `You've earned a credit for your pickup request #${transaction.requestId}.`,
        metadata: {
          amount: Number(transaction.amount),
          transactionId: transaction.transactionId,
          processedAt: new Date().toISOString(), // Good for debugging
        },
    });

    await auditLogger({
      userId: actorId,
      userRole: "WORKER",
      action: "PAYMENT",
      targetType: AuditTargetType.TRANSACTION,
      targetId: String(transaction.transactionId),  // adjust field name as needed
      newValue: {
        citizenId: values.citizenId,
        requestId: values.requestId,
        amount: values.totalEarnings,
        type: LedgerType.CREDIT,
        sourceType: TransactionSourceType.PICKUP,
        status: TransactionStatus.SUCCESS,
      },
      req,
    });

    // ─── 3. Update Citizen Balance ────────────────────────────────────────
    const citizen = await prisma.user.update({
      where: { userId: values.citizenId },
      data: {
        totalEarnings: { increment: values.totalEarnings },
        availableBalance: { increment: values.totalEarnings },
      },
    });

    await auditLogger({
      userId: actorId,
      userRole: "WORKER",
      action: AuditAction.UPDATE,
      targetType: AuditTargetType.USER,
      targetId: String(values.citizenId),
      oldValue: {
        totalEarnings: oldCitizen?.totalEarnings,
        availableBalance: oldCitizen?.availableBalance,
      },
      newValue: {
        totalEarnings: citizen.totalEarnings,
        availableBalance: citizen.availableBalance,
      },
      req,
    });

    // ─── 4. Update Worker Earnings ────────────────────────────────────────
    const worker = await prisma.user.update({
      where: { userId: values.workerId },
      data: {
        totalEarnings: { increment: values.totalEarnings },
      },
    });

    await auditLogger({
      userId: actorId,
      userRole: "WORKER",
      action: AuditAction.UPDATE,
      targetType: AuditTargetType.USER,
      targetId: String(values.workerId),
      oldValue: {
        totalEarnings: oldWorker?.totalEarnings,
      },
      newValue: {
        totalEarnings: worker.totalEarnings,
      },
      req,
    });

    return res.status(200).json({ success: true, message: "Task updated successfully", data: updatedTask });

  } catch (error: any) {
    // ─── Log failure audit ────────────────────────────────────────────────
    await auditLogger({
      userId: actorId,
      userRole: "WORKER",
      action: AuditAction.UPDATE,
      targetType: AuditTargetType.PICKUP_REQUEST,
      targetId: String(requestId),
      newValue: { attemptedValues: values },
      status: "FAILED",
      req,
    }).catch(() => {}); // silently fail — don't let audit break error response

    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
}