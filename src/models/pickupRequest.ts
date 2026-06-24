import { worker } from "node:cluster";
import {
  RequestStatus,
  RouteType,
  WasteType,
} from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { auditLogger } from "../utils/auditLogger";
// import { pollingManager } from "../utils/pollingManager";
import { createNotification } from "../service/notificationService";


interface PickupRequestWithEarnings {
  requestId: number;
  wasteType: WasteType;
  requestDate: Date;
  scheduledDate: Date | null;
  status: RequestStatus;
  estimatedWeight: number;
  estimatedEarnings: number;
  pickupAddress: string;
  citizenNote: string | null;
  photoUrl: string | null;
  actualWeight: number | null;
  rateApplied: number | null;
  condition: string;
  workerId: number | null;
  workerName: string | null;
  workerPhone: string | null;
  routeName: string | null;
  routeType: string | null;
  routeSchedule: string | null;
}

interface AllPickupRequestsResponse {
  requests: PickupRequestWithEarnings[];
  totalEarnings: number;
}

interface pickupAddress {
  latitude: number;
  longitude: number;
  address: string;
  userId: number;
}

// Define this ONCE at the top of your file or in a constants file.
// This is called a "lookup table" or "mapping object" — it's clean and easy to update.
const WASTE_TYPE_TO_ROUTE: Record<string, "recycling" | "landfill"> = {
  PET: "recycling",
  PAPER: "recycling",
  CARDBOARD: "recycling",
  METAL: "recycling", // metals are recyclable
  NON_RECYCLABLE: "landfill",
};

const MAX_ACTIVE_ASSIGNMENTS = 10;

export class PickupRequests {
  async createPickupRequest(data: {
    userId: number;
    wasteType: string;
    estimatedWeight: number;
    pickupAddress: string;
    notes: string;
    photoUrl: string | null;
    latitude: number;
    longitude: number;
  }, req:any) {
    try {
      if (!Object.values(WasteType).includes(data.wasteType as WasteType)) {
        throw new Error(`Invalid waste type: ${data.wasteType}`);
      }

      const pickupRequest = await prisma.pickupRequest.create({
        data: {
          citizenId: data.userId,
          wasteType: data.wasteType as WasteType,
          estimatedWeight: data.estimatedWeight,
          address: data.pickupAddress,
          notes: data.notes,
          photoUrl: data.photoUrl,
          status: RequestStatus.PENDING,
          latitude: data.latitude,
          longitude: data.longitude,
          scheduledDate: new Date(),
        },
      });

      await createNotification({
          userId: 2,
          type: "PICKUP_SUBMITTED",
          title: "Pickup Submitted",
          message: `New pickup request has been submitted.` ,
          metadata: {
            requestId: pickupRequest.requestId,
            submittedAt: new Date().toISOString(),
          }
      })

      await auditLogger({
        userId: req.user?.id,
        userRole: "CITIZEN",
        action: "CREATE",           
        targetType: "PICKUP_REQUEST",
        targetId: String(pickupRequest.requestId),
        oldValue: null,
        newValue: {
          status: pickupRequest.status,
          condition: pickupRequest.condition,
          estimatedWeight: pickupRequest.estimatedWeight,
        },
        req,
      });



      return pickupRequest;
    } catch (error) {
      await auditLogger({
        userId: req.user?.id,
        userRole: "CITIZEN",
        action: "CREATE",           
        targetType: "PICKUP_REQUEST",
        req,
        status: "FAILED",
      });
      console.error("Error creating pickup request:", error);
      throw new Error("Failed to create pickup request");
    }
  }

  async allPickupRequests(
    userId: number,
    zoneId: number,
  ): Promise<AllPickupRequestsResponse> {
    try {
      const requests = await prisma.pickupRequest.findMany({
        where: { citizenId: userId },
        orderBy: { createdAt: "desc" },
        select: {
          requestId: true,
          wasteType: true,
          requestDate: true,
          scheduledDate: true,
          status: true,
          estimatedWeight: true,
          photoUrl: true,
          address: true,
          notes: true,
          actualWeight: true,
          condition: true,
          rateApplied: true,
          worker: {
            select: { name: true, phone: true, userId: true, zoneId: true },
          },
          route: {
            where: {
              zoneId: zoneId,
            },
            select: {
              name: true,
              schedule: true,
              type: true,
            },
          },
        },
      });

      let totalEarnings = 0;

      const requestsWithEarnings: PickupRequestWithEarnings[] = requests.map(
        (request) => {
          const weight = request.estimatedWeight
            ? request.estimatedWeight.toNumber()
            : 0;

          let rate: number;
          if (request.rateApplied !== null) {
            rate = request.rateApplied.toNumber();
          } else {
            rate = 0;
          }

          const earnings = rate * weight;
          totalEarnings += earnings;

          return {
            requestId: request.requestId,
            wasteType: request.wasteType,
            requestDate: request.requestDate,
            scheduledDate: request.scheduledDate,
            status: request.status,
            estimatedWeight: weight,
            estimatedEarnings: earnings,
            photoUrl: request.photoUrl,
            pickupAddress: request.address,
            citizenNote: request.notes,
            actualWeight: request.actualWeight
              ? request.actualWeight.toNumber()
              : null,
            rateApplied: request.rateApplied
              ? request.rateApplied.toNumber()
              : null,
            condition: request.condition ?? "",
            workerId: request.worker?.userId ?? null,
            workerName: request.worker?.name ?? null,
            workerPhone: request.worker?.phone ?? null,
            routeName: request.route?.name ?? null,
            routeType: request.route?.type ?? null,
            routeSchedule: request.route?.schedule ?? null,
            worker: request.worker?.name,
          };
        },
      );

      return {
        requests: requestsWithEarnings,
        totalEarnings: totalEarnings,
      };
    } catch (error) {
      console.error("Failed to fetch pickup requests:", error);
      throw new Error(
        "Unable to retrieve pickup requests. Please try again later.",
      );
    }
  }

  async savedAddresses(address: pickupAddress,req:any) {
    try {
      const result = await prisma.address.upsert({
        where: {
          userId_address: {
            userId: address.userId,
            address: address.address,
          },
        },
        update: {},
        create: {
          address: address.address,
          latitude: address.latitude,
          longitude: address.longitude,
          userId: address.userId,
          updatedAt: new Date(),
        },
      });
      await auditLogger({
        userId: req.user?.id,
        userRole: "CITIZEN",
        action: "CREATE",           // VERIFIED is a status change
        targetType: "ADDRESS",
        targetId: String(result.addressId),
        newValue: {
          addressId: result.addressId,
          address: result.address
        },
        req,
      });
      return result;
    } catch (error) {
      await auditLogger({
        userId: req.user?.id,
        userRole: "CITIZEN",
        action: "CREATE",           // VERIFIED is a status change
        targetType: "ADDRESS",
        req,
        status: "FAILED"
      });
      console.error("Error saving address:", error);
      throw error;
    }
  }
  async assignWorker(userId: number, wasteType: string, requestId: number, req:any) {
    const citizen = await prisma.user.findUnique({
      where: { userId },
      select: {
        zoneId: true,
      },
    });

    const oldPickupRequest = await prisma.pickupRequest.findUnique({where:{requestId}})


    if (!citizen?.zoneId) {
      // If citizen has no zone, we can't assign — leave as PENDING
      console.warn(
        `Citizen ${userId} has no zone assigned. Request ${requestId} stays PENDING.`,
      );
      return null;
    }

    const routeType = WASTE_TYPE_TO_ROUTE[wasteType];
    if (!routeType) {
      throw new Error(`Unknown waste type: ${wasteType}`);
    }

    const eligibleWorkers = await prisma.user.findMany({
      where: {
        zoneId: citizen.zoneId,
        responsibleFor: routeType, // "recycling" or "landfill"
        role: "WORKER",
        status: "ACTIVE",
      },
      select: {
        userId: true,
        _count: {
          select: {
            assignedPickups: {
              where: {
                status: { in: ["PENDING", "ASSIGNED"] }, // These are "active" jobs
              },
            },
          },
        },
      },
    });
    console.log(eligibleWorkers);
    const availableWorkers = eligibleWorkers.filter(
      (worker) => worker._count.assignedPickups < MAX_ACTIVE_ASSIGNMENTS,
    );

    // console.log(availableWorkers);

    if (availableWorkers.length === 0) {
      // No one available — leave request as PENDING for manual review or retry
      console.warn(
        `No available workers for request ${requestId} in zone ${citizen.zoneId}. Stays PENDING.`,
      );
      return null;
    }

    // Step E: Pick the least loaded worker (sort by active count ascending, take first)
    availableWorkers.sort(
      (a, b) => a._count.assignedPickups - b._count.assignedPickups,
    );
    // console.log(availableWorkers)
    const selectedWorker = availableWorkers[0];

    // console.log(selectedWorker)


    // Step F: Update the pickup request — assign the worker and change status
    const updatedRequest = await prisma.pickupRequest.update({
      where: { requestId },
      data: {
        workerId: selectedWorker.userId,
        status: "ASSIGNED",
        assignedDate: new Date(),
      },
    });

    await createNotification({
        userId: selectedWorker.userId,
        type: "PICKUP_ASSIGNED",
        title: "New Task Assigned.",
        message: `You have a new pickup request #${requestId}.`,
        metadata: {
          requestId: requestId,
          assignedAt: new Date().toISOString(),
      }
    })


    await auditLogger({
      userId: req.user?.id,
      userRole: "WORKER",
      action: "ASSIGN",           
      targetType: "PICKUP_REQUEST",
      targetId: String(requestId),
      oldValue: {
        status: oldPickupRequest?.status,
        condition: oldPickupRequest?.condition,
        actualWeight: oldPickupRequest?.actualWeight,
        rateApplied: oldPickupRequest?.rateApplied,
        worker: oldPickupRequest?.workerId
      },
      newValue: {
        status: updatedRequest.status,
        condition: updatedRequest.condition,
        estimatedWeight: updatedRequest.estimatedWeight,
        worker: updatedRequest.workerId
      },
      req,
    });

    console.log(
      `Request ${requestId} assigned to worker ${selectedWorker.userId}`,
    );
    // console.log(updatedRequest);
    return updatedRequest;
  }
}
