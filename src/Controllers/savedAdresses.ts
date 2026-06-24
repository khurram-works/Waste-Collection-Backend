import { prisma } from "../../lib/prisma";
import { Request, Response } from "express";
import e from "express";

export async function getSavedAddresses(req: e.Request, res: e.Response) {
  try {
    const userId = Number(req.params.userId);
    const savedAddresses = await prisma.address.findMany({
      where: {
        userId,
      },
      select: {
        addressId: true,
        userId: true,
        latitude: true,
        longitude: true,
        address: true,
      },
    });
    return res.status(200).json({
      message: "Successfully retrieved all saved addresses.",
      savedAddresses: savedAddresses,
    });
  } catch (error) {
    console.error("Error retrieving saved addresses", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error,
    });
  }
}
