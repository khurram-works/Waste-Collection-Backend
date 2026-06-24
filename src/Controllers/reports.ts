import {prisma} from "../../lib/prisma";
import e from "express";
import { getPickupStats } from "../service/getweeklyReport";

export async function reports(req:e.Request, res:e.Response){
  try{
    const totalRequests = await prisma.pickupRequest.count()

    const recyclableWaste = await prisma.pickupRequest.aggregate({
      _sum: {
        actualWeight: true,
      },
      where: {
        status: "VERIFIED",
        wasteType: {
          in: ["PET", "CARDBOARD", "PAPER", "METAL"],
        },
      },
    });
    // console.log(recyclableWaste);


    const nonRecyclable = await prisma.pickupRequest.aggregate({
      _sum: { actualWeight: true },
      where: {
        status: "VERIFIED",
        wasteType: "NON_RECYCLABLE",
      },
    });

    // console.log(nonRecyclable);

    const wasteByType = await prisma.pickupRequest.groupBy({
      by: ["wasteType"],
      where: {
        status: "VERIFIED",
      },
      _sum: {
        actualWeight: true,
      },
    });

    // console.log(wasteByType);

    const totalWaste = await prisma.pickupRequest.aggregate({
      where:{
        status:"VERIFIED",
      },
      _sum:{
        actualWeight: true
      }
    })

    const petWaste = await prisma.pickupRequest.aggregate({
      where:{
        status: "VERIFIED",
        wasteType: "PET"
      },
      _sum:{
        actualWeight: true
      }
    })

    const cardWaste = await prisma.pickupRequest.aggregate({
      where:{
        status: "VERIFIED",
        wasteType: "CARDBOARD"
      },
      _sum:{
        actualWeight: true
      }
    })

    const paperWaste = await prisma.pickupRequest.aggregate({
      where:{
        status: "VERIFIED",
        wasteType: "PAPER"
      },
      _sum:{
        actualWeight: true
      }
    })

    const metalWaste = await prisma.pickupRequest.aggregate({
      where: {
        status: "VERIFIED",
        wasteType: "METAL"
      },
      _sum: {
        actualWeight: true
      }
    })

    const petPer = Math.floor(Number(petWaste._sum.actualWeight)/Number(totalWaste._sum.actualWeight) * 100)
    const metalPer = Math.floor(Number(metalWaste._sum.actualWeight)/Number(totalWaste._sum.actualWeight) * 100)
    const cardPer = Math.floor(Number(cardWaste._sum.actualWeight)/Number(totalWaste._sum.actualWeight) * 100)
    const paperPer = Math.floor(Number(paperWaste._sum.actualWeight)/Number(totalWaste._sum.actualWeight) * 100)
    const non_recyclePer = Math.floor(Number(nonRecyclable._sum.actualWeight)/Number(totalWaste._sum.actualWeight) * 100)

    const activeWorkers = await prisma.user.count({
      where:{
        status: "ACTIVE",
        role: "WORKER",
      }
    })

    const totalEarnings = await prisma.user.aggregate({
      _sum:{totalEarnings: true},
      where:{
        role: "CITIZEN"
      }
    })

    const verifiedPickups = await prisma.pickupRequest.count({
      where: {status: "VERIFIED"}
    })

    const totalUsers = await prisma.user.count({
      where:{role:"CITIZEN"},
    })

    const zones = await prisma.zone.findMany({
      select: {
        zoneId: true,
        name: true,
    
        users: {
          where: {
            role: "WORKER",
          },
          select: {
            userId: true,
            name: true,
            vehicle: true,
            status: true,
    
            assignedPickups: {
              select: {
                requestId: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const workersData = zones.map(zone => ({
      zoneId: zone.zoneId,
      zoneName: zone.name,
    
      workers: zone.users.map(worker => {
        const totalTasks = worker.assignedPickups.length;
    
        const completedTasks = worker.assignedPickups.filter(
          p => p.status === "VERIFIED"
        ).length;
    
        const assignedTasks = worker.assignedPickups.filter(
          p => p.status === "ASSIGNED"
        ).length;
    
        return {
          workerId: worker.userId,
          name: worker.name,
          vehicle: worker.vehicle,
    
          totalTasks,
          completedTasks,
          assignedTasks,
    
          efficiency:
            totalTasks === 0
              ? 0
              : Math.round((completedTasks / totalTasks) * 100),
        };
      }),
    }));

    const bestWorkersPerZone = workersData.map(zone => {
      const bestWorker = zone.workers.reduce((best, current) => {
        return current.efficiency > best.efficiency
          ? current
          : best;
      }, zone.workers[0]);
    
      return {
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
    
        bestWorker: bestWorker || null,
      };
    });

    // console.log(bestWorkersPerZone)

    // console.log(workersData);

    const SystemLogs = await prisma.auditLog.findMany({
      orderBy:{
        createdAt: "desc"
      },
      take:3
    })

    // console.log(SystemLogs);

    const weeklyreport = await getPickupStats();
    // console.log(weeklyreport);

    const systemLogs = SystemLogs.map(log => ({
      ...log,
      auditId: log.auditId.toString(), // Replace 'id' with whatever field is the BigInt
    }));

    const responseData = {
      totalRequests: totalRequests,
      recyclableWaste: recyclableWaste._sum,
      nonRecyclable: nonRecyclable._sum,
      activeWorkers: activeWorkers,
      totalEarnings: totalEarnings._sum,
      verifiedPickups: verifiedPickups,
      totalUsers: totalUsers,
      petPer: petPer,
      paperPer: paperPer,
      metalPer: metalPer,
      cardPer: cardPer,
      non_recyclePer: non_recyclePer,
      totalWaste : Number(totalWaste._sum.actualWeight),
    }

    // console.log(responseData);




    

    return res.status(200).json({responseData,bestWorkersPerZone,systemLogs,weeklyreport, success:true})

  }catch(error){
    console.log(error);
  }
}