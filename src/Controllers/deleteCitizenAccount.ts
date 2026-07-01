import { prisma } from "../../lib/prisma";
import e from "express";
import { auditLogger } from "../utils/auditLogger";

export async function deleteCitizenAccount(req: e.Request, res: e.Response) {
  try {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { citizenId: req.user?.id } }),
      prisma.pickupRequest.deleteMany({ where: { citizenId: req.user?.id } }),
      prisma.withdrawalRequest.deleteMany({ where: { userId: req.user?.id } }),
      prisma.address.deleteMany({ where: { userId: req.user?.id } }),
      prisma.auditLog.deleteMany({ where: { userId: req.user?.id } }),
      prisma.user.delete({ where: { userId: req.user?.id } }),
    ]);

    await auditLogger({
      userId: req.user?.id,
      targetType: "USER",
      targetId: String(req.user?.id),
      action: "DELETE",
      req,
    });

    return res
      .status(200)
      .json({ message: "Account deleted successfully", success: true });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Error deleting citizen account.", success: false });
  }
}
