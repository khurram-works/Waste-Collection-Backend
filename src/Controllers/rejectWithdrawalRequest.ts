import e from "express";
import { prisma } from "../../lib/prisma";
import { auditLogger } from "../utils/auditLogger";
import { createNotification } from "../service/notificationService";

export async function rejectWithdrawalRequest(
  req: e.Request,
  res: e.Response
) {
  const id = Number(req.params.id);

  try {
    // 1. Get withdrawal request
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id }
    });

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    // Prevent double handling
    if (withdrawal.status === "PAID") {
      return res.status(400).json({ message: "Already paid, cannot reject" });
    }

    if (withdrawal.status === "REJECTED") {
      return res.status(400).json({ message: "Already rejected" });
    }

    const userId = withdrawal.userId;
    const amount = withdrawal.amount;

    // 2. DB transaction (VERY IMPORTANT)
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id },
        data: { status: "REJECTED" }
      });

      await tx.user.update({
        where: { userId: withdrawal.userId },
        data: {
          availableBalance: { increment: withdrawal.amount },
          pendingBalance: { decrement: withdrawal.amount }
        }
      });

      return updatedRequest; // Now 'result' holds the data outside the block
    });

    await createNotification({
        userId: withdrawal.userId,
        type: "WITHDRAWAL_REJECTED",
        title: "Withdrawal Declined",
        message: `Your withdrawal request for $${withdrawal.amount} was declined. The funds have been returned to your balance.`,
        metadata: {
          requestId: withdrawal.id,
          rejectedAt: new Date().toISOString(),
          amount: withdrawal.amount
        }
    });

    await auditLogger({
      userId: req.user?.id,
      targetType: "WITHDRAWAL",
      userRole: "ADMIN",
      targetId: String(id), // The ID of the withdrawal
      action: "REJECT",
      req,
    });

    return res.json({ success: true, message: "Withdrawal rejected and balance restored" });

  } catch (error) {
    await auditLogger({
      userId: req.user?.id,
      targetType: "WITHDRAWAL",
      userRole: "ADMIN",
      targetId: String(id),
      action:"REJECT",
      req,
      status: "FAILED"
    }).catch(()=>{})
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}