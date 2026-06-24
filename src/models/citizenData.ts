import { prisma } from "../../lib/prisma";

export class citizenDashboard {
  async totalEarnings(userId: number) {
    try {
      const User = await prisma.user.findUnique({ where: { userId } });
      const totalEarnings = User?.totalEarnings;
      return totalEarnings;
    } catch (err) {
      console.error("Failed to find the User and its total Earnings", err);
      throw err;
    }
  }

  async pendingPickups(userId: number) {
    try {
      // const now = new Date();
      // const utcNow = new Date(now.toISOString());
      // const fortyEightHoursLater = new Date(
      //   utcNow.getTime() + 48 * 60 * 60 * 1000,
      // );
      const pendingPickups = await prisma.pickupRequest.count({
        where: {
          citizenId: userId,
          status: "PENDING",
          // requestDate: {
          //   gte: utcNow,
          //   lte: fortyEightHoursLater,
          // },
        },
      });
      // console.log(pendingPickups);
      return pendingPickups;
    } catch (err) {
      console.error("Failed to find the User and its PendingPickups", err);
      throw err;
    }
  }

  async completedThisMonth(userId: number) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const completedThisMonth = await prisma.pickupRequest.count({
        where: {
          citizenId: userId,
          status: "VERIFIED",
          updatedAt: {
            gte: startOfMonth,
          },
        },
      });
      return completedThisMonth;
    } catch (err) {
      console.error("Failed to find the User and its Completed Pickups", err);
      throw err;
    }
  }

  async recentPickupRequests(userId: number) {
    try {
      const recentRequests = await prisma.pickupRequest.findMany({
        where: {
          citizenId: userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        select: {
          requestId: true,
          wasteType: true,
          requestDate: true,
          status: true,
        },
      });
      return recentRequests;
    } catch (err) {
      console.error("Failed to find recent pickup requests.", err);
      throw err;
    }
  }
}
