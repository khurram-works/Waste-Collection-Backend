import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import Joi from "joi";
import { auditLogger } from "../utils/auditLogger";
import { createNotification } from "../service/notificationService";

const withdrawRequestSchema = Joi.object({
  userId: Joi.number().required(),
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().required(),
  accountNumber: Joi.string().required(),
  accountTitle: Joi.string().required(),
  bankName: Joi.string().allow(null).optional(),
  iban: Joi.string().allow(null,"").optional(),
});

export async function withdrawalRequest(
  req: Request,
  res: Response,
  // next: NextFunction
) {
  const { error, value } = withdrawRequestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { userId, amount, paymentMethod, accountNumber, accountTitle, bankName, iban } = value;

  try {
    const oldValue = await prisma.user.findUnique({
      where: {userId: req.user?.id},
      select:{
        availableBalance:true,
        pendingBalance:true
      }
    })
  
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { userId }, 
        select: { availableBalance: true },
      });
      if (!user || user.availableBalance < amount) {
        throw new Error("Insufficient balance");
      }

      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount,
          paymentMethod,
          accountNumber,
          accountTitle,
          bankName,
          iban: iban || null, 
        },
      });

      await createNotification({
          userId: req.user?.id || 2, 
          type: "WITHDRAWAL_REQUESTED",
          title: "New Withdrawal Request",
          message: `User #${withdrawalRequest.userId} has requested a withdrawal of $${withdrawalRequest.amount}.`,
          metadata: {
            requestId: withdrawalRequest.id,
            amount: withdrawalRequest.amount,
            userId: withdrawalRequest.userId,
            requestedAt: new Date().toISOString(),
          }
      });

      await auditLogger({
        userId:req.user?.id,
        targetType:"WITHDRAWAL",
        action:"CREATE",
        targetId:String(withdrawalRequest.id),
        newValue:{
          withdrawId: withdrawalRequest.id,
          amount: withdrawalRequest.amount
        },
        req
      })

      

      const newValue=await tx.user.update({
        where: { userId },
        data: {
          availableBalance: { decrement: amount },
          pendingBalance: { increment: amount },
        },
      });

      await auditLogger({
        userId:req.user?.id,
        targetType:"USER",
        action:"UPDATE",
        targetId:String(withdrawalRequest.id),
        newValue:{
          availableBalance: newValue.availableBalance,
          pendingBalance: newValue.pendingBalance
        },
        oldValue:{
          availableBalance: oldValue?.availableBalance,
          pendingBalance: oldValue?.pendingBalance
        },
        req
      })

      return withdrawalRequest;
    });



    return res.status(201).json({
      success: true,
      withdrawalRequest: result,
    });
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === "Insufficient balance") {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to submit withdrawal request." });
  }
}