import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/http";
import { optionalBoolean, requireString } from "../utils/validation";
import type { AuthenticatedRequest } from "../types";

const router = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  plan: true,
  avatarUrl: true,
  googleId: true,
  emailNotifications: true
} as const;

type SelectedUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  avatarUrl: string | null;
  googleId: string | null;
  emailNotifications: boolean;
};

function serializeUser(user: SelectedUser, itemCount: number) {
  const { googleId, ...rest } = user;
  return {
    ...rest,
    itemCount,
    isGoogleAccount: googleId != null
  };
}

function countItems(userId: string) {
  return prisma.item.count({
    where: {
      closet: {
        userId
      }
    }
  });
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const [user, itemCount] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: request.user.id },
        select: userSelect
      }),
      countItems(request.user.id)
    ]);

    res.json(serializeUser(user, itemCount));
  })
);

router.patch(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;

    const data: { name?: string; emailNotifications?: boolean } = {};
    if (req.body?.name !== undefined) {
      data.name = requireString(req.body.name, "name");
    }
    const emailNotifications = optionalBoolean(req.body?.emailNotifications, "emailNotifications");
    if (emailNotifications !== undefined) {
      data.emailNotifications = emailNotifications;
    }

    if (Object.keys(data).length === 0) {
      throw new HttpError(400, "No updatable fields provided.");
    }

    const [user, itemCount] = await Promise.all([
      prisma.user.update({
        where: { id: request.user.id },
        data,
        select: userSelect
      }),
      countItems(request.user.id)
    ]);

    res.json(serializeUser(user, itemCount));
  })
);

// Connected apps — one row per (user, OAuth client) consent, created when the
// user approves the MCP consent screen. Deleting a grant disconnects that one
// client without touching the user's own web and mobile sessions, which is what
// POST /api/auth/logout-all would do.

router.get(
  "/connections",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;

    const grants = await prisma.oAuthGrant.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: "asc" },
      select: { clientId: true, clientName: true, scopes: true, createdAt: true, lastUsedAt: true }
    });

    res.json(grants);
  })
);

router.delete(
  "/connections/:clientId",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const clientId = requireString(req.params.clientId, "clientId");

    const grant = await prisma.oAuthGrant.findUnique({
      where: { userId_clientId: { userId: request.user.id, clientId } }
    });

    if (!grant) {
      throw new HttpError(404, "Connection not found.");
    }

    // Drop the grant and every refresh token issued under it. Access tokens are
    // self-contained and live up to an hour, so the MCP transport re-checks the
    // grant on every request — a revoked client stops working immediately rather
    // than when its current token expires.
    await prisma.$transaction([
      prisma.oAuthRefreshToken.deleteMany({ where: { userId: request.user.id, clientId } }),
      prisma.oAuthAuthorizationCode.deleteMany({ where: { userId: request.user.id, clientId } }),
      prisma.oAuthGrant.delete({ where: { id: grant.id } })
    ]);

    res.status(204).end();
  })
);

export default router;
