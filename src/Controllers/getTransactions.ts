import e from "express";
import { prisma} from "../../lib/prisma"

export async function getTransactions(req:e.Request, res:e.Response){
  const userId = Number(req.params.userId)

  try{
    const transactions = await prisma.transaction.findMany({
      where: { citizenId: userId },
      include:{
        request: true,
        withdrawal: true,
      },
      orderBy: { createdAt: "desc" }
    })

    const userBalance = await prisma.user.findUnique({
      where:{userId},
      select:{
        totalEarnings: true,
        availableBalance: true,
        pendingBalance: true,
      }
    })

    // console.log(transactions);

    return res.status(200).json({
      message: "Success",
      transaction: transactions,
      userBalance: userBalance
    })
  }catch(err){
    console.error(err)
    throw new Error("Failed fetching transactions.")
  }

}