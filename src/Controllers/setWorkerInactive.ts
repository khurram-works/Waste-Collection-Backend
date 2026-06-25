import { prisma } from "../../lib/prisma";
import e from "express";
import { auditLogger } from "../utils/auditLogger";
import { clearAuthCookies } from "../utils/authCookies";

export async function setWorkerInactive(req: e.Request, res: e.Response) {
  try {
    const { status } = req.body;
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId: req.user?.id },
        data: { revoked: true },
      });
    }

    await prisma.user.update({
      where: { userId: req.user?.id },
      data: { status },
    });

    await auditLogger({
      userId: req.user?.id,
      action: "LOGOUT",
      targetType: "USER",
      userRole: "WORKER",
      targetId: String(req.user?.id),
      req,
    });

    clearAuthCookies(res);
    return res
      .status(200)
      .json({ message: "Successfully logged out.", success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error updating citizen from active to inactive",
      success: false,
    });
  }
}