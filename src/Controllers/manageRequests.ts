import e from "express";
import {prisma} from "../../lib/prisma"
import { Role, UserStatus } from "../../generated/prisma/enums";


export async function manageRequests(req: e.Request, res: e.Response){
  try{
   const allRequests = await prisma.pickupRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      requestId: true,
      wasteType: true,
      requestDate: true,
      status: true,
      citizen:{
        select: {name: true, phone: true, zoneId: true}
      },
      photoUrl:true,
      notes: true,
      address: true,
      worker: {
        select: {name: true, userId: true, phone: true}
      },
      route:{
        select: {name: true, routeId: true, zoneId: true}
      }
    },
   })
   const allWorkers = await prisma.user.findMany({
    where:{
      role: Role.WORKER,
    },
    select:{
      userId:true,
      name: true,
      zone: true,
      zoneId: true,
      responsibleFor: true,
    }
   })
   const allroutes = await prisma.route.findMany({
    select:{
      routeId: true,
      name: true,
      schedule: true,
      zone: {
        select: {name: true, zoneId: true}
      },
      zoneId: true,
      capacityPerDay: true,
      type: true,
    }

   })

   return res.status(200).json({
    allRequests: allRequests,
    allWorkers: allWorkers,
    allroutes: allroutes
   })
  }catch(err){
    console.error("Failed to fetch requests data", err);
    return res.status(500).json({ error: "Internal server error" });
  }

}