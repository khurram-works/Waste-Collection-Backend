import { CookieOptions, Response } from "express";

const isProd = process.env.NODE_ENV === "production";

export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
};

export function setAccessTokenCookie(res: Response, token: string) {
  res.cookie("accessToken", token, {
    ...baseOptions,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
  });
}

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie("refreshToken", token, {
    ...baseOptions,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", { ...baseOptions });
  res.clearCookie("refreshToken", { ...baseOptions });
}