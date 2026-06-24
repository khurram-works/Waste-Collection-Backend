import e from "express";
import { PickupRequests } from "../models/pickupRequest";

const allpickups = new PickupRequests();

export async function allPickupRequests(req: e.Request, res: e.Response) {
  try {
    const userId = req.user?.id as number;
    const zoneId = req.user?.zoneId as number;
    const allRequests = await allpickups.allPickupRequests(userId, zoneId);
    // console.log(allRequests);
    return res.status(200).json({
      message: "All Pickup Requests",
      AllPickups : allRequests,
    });
  } catch (err) {
    console.error("Failed receiving pickup request:", err);
    throw new Error("Failed receiving pickup requests");
  }
}
