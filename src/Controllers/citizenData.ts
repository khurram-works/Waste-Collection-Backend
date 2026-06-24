import { string } from "joi";
import { citizenDashboard } from "../models/citizenData";
import e from "express";
const dashboardData = new citizenDashboard()

export async function citizenDashboardData(req:e.Request, res:e.Response){
  try{
  const userId = req.user?.id as number
  const totalEarnings = await dashboardData.totalEarnings(userId);
  const pendingPickups = await dashboardData.pendingPickups(userId);
  const completedThisMonth = await dashboardData.completedThisMonth(userId);
  const recentPickupRequests = await dashboardData.recentPickupRequests(userId);
  // console.log(recentPickupRequests);
  return res.status(200).json({
    message: "Citizen Data",
    citizenData: {
      totalEarnings: totalEarnings,
      pendingPickups: pendingPickups,
      completedThisMonth: completedThisMonth,
      recentPickupRequests: recentPickupRequests
    }
  });
}catch(err){
  console.error("Failed to fetch Citizen Data", err);
  return res.status(500).json({ error: "Internal server error" });
}
  

}