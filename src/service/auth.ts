import jsonwebtoken, { type SignOptions } from "jsonwebtoken";
import { User } from "../../generated/prisma/client";
import { JWTPayload } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.Refresh_Secret!;

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
    return jsonwebtoken.verify(token, JWT_SECRET) as JWTPayload;
  } catch (err) {
    console.log("JWT verification failed:", err);
    return null;
  }
}

export function verifyRefreshToken(refreshToken: string): JWTPayload | null {
  try {
    return jsonwebtoken.verify(refreshToken, REFRESH_SECRET) as JWTPayload;
  } catch (err) {
    console.log("Refresh token verification failed:", err);
    return null;
  }
}
