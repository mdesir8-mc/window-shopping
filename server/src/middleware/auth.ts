import type { NextFunction, RequestHandler, Response } from "express";
import { HttpError } from "../utils/http";
import { signAuthToken, verifyAuthToken } from "../utils/jwt";
import { setAuthCookie } from "../utils/authCookie";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "../types";

// Re-issue an active session's token once it is older than this, so sessions slide
// forward with use instead of hitting the 30d hard expiry.
const REISSUE_AFTER_SECONDS = 7 * 24 * 60 * 60;

export const requireAuth: RequestHandler = async (req, res: Response, next: NextFunction) => {
  try {
    const authorization = req.header("Authorization");
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : null;
    const token = req.cookies?.auth_token ?? bearerToken;

    if (!token) {
      throw new HttpError(401, "Missing or invalid authentication.");
    }

    const claims = verifyAuthToken(token);

    if (!claims.sub || !claims.email || !claims.name) {
      throw new HttpError(401, "Invalid authentication token.");
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, name: true, avatarUrl: true, sessionsValidAfter: true }
    });

    if (!user) {
      throw new HttpError(401, "Authentication token is no longer valid.");
    }

    // Global sign-out: reject tokens minted before the user's last "sign out everywhere".
    if (user.sessionsValidAfter && (claims.iat ?? 0) * 1000 < user.sessionsValidAfter.getTime()) {
      throw new HttpError(401, "Session revoked.");
    }

    // Sliding session: re-issue once the token is past the threshold. X-Refreshed-Token
    // serves native (no cookie jar); the refreshed cookie keeps web sliding too.
    if (claims.iat && Date.now() / 1000 - claims.iat > REISSUE_AFTER_SECONDS) {
      const freshToken = signAuthToken({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
      });
      res.setHeader("X-Refreshed-Token", freshToken);
      setAuthCookie(res, freshToken);
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid authentication token."));
  }
};
