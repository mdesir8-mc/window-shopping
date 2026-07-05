import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "../types";
import { asyncHandler, HttpError } from "../utils/http";
import { getAppBaseUrl } from "../services/email";
import { parseExportFormat, sendItemsExport } from "../utils/itemExport";
import { serializeCloset, serializeSection } from "../utils/serializers";
import { generateShareToken } from "../utils/shareToken";
import { optionalInteger, optionalString, optionalStringArray, requireString } from "../utils/validation";

function shareUrl(token: string): string {
  return `${getAppBaseUrl().replace(/\/+$/, "")}/share/${token}`;
}

const router = Router();

const exportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many exports. Try again in a few minutes." },
  skip: () => process.env.NODE_ENV === "test"
});

async function findOwnedCloset(userId: string, closetId: string) {
  return prisma.closet.findFirst({
    where: {
      id: closetId,
      userId
    },
    include: {
      sections: {
        orderBy: {
          order: "asc"
        },
        include: {
          _count: {
            select: {
              items: true
            }
          }
        }
      },
      _count: {
        select: {
          items: true
        }
      }
    }
  });
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closets = await prisma.closet.findMany({
      where: {
        userId: request.user.id
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        sections: {
          orderBy: {
            order: "asc"
          },
          include: {
            _count: {
              select: {
                items: true
              }
            }
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    res.json(closets.map(serializeCloset));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const name = requireString(req.body?.name, "name");
    const subtitle = optionalString(req.body?.subtitle);
    const accent = optionalString(req.body?.accent);
    const season = optionalString(req.body?.season);
    const tags = optionalStringArray(req.body?.tags, "tags") ?? [];

    const closet = await prisma.closet.create({
      data: {
        userId: request.user.id,
        name,
        subtitle,
        accent,
        season,
        tags
      },
      include: {
        sections: {
          include: {
            _count: {
              select: {
                items: true
              }
            }
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    res.status(201).json(serializeCloset(closet));
  })
);

router.get(
  "/:id/export",
  exportLimiter,
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const format = parseExportFormat(req.query.format);
    const closet = await findOwnedCloset(request.user.id, closetId);

    if (!closet) {
      throw new HttpError(404, "Closet not found.");
    }

    const items = await prisma.item.findMany({
      where: {
        closetId: closet.id,
        closet: {
          userId: request.user.id
        }
      },
      include: {
        closet: {
          select: {
            id: true,
            name: true
          }
        },
        section: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        addedAt: "desc"
      }
    });

    sendItemsExport(res, items, format, closet.name);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const closet = await findOwnedCloset(request.user.id, closetId);

    if (!closet) {
      throw new HttpError(404, "Closet not found.");
    }

    res.json(serializeCloset(closet));
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const existing = await prisma.closet.findFirst({
      where: {
        id: closetId,
        userId: request.user.id
      }
    });

    if (!existing) {
      throw new HttpError(404, "Closet not found.");
    }

    const data = {
      ...(req.body?.name !== undefined ? { name: requireString(req.body.name, "name") } : {}),
      ...(req.body?.subtitle !== undefined ? { subtitle: optionalString(req.body.subtitle) } : {}),
      ...(req.body?.accent !== undefined ? { accent: optionalString(req.body.accent) } : {}),
      ...(req.body?.season !== undefined ? { season: optionalString(req.body.season) } : {}),
      ...(req.body?.tags !== undefined ? { tags: optionalStringArray(req.body.tags, "tags") ?? [] } : {})
    };

    const closet = await prisma.closet.update({
      where: {
        id: existing.id
      },
      data,
      include: {
        sections: {
          orderBy: {
            order: "asc"
          },
          include: {
            _count: {
              select: {
                items: true
              }
            }
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    res.json(serializeCloset(closet));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const result = await prisma.closet.deleteMany({
      where: {
        id: closetId,
        userId: request.user.id
      }
    });

    if (result.count === 0) {
      throw new HttpError(404, "Closet not found.");
    }

    res.status(204).send();
  })
);

router.post(
  "/:id/share",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const closet = await prisma.closet.findFirst({
      where: { id: closetId, userId: request.user.id }
    });

    if (!closet) {
      throw new HttpError(404, "Closet not found.");
    }

    // Idempotent: re-enabling returns the existing token so a double-click never
    // silently orphans outstanding links. Revoke + re-enable to rotate.
    const token = closet.shareToken ?? generateShareToken();
    if (!closet.shareToken) {
      await prisma.closet.update({
        where: { id: closet.id },
        data: { shareToken: token }
      });
    }

    res.json({ shareToken: token, shareUrl: shareUrl(token) });
  })
);

router.delete(
  "/:id/share",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const result = await prisma.closet.updateMany({
      where: { id: closetId, userId: request.user.id },
      data: { shareToken: null }
    });

    if (result.count === 0) {
      throw new HttpError(404, "Closet not found.");
    }

    res.status(204).send();
  })
);

router.post(
  "/:id/sections",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const closet = await prisma.closet.findFirst({
      where: {
        id: closetId,
        userId: request.user.id
      }
    });

    if (!closet) {
      throw new HttpError(404, "Closet not found.");
    }

    const name = requireString(req.body?.name, "name");
    const tags = optionalStringArray(req.body?.tags, "tags") ?? [];
    const latestSection = await prisma.section.findFirst({
      where: {
        closetId: closet.id
      },
      orderBy: {
        order: "desc"
      },
      select: {
        order: true
      }
    });

    const section = await prisma.section.create({
      data: {
        closetId: closet.id,
        name,
        tags,
        order: (latestSection?.order ?? -1) + 1
      },
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    res.status(201).json(serializeSection(section));
  })
);

router.patch(
  "/:id/sections/:secId",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const sectionId = requireString(req.params.secId, "secId");
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        closetId,
        closet: {
          userId: request.user.id
        }
      }
    });

    if (!section) {
      throw new HttpError(404, "Section not found.");
    }

    const data = {
      ...(req.body?.name !== undefined ? { name: requireString(req.body.name, "name") } : {}),
      ...(req.body?.tags !== undefined ? { tags: optionalStringArray(req.body.tags, "tags") ?? [] } : {}),
      ...(req.body?.order !== undefined ? { order: optionalInteger(req.body.order, "order") } : {})
    };

    const updated = await prisma.section.update({
      where: {
        id: section.id
      },
      data,
      include: {
        _count: {
          select: {
            items: true
          }
        }
      }
    });

    res.json(serializeSection(updated));
  })
);

router.delete(
  "/:id/sections/:secId",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.params.id, "id");
    const sectionId = requireString(req.params.secId, "secId");
    const section = await prisma.section.findFirst({
      where: {
        id: sectionId,
        closetId,
        closet: {
          userId: request.user.id
        }
      }
    });

    if (!section) {
      throw new HttpError(404, "Section not found.");
    }

    const deleteItems = req.query.deleteItems === "true";
    const itemCount = await prisma.item.count({
      where: {
        sectionId: section.id,
        closet: {
          userId: request.user.id
        }
      }
    });

    if (itemCount > 0 && !deleteItems) {
      throw new HttpError(409, "Section contains items. Re-run with ?deleteItems=true to delete them.");
    }

    await prisma.$transaction(async (tx) => {
      if (deleteItems) {
        await tx.item.deleteMany({
          where: {
            sectionId: section.id,
            closet: {
              userId: request.user.id
            }
          }
        });
      }

      await tx.section.delete({
        where: {
          id: section.id
        }
      });
    });

    res.status(204).send();
  })
);

export default router;
