import { Request, Response, NextFunction } from "express";
import { JWTPayload } from "../types/auth";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as JWTPayload | undefined;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}