import e from "express";
import { prisma } from "../../lib/prisma";
import { RequestStatus } from "../../generated/prisma/enums";
import { auditLogger } from "../utils/auditLogger";
import { createNotification } from "../service/notificationService";

export async function assignWorker(
  req: e.Request<{ requestId: string }>,
  res: e.Response,
) {
  const requestId = Number(req.params.requestId);
  const { workerId, routeId, status } = req.body;

  if (isNaN(requestId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid requestId" });
  }
  const existing = await prisma.pickupRequest.findUnique({
    where: { requestId },
  });

  if (!existing) {
    return res
      .status(404)
      .json({ success: false, message: "Request not found" });
  }

  if (existing.status === "CANCELLED") {
    return res
      .status(400)
      .json({ success: false, message: "Already rejected" });
  }
  const oldvalue = await prisma.pickupRequest.findUnique({
    where: { requestId },
  });

  try {
    if (status === "Rejected") {
      const rejected = await prisma.pickupRequest.update({
        where: { requestId },
        data: {
          status: RequestStatus.CANCELLED,
          workerId: null,
          routeId: null,
        },
      });

      await prisma.notification.create({
        data:{
          userId: Number(rejected.citizenId),
          type: "PICKUP_CANCELLED",
          title: "Pickup Rejected",
          message: `Your pickup request #${requestId} has been rejected.` ,
          metadata: {
            requestId: requestId,
            verifiedAt: new Date().toISOString(),
          }
        }
      })

      await auditLogger({
        action: "REJECT",
        targetType: "PICKUP_REQUEST",
        userRole: "ADMIN",
        targetId: String(requestId),
        req,
        userId: rejected.citizenId,
        oldValue: {
          status: oldvalue?.status,
        },
        newValue: {
          status: rejected.status,
        },
      });

      return res.json({
        success: true,
        message: "Request rejected successfully",
        data: rejected,
      });
    }

    if (!workerId) {
      return res.status(400).json({
        success: false,
        message: "workerId is required for assignment",
      });
    }

    const updated = await prisma.pickupRequest.update({
      where: { requestId },
      data: {
        workerId,
        routeId,
        status: RequestStatus.ASSIGNED,
        assignedDate: new Date(),
      },
    });

    await createNotification({
        userId: Number(updated.workerId),
        type: "PICKUP_ASSIGNED",
        title: "New Task Assigned.",
        message: "You have a pickup request.",
        metadata: {
          requestId: requestId,
          assignedAt: new Date().toISOString(),
        }
    })

    await auditLogger({
      action: "ASSIGN",
      targetType: "PICKUP_REQUEST",
      userRole: "ADMIN",
      targetId: String(requestId),
      req,
      userId: updated.citizenId,
      oldValue: {
        status: oldvalue?.status,
        workerId: oldvalue?.workerId,
        assignedDate: oldvalue?.assignedDate,
      },
      newValue: {
        status: updated.status,
        workerId: updated.workerId,
        assignedDate: updated.assignedDate
      },
    });

    return res.json({
      success: true,
      message: "Worker assigned successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Assign Worker Error", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
}
