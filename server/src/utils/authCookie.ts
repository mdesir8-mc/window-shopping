import type { Response } from "express";

// sameSite is "lax", not "strict", so the OAuth consent page at /oauth/authorize
// sees an existing session when Claude sends the user there by top-level
// navigation. Lax still withholds the cookie on cross-site POST/PATCH/DELETE,
// which is where every mutation in this API lives, so the CSRF posture is
// unchanged; the production CORS allowlist remains the second layer.
export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_COOKIE_MAX_AGE
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });
}

export function readAuthCookie(cookies: Record<string, unknown> | undefined): string | null {
  const token = cookies?.[AUTH_COOKIE_NAME];
  return typeof token === "string" && token.length > 0 ? token : null;
}
