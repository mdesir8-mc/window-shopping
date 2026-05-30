import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/http";
import type { AuthenticatedRequest } from "../types";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const [user, itemCount] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: request.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          avatarUrl: true
        }
      }),
      prisma.item.count({
        where: {
          closet: {
            userId: request.user.id
          }
        }
      })
    ]);

    res.json({
      ...user,
      itemCount
    });
  })
);

export default router;
