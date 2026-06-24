import { prisma } from "../../lib/prisma";
import e from "express"


export async function getZones(req:e.Request, res: e.Response){
  try{
    const zones = await prisma.zone.findMany({
      select:{
        zoneId: true,
        name: true,
      }
    })

    return res.status(200).json({
      zones: zones
    })
  }catch(error){
    console.error("Error fetching zones", error);
    throw new Error("Failed fetching zones");
  }

}