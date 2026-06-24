import e from "express";
import { prisma } from "../../lib/prisma";
import { clearAuthCookies } from "../utils/authCookies";

export async function handleLogout(req: e.Request, res: e.Response) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    }

    clearAuthCookies(res);
    return res.status(200).json({ message: "Logged out", success: true });
  } catch (err) {
    console.error("Logout error:", err);
    clearAuthCookies(res);
    return res.status(500).json({ error: "Internal server error" });
  }
}