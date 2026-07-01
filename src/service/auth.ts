import jsonwebtoken, { type SignOptions } from "jsonwebtoken";
import { User } from "../../generated/prisma/client";
import { JWTPayload } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error("Missing JWT_SECRET or REFRESH_SECRET");
}

export const ACCESS_TOKEN_EXPIRES_IN = (
  process.env.ACCESS_TOKEN_EXPIRES_IN ?? "30s"
) as SignOptions["expiresIn"];
export const REFRESH_TOKEN_EXPIRES_IN = (
  process.env.REFRESH_TOKEN_EXPIRES_IN ?? "30d"
) as SignOptions["expiresIn"];

function buildPayload(user: User): JWTPayload {
  return {
    id: user.userId,
    username: user.name,
    email: user.email,
    zoneId: user.zoneId ?? null,
    role: user.role,
  };
}

export function signAccessToken(user: User): string {
  return jsonwebtoken.sign(buildPayload(user), JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function signRefreshToken(user: User): string {
  return jsonwebtoken.sign(buildPayload(user), REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function setupJWT(user: User) {
  return {
    token: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const payload = jsonwebtoken.verify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (err) {
    console.log("JWT verification failed:", err);
    return null;
  }
}

export function verifyRefreshToken(refreshToken: string): JWTPayload | null {
  try {
    const payload = jsonwebtoken.verify(refreshToken, REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch (err) {
    console.log("Refresh token verification failed:", err);
    return null;
  }
}
