import type { NextFunction, RequestHandler, Response } from "express";
import { HttpError } from "../utils/http";
import { verifyAuthToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "../types";

export const requireAuth: RequestHandler = async (req, _res: Response, next: NextFunction) => {
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
      select: { id: true, email: true, name: true, avatarUrl: true }
    });

    if (!user) {
      throw new HttpError(401, "Authentication token is no longer valid.");
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "Invalid authentication token."));
  }
};
