import e from "express";
import { verifyJWT } from "../service/auth";
import { JWTPayload } from "../types/auth";

function isJWTPayload(obj: unknown): obj is JWTPayload {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.username === "string" &&
    typeof o.email === "string" &&
    (typeof o.zoneId === "number" || o.zoneId === null) &&
    typeof o.role === "string"
  );
}

function authenticateToken(
  req: e.Request,
  res: e.Response,
  next: e.NextFunction
) {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : undefined;

  const token = req.cookies?.accessToken ?? bearerToken;

  if (!token) {
    return res.status(401).json({
      error: "Access denied. No token provided.",
    });
  }

  const decoded = verifyJWT(token);

  if (!decoded) {
    return res.status(401).json({
      error: "Invalid or expired token.",
    });
  }

  if (!isJWTPayload(decoded)) {
    return res.status(401).json({
      error: "Invalid token payload.",
    });
  }

  req.user = decoded;
  next();
}

export { authenticateToken };
