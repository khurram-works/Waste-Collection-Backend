import { prisma } from "../../lib/prisma";
import e from "express";
import { RequestStatus } from "../../generated/prisma/enums";

export async function getTasks(req: e.Request, res: e.Response) {
  const userId = req.user?.id;
  try {
    const tasks = await prisma.pickupRequest.findMany({
      where: {
        workerId: userId,
        status: RequestStatus.ASSIGNED,
      },
      select: {
        requestId: true,
        status: true,
        address: true,
        estimatedWeight: true,
        wasteType: true,
        workerId: true,
        priority: true,
        photoUrl: true,
        notes: true,
        condition: true,
        citizenId: true,
        route: {
          select: {
            name: true,
          },
        },
        latitude: true,
        longitude: true,
      },
    });

    const totalTasks = await prisma.user.findMany({
      where: {
        userId: userId,
      },
      select: {
        _count: {
          select: {
            assignedPickups: {
              where: {
                status: RequestStatus.ASSIGNED,
              },
            },
          },
        },
      },
    });

    const completedTasks = await prisma.user.findMany({
      where: {
        userId: userId,
      },
      select: {
        _count: {
          select: {
            assignedPickups: {
              where: {
                status: RequestStatus.COLLECTED,
              },
            },
          },
        },
      },
    });

    const rates = await prisma.rateConfig.findMany({
      where:{
        isActive: true
      }
    })

    return res
      .status(200)
      .json({
        data: tasks,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        rates: rates
      });
  } catch (err) {
    console.error("Failed to Fetch Tasks", err);
    return res.status(500).json({
      success: false,
      message: " Failed to Fetch Tasks",
      error: "Internal servor error `{err}`",
    });
  }
}

export async function taskhistory(req: e.Request, res: e.Response) {
  const workerId = req.user?.id;

  try {
    const history = await prisma.pickupRequest.findMany({
      where: {
        workerId: workerId,
        status: {
          in: ['COLLECTED', 'VERIFIED', 'PAID'],
        },
      },
      include: {
        citizen: {
          select: {
            name: true,
            totalEarnings: true,
            userId: true,
            zoneId: true,
          },
        },
        worker: {
          select: { name: true, totalEarnings: true, zoneId: true },
        },

      },
    });

    return res.status(200).json({
      history: history
    })
  } catch (err) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: err,
      success: false
    })
  }
}
