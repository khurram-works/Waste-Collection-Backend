import { prisma } from "../../lib/prisma";
import e from "express";

export async function dashboardData(req: e.Request, res: e.Response) {
  try {
    const totalUsers = await prisma.user.count({
      where: { role: "CITIZEN" },
    });

    const activeWorkers = await prisma.user.count({
      where: {
        role: "WORKER",
        status: "ACTIVE",
      },
    });

    const pendingPickups = await prisma.pickupRequest.count({
      where: {
        status: "PENDING",
      },
    });

    const assignedPickups = await prisma.pickupRequest.count({
      where: {
        status: "ASSIGNED",
      },
    });

    const pendingWithdrawalAmount = await prisma.withdrawalRequest.aggregate({
      where: {
        status: "PENDING",
      },
      _sum: {
        amount: true,
      },
    });

    const pendingWithdrawals = await prisma.withdrawalRequest.count({
      where: {
        status: "PENDING",
      },
    });

    const completedTasks = await prisma.pickupRequest.count({
      where: {
        status: "VERIFIED",
      },
    });

    const paid = await prisma.pickupRequest.count({
      where: {
        status: "VERIFIED",
      },
    });

    const workersWithTaskAssigned = await prisma.user.count({
      where: {
        role: "WORKER",
        status: "ACTIVE",
        assignedPickups: {
          some: {
            status: "ASSIGNED", // or remove this if you want ANY task
          },
        },
      },
    });

    const inactiveWorkers = await prisma.user.count({
      where: {
        role: "WORKER",
        status: "INACTIVE",
      },
    });

    const available = await prisma.user.count({
      where: {
        role: "WORKER",
        status: "ACTIVE",
        assignedPickups: {
          none: {
            status: {
              in: ["ASSIGNED", "COLLECTED"],
            },
          },
        },
      },
    });

    const totalWaste = await prisma.pickupRequest.aggregate({
      where: {
        status: "VERIFIED",
      },
      _sum: {
        actualWeight: true,
      },
    });

    const recyclableWaste = await prisma.pickupRequest.aggregate({
      where: {
        status: "VERIFIED",
        wasteType: {
          in: ["CARDBOARD", "METAL", "PAPER", "PET"],
        },
      },
      _sum: {
        actualWeight: true,
      },
    });

    const NON_RECYCLABLE = await prisma.pickupRequest.aggregate({
      where: {
        status: "VERIFIED",
        wasteType: "NON_RECYCLABLE",
      },
      _sum: {
        actualWeight: true,
      },
    });

    const recyclableWastePercentage =
      (Number(recyclableWaste._sum.actualWeight) /
        Number(totalWaste._sum.actualWeight)) *
      100;

    const non_recyclableWastePercentage =
      (Number(NON_RECYCLABLE._sum.actualWeight) /
        Number(totalWaste._sum.actualWeight)) *
      100;

    const recentPickupRequests = await prisma.pickupRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    });

    const revenueData = await prisma.transaction.findMany({
      where: {
        type: "CREDIT",
        transactionStatus: "SUCCESS",
        sourceType: "PICKUP",
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });
    const revenueByMonth: Record<string, number> = {};

    revenueData.forEach((tx) => {
      const date = new Date(tx.createdAt);

      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!revenueByMonth[key]) {
        revenueByMonth[key] = 0;
      }

      revenueByMonth[key] += Number(tx.amount);
    });

    // console.log(revenueByMonth);

    const payoutData = await prisma.withdrawalRequest.findMany({
      where: {
        status: "PAID",
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    const payoutByMonth: Record<string, number> = {};

    payoutData.forEach((p) => {
      const date = new Date(p.createdAt);

      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

      if (!payoutByMonth[key]) {
        payoutByMonth[key] = 0;
      }

      payoutByMonth[key] += Number(p.amount);
    });

    // console.log(payoutData);

    const responseData = {
      totalUsers: totalUsers,
      activeWorkers: activeWorkers,
      pendingPickups: pendingPickups,
      assignedPickups: assignedPickups,
      pendingWithdrawalAmount: pendingWithdrawalAmount._sum.amount,
      pendingWithdrawals: pendingWithdrawals,
      completedTasks: completedTasks,
      paid: paid,
      inactiveWorkers: inactiveWorkers,
      workersWithTaskAssigned: workersWithTaskAssigned,
      available: available,
      totalWaste: totalWaste._sum.actualWeight,
      recyclableWastePercentage: recyclableWastePercentage,
      non_recyclableWastePercentage: non_recyclableWastePercentage,
    };

    // console.log(recentPickupRequests);

    return res.status(200).json({
      responseData,
      recentPickupRequests: recentPickupRequests,
      success: true,
      payoutData: payoutByMonth,
      revenueData: revenueByMonth,
    });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ error: "Failed to fetch admin dashboard data" });
  }
}
