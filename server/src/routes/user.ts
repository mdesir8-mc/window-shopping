import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/http";
import { requireString } from "../utils/validation";
import type { AuthenticatedRequest } from "../types";

const router = Router();

const userSelect = {
  id: true,
  name: true,
  email: true,
  plan: true,
  avatarUrl: true,
  googleId: true
} as const;

type SelectedUser = {
  id: string;
  name: string;
  email: string;
  plan: string;
  avatarUrl: string | null;
  googleId: string | null;
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
    const name = requireString(req.body?.name, "name");

    const [user, itemCount] = await Promise.all([
      prisma.user.update({
        where: { id: request.user.id },
        data: { name },
        select: userSelect
      }),
      countItems(request.user.id)
    ]);

    res.json(serializeUser(user, itemCount));
  })
);

export default router;
