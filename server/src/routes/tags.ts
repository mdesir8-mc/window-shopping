import { Router } from "express";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "../types";
import { asyncHandler, HttpError } from "../utils/http";
import { serializeTag } from "../utils/serializers";
import { optionalString, requireString } from "../utils/validation";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const [tags, items] = await Promise.all([
      prisma.tag.findMany({
        where: {
          userId: request.user.id
        },
        orderBy: {
          name: "asc"
        }
      }),
      prisma.item.findMany({
        where: {
          closet: {
            userId: request.user.id
          }
        },
        select: {
          tags: true
        }
      })
    ]);

    const counts = new Map<string, number>();

    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    res.json(tags.map((tag) => serializeTag(tag, counts.get(tag.name) ?? 0)));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const name = requireString(req.body?.name, "name");
    const color = optionalString(req.body?.color);

    const tag = await prisma.tag.create({
      data: {
        userId: request.user.id,
        name,
        color
      }
    });

    res.status(201).json(serializeTag(tag, 0));
  })
);

router.patch(
  "/:name",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const name = requireString(req.params.name, "name");
    const existing = await prisma.tag.findUnique({
      where: {
        userId_name: {
          userId: request.user.id,
          name
        }
      }
    });

    if (!existing) {
      throw new HttpError(404, "Tag not found.");
    }

    const updated = await prisma.tag.update({
      where: {
        userId_name: {
          userId: request.user.id,
          name
        }
      },
      data: {
        color: optionalString(req.body?.color)
      }
    });

    const itemCount = await prisma.item.count({
      where: {
        closet: {
          userId: request.user.id
        },
        tags: {
          has: name
        }
      }
    });

    res.json(serializeTag(updated, itemCount));
  })
);

router.delete(
  "/:name",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const name = requireString(req.params.name, "name");

    await prisma.$transaction(async (tx) => {
      const tag = await tx.tag.findUnique({
        where: {
          userId_name: {
            userId: request.user.id,
            name
          }
        }
      });

      if (!tag) {
        throw new HttpError(404, "Tag not found.");
      }

      const [closets, sections, items] = await Promise.all([
        tx.closet.findMany({
          where: {
            userId: request.user.id,
            tags: {
              has: name
            }
          },
          select: {
            id: true,
            tags: true
          }
        }),
        tx.section.findMany({
          where: {
            closet: {
              userId: request.user.id
            },
            tags: {
              has: name
            }
          },
          select: {
            id: true,
            tags: true
          }
        }),
        tx.item.findMany({
          where: {
            closet: {
              userId: request.user.id
            },
            tags: {
              has: name
            }
          },
          select: {
            id: true,
            tags: true
          }
        })
      ]);

      await Promise.all([
        ...closets.map((closet) =>
          tx.closet.update({
            where: { id: closet.id },
            data: {
              tags: closet.tags.filter((entry) => entry !== name)
            }
          })
        ),
        ...sections.map((section) =>
          tx.section.update({
            where: { id: section.id },
            data: {
              tags: section.tags.filter((entry) => entry !== name)
            }
          })
        ),
        ...items.map((item) =>
          tx.item.update({
            where: { id: item.id },
            data: {
              tags: item.tags.filter((entry) => entry !== name)
            }
          })
        )
      ]);

      await tx.tag.delete({
        where: {
          userId_name: {
            userId: request.user.id,
            name
          }
        }
      });
    });

    res.status(204).send();
  })
);

export default router;
