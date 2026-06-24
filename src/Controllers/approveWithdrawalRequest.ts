import e from "express";
import { prisma } from "../../lib/prisma";
import { auditLogger } from "../utils/auditLogger";
import { createNotification } from "../service/notificationService";

export async function approveWithdrawalRequest(
  req: e.Request,
  res: e.Response
) {
  const id = Number(req.params.id);

  try {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id }
    });

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    if (withdrawal.status === "PAID") {
      return res.status(400).json({ message: "Already paid" });
    }

    const userId = withdrawal.userId;
    const amount = withdrawal.amount;

    await prisma.$transaction(async (tx) => {

      const oldvalue = await tx.withdrawalRequest.findUnique({
        where:{id}
      })
      
      const newValue=await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: "PAID",
          processedAt: new Date(),
          paymentReference: "Admin paid through Easypaisa"
        }
      });

      await auditLogger({
        userId: req.user?.id,
        action:"STATUS_CHANGE",
        targetType:"WITHDRAWAL",
        targetId: String(id),
        userRole:"ADMIN",
        oldValue:{
          status: oldvalue?.status,
          processedAt: oldvalue?.processedAt,
          paymentReference: oldvalue?.paymentReference
        },
        newValue:{
          status: newValue?.status,
          processedAt: newValue?.processedAt,
          paymentReference: newValue?.paymentReference
        },
        req
      })

      const transactionValue=await tx.transaction.create({
        data: {
          citizenId: userId,
          withdrawalId: id,
          amount: amount,
          type: "DEBIT",
          sourceType: "WITHDRAWAL",
          transactionStatus: "SUCCESS",
          description: "Withdrawal payout"
        }
      });

      await createNotification({
          userId: Number(transactionValue.citizenId),
          type: "WITHDRAWAL_PAID",
          title: "Withdrawal Successful",
          message: `Your withdrawal of Rs${transactionValue.amount} (Request #${transactionValue.withdrawalId}) has been approved and transferred to your account.`,
          metadata: {
            withdrawalId: transactionValue.withdrawalId,
            amount: transactionValue.amount,
            status: "COMPLETED",
            approvedAt: new Date().toISOString(),
          }
      });

      await auditLogger({
        userId: req.user?.id,
        action:"CREATE",
        targetType:"TRANSACTION",
        targetId:String(transactionValue.transactionId),
        newValue: transactionValue,
        userRole:"CITIZEN",
        req
      })

      const oldBalance = await tx.user.findUnique({
        where: {userId},
        select:{pendingBalance:true}
      })

      const newBalance=await tx.user.update({
        where: { userId },
        data: {
          pendingBalance: { decrement: amount }
        }
      });

      await auditLogger({
        userId: req.user?.id,
        action:"UPDATE",
        targetType:"USER",
        userRole:"CITIZEN",
        targetId:String(newBalance.userId),
        req,
        oldValue:{
          pendingBalance: oldBalance?.pendingBalance
        },
        newValue:{
          pendingBalance: newBalance.pendingBalance
        }
      })
    });

    return res.json({ message: "Withdrawal approved and paid successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
}