import { prisma } from "../../lib/prisma";
import { RequestStatus, Role } from "../../generated/prisma/enums";
import e from "express";
import { auditLogger } from "../utils/auditLogger";
import { maskSensitiveData } from "../utils/maskSensitiveData";

export async function getWorkers(req: e.Request, res: e.Response) {
  try {
    const allWorkers = await prisma.user.findMany({
      where: {
        role: Role.WORKER,
      },
      select: {
        name: true,
        zone: {
          select: { name: true, zoneId: true },
        },
        userId: true,
        phone: true,
        status: true,
        vehicle: true,
        _count: {
          select: {
            assignedPickups: true
          },
        },
        responsibleFor: true,
      },
    });

    const collectedCounts = await prisma.pickupRequest.groupBy({
      by: ["workerId"],
      where: {
        workerId: { in: allWorkers.map((w) => w.userId) },
        status: RequestStatus.VERIFIED,
      },
      _count: { requestId: true },
    });

    const workersWithBoth = allWorkers.map((w) => ({
      ...w,
      collectedCount:
        collectedCounts.find((c) => c.workerId === w.userId)?._count
          .requestId || 0,
    }));

    const allZones = await prisma.zone.findMany({
      select: {
        name: true,
        zoneId: true,
      },
    });

    return res.status(200).json({
      message: "All Workers Data Fetched Successfully",
      allWorkers: workersWithBoth,
      allZones: allZones,
    });
  } catch (err) {
    console.error("Failed to fetch workers Data", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateWorker(req: e.Request, res: e.Response) {
  const workerId = Number(req.params.workerId);
  const { zoneId, vehicle, status, responsibleFor } = req.body;

  if (
    zoneId === undefined &&
    vehicle === undefined &&
    status === undefined &&
    responsibleFor === undefined
  ) {
    return res.status(400).json({
      error: "At least one field (zoneId, vehicle, status, or responsibleFor) must be provided",
    });
  }

  // ✅ Declared outside try/catch so both blocks can access them
  let oldWorker: any = null;
  let updatedWorker: any = null;

  try {
    oldWorker = await prisma.user.findUnique({
      where: { userId: workerId },
    });

    updatedWorker = await prisma.$transaction(async (tx) => {
      const activeAssignment = await tx.pickupRequest.findFirst({
        where: {
          workerId: workerId,
          routeId: { not: null },
          status: {
            in: [
              RequestStatus.ASSIGNED,
              RequestStatus.COLLECTED,
            ],
          },
        },
      });

      if (activeAssignment) {
        throw new Error("Cannot update worker – they are currently assigned to a route");
      }

      const updateData: any = {};
      if (zoneId !== undefined) updateData.zoneId = zoneId;
      if (vehicle !== undefined) updateData.vehicle = vehicle;
      if (status !== undefined) updateData.status = status;
      if (responsibleFor !== undefined) updateData.responsibleFor = responsibleFor;

      const updated = await tx.user.update({
        where: { userId: workerId, role: "WORKER" },
        data: updateData,
      });

      return updated;
    });

    await auditLogger({
      userId: req.user?.id,
      userRole: updatedWorker.role,
      action: "UPDATE",
      targetType: "USER",
      targetId: String(workerId),
      oldValue: maskSensitiveData(oldWorker),
      newValue: maskSensitiveData(updatedWorker),
      req,
      status: "SUCCESS",
    });

    return res.status(200).json({ updatedWorker, message: "Worker updated successfully" });
  } catch (error) {
    await auditLogger({
      userId: req.user?.id,
      userRole: updatedWorker?.role ?? null, // ✅ Fixed typo: was `updatedWorke`
      action: "UPDATE",
      targetType: "USER",
      targetId: String(workerId),
      oldValue: oldWorker ? maskSensitiveData(oldWorker) : null,          // ✅ Now in scope
      newValue: updatedWorker ? maskSensitiveData(updatedWorker) : null,  // ✅ Now in scope
      req,
      status: "FAILED",
    });

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deleteWorker(req: e.Request, res: e.Response) {
  const workerId = Number(req.params.workerId);
  let deletedWorkerData: any = null;

  try {
    deletedWorkerData = await prisma.$transaction(async (tx) => {
      const activeAssignment = await tx.pickupRequest.findFirst({
        where: {
          workerId: workerId,
          routeId: { not: null },
          status: {
            in: [
              RequestStatus.ASSIGNED,
              RequestStatus.COLLECTED,
              RequestStatus.PAID,
              RequestStatus.VERIFIED,
            ],
          },
        },
      });

      if (activeAssignment) {
        throw new Error("Cannot delete worker – they are currently assigned to a route");
      }

      const deleted = await tx.user.delete({
        where: { userId: workerId },
      });

      return deleted;
    });

    await auditLogger({
      userId: req.user?.id,
      userRole: deletedWorkerData.role,
      action: "DELETE",
      targetType: "USER",
      targetId: String(workerId),
      oldValue: maskSensitiveData(deletedWorkerData),
      newValue: null,
      req,
      status: "SUCCESS",
    });

    return res.status(200).json({ message: "Worker deleted successfully", deletedWorker: deletedWorkerData });
  } catch (error) {
    await auditLogger({
      userId: req.user?.id,
      userRole: deletedWorkerData?.role ?? null,
      action: "DELETE",
      targetType: "USER",
      targetId: String(workerId),
      oldValue: deletedWorkerData ? maskSensitiveData(deletedWorkerData) : null,
      newValue: null,
      req,
      status: "FAILED",
    }).catch(()=>{});

    if (error instanceof Error && error.message.includes("currently assigned to a route")) {
      return res.status(400).json({ error: error.message });
    }

    if (error instanceof Error && error.message.includes("foreign key constraint")) {
      return res.status(400).json({
        error: "Cannot delete worker – they have existing records (e.g., past pickup requests).",
      });
    }

    console.error("Delete worker error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}