import e from "express";
import { prisma} from "../../lib/prisma"
import { RequestStatus } from "../../generated/prisma/enums";
import { auditLogger } from "../utils/auditLogger";
import { createNotification } from "../service/notificationService";

export async function updateStatus(req:e.Request, res:e.Response){
  const requestId = Number(req.params.requestId);
  try{
    const oldPickupRequest = await prisma.pickupRequest.findUnique({
      where:{requestId: requestId},
    })
    const updatedStatus = await prisma.pickupRequest.update({
      where: {requestId: requestId},
      data:{
        status: RequestStatus.COLLECTED
      }
    })

   await createNotification({
        userId: Number(updatedStatus.citizenId),
        type: "PICKUP_COLLECTED",
        title: "Pickup Collected",
        message: `Your pickup request #${requestId} has been successfully collected.` ,
        metadata: {
          requestId: requestId,
          collectedAt: new Date().toISOString(),
        }
    })

    await auditLogger({
      userId: req.user?.id,
      targetType:"PICKUP_REQUEST",
      userRole: "WORKER",
      targetId: String(requestId),
      action:"STATUS_CHANGE",
      req,
      oldValue: oldPickupRequest,
      newValue: updatedStatus,
    })


    return res.status(200).json({
      success: true
    })
  }catch(err){
    await auditLogger({
      userId: req.user?.id,
      targetType:"PICKUP_REQUEST",
      userRole: "WORKER",
      targetId: String(requestId),
      action:"STATUS_CHANGE",
      req,
      status: "FAILED"
    }).catch(()=>{})
    console.error(err)
    throw new Error("Failed Updating Pickup Request Status.")
  }
}