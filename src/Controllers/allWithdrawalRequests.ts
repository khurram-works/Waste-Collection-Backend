import e from "express";
import { prisma} from "../../lib/prisma"


export async function allWithdrawalRequests(req:e.Request, res:e.Response){
  try{
    const allWithdrawalRequests = await prisma.withdrawalRequest.findMany({include:{user: true}});
    // console.log(allWithdrawalRequests);
    return res.status(200).json({
      success: true,
      allWithdrawalRequests: allWithdrawalRequests
    })
  }catch(err){
    console.error(err);
    throw new Error("Error Fetching WithdrawalRequests")
  }
}