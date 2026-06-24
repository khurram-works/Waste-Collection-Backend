import e from "express";
import { prisma } from "../../lib/prisma";
import {
  signAccessToken,
  verifyRefreshToken,
} from "../service/auth";
import {
  setAccessTokenCookie,
  clearAuthCookies,
} from "../utils/authCookies";
import { User } from "../../generated/prisma/client";

export async function handleRefreshToken(
  req: e.Request,
  res: e.Response
) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Refresh token missing" });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.revoked) {
      clearAuthCookies(res);
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    if (storedToken.expiresAt < new Date()) {
      clearAuthCookies(res);
      return res.status(403).json({ error: "Refresh token expired" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      clearAuthCookies(res);
      return res.status(403).json({ error: "Invalid refresh token signature" });
    }

    const user = await prisma.user.findUnique({
      where: { userId: decoded.id },
    });

    if (!user) {
      clearAuthCookies(res);
      return res.status(403).json({ error: "User not found" });
    }

    const newAccessToken = signAccessToken(user as User);
    setAccessTokenCookie(res, newAccessToken);

    return res.status(200).json({ message: "Token refreshed" });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}