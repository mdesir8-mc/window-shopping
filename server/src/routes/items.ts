import { Router } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { parseProductPage, ParserFetchError } from "../services/parser";
import type { AuthenticatedRequest } from "../types";
import { asyncHandler, HttpError } from "../utils/http";
import { serializeItem } from "../utils/serializers";
import { validateSsrfSafeUrl } from "../utils/ssrf";
import {
  optionalBoolean,
  optionalNullableBoolean,
  optionalString,
  optionalStringArray,
  requireString
} from "../utils/validation";

const router = Router();

const parseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again in a minute." }
});

function parsePriceToNumber(value?: string | null) {
  const n = Number((value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function requireRefreshableUrl(value: string | null) {
  if (!value) {
    throw new HttpError(400, "Item has no URL to refresh.");
  }

  const url = await validateSsrfSafeUrl(value);
  return url.toString();
}

async function findOwnedItem(userId: string, itemId: string) {
  return prisma.item.findFirst({
    where: {
      id: itemId,
      closet: {
        userId
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
    }
  });
}

async function ensureClosetAndSection(userId: string, closetId: string, sectionId?: string | null) {
  const closet = await prisma.closet.findFirst({
    where: {
      id: closetId,
      userId
    }
  });

  if (!closet) {
    throw new HttpError(404, "Closet not found.");
  }

  if (!sectionId) {
    return { closet, section: null };
  }

  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      closetId: closet.id
    }
  });

  if (!section) {
    throw new HttpError(400, "sectionId must belong to the target closet.");
  }

  return { closet, section };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = typeof req.query.closet === "string" ? req.query.closet : undefined;
    const sectionId = typeof req.query.section === "string" ? req.query.section : undefined;
    const season = typeof req.query.season === "string" ? req.query.season : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const sort = typeof req.query.sort === "string" ? req.query.sort : "newest";
    const tags =
      typeof req.query.tags === "string"
        ? req.query.tags.split(",").map((entry) => entry.trim()).filter(Boolean)
        : [];

    const items = await prisma.item.findMany({
      where: {
        closet: {
          userId: request.user.id
        },
        ...(closetId ? { closetId } : {}),
        ...(sectionId ? { sectionId } : {}),
        ...(season ? { season } : {}),
        ...(tags.length > 0 ? { tags: { hasSome: tags } } : {}),
        ...(search
          ? {
              OR: [
                { brand: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { tags: { hasSome: [search] } }
              ]
            }
          : {})
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
      orderBy:
        sort === "oldest"
          ? { addedAt: "asc" }
          : sort === "updated"
            ? { updatedAt: "desc" }
            : { addedAt: "desc" }
    });

    res.json(items.map(serializeItem));
  })
);

router.post(
  "/parse-url",
  parseLimiter,
  asyncHandler(async (req, res) => {
    const rawUrl = requireString(req.body?.url, "url");
    const safeUrl = await validateSsrfSafeUrl(rawUrl);

    try {
      const parsed = await parseProductPage(safeUrl.toString());
      res.json(parsed);
    } catch (error) {
      if (error instanceof ParserFetchError) {
        throw new HttpError(502, error.message);
      }

      throw error;
    }
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const closetId = requireString(req.body?.closetId, "closetId");
    const brand = requireString(req.body?.brand, "brand");
    const name = requireString(req.body?.name, "name");
    const season = requireString(req.body?.season, "season");
    const sectionId =
      req.body?.sectionId === undefined ? undefined : optionalString(req.body.sectionId);

    await ensureClosetAndSection(request.user.id, closetId, sectionId ?? null);

    const item = await prisma.item.create({
      data: {
        closetId,
        sectionId: sectionId ?? null,
        brand,
        name,
        price: optionalString(req.body?.price),
        originalPrice: optionalString(req.body?.originalPrice),
        currency: optionalString(req.body?.currency),
        source: optionalString(req.body?.source),
        url: optionalString(req.body?.url),
        season,
        tags: optionalStringArray(req.body?.tags, "tags") ?? [],
        colors: optionalStringArray(req.body?.colors, "colors") ?? [],
        description: optionalString(req.body?.description),
        imageUrl: optionalString(req.body?.imageUrl),
        favorited: optionalBoolean(req.body?.favorited, "favorited") ?? false,
        lastCheckedAt: optionalString(req.body?.url) ? new Date() : null,
        inStock: optionalNullableBoolean(req.body?.inStock, "inStock") ?? null
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
      }
    });

    res.status(201).json(serializeItem(item));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const itemId = requireString(req.params.id, "id");
    const item = await findOwnedItem(request.user.id, itemId);

    if (!item) {
      throw new HttpError(404, "Item not found.");
    }

    res.json(serializeItem(item));
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const itemId = requireString(req.params.id, "id");
    const existing = await findOwnedItem(request.user.id, itemId);

    if (!existing) {
      throw new HttpError(404, "Item not found.");
    }

    const nextClosetId =
      req.body?.closetId !== undefined ? requireString(req.body.closetId, "closetId") : existing.closetId;
    const nextSectionId =
      req.body?.sectionId !== undefined ? optionalString(req.body.sectionId) : existing.sectionId;

    if (req.body?.closetId !== undefined || req.body?.sectionId !== undefined) {
      await ensureClosetAndSection(request.user.id, nextClosetId, nextSectionId);
    }

    const item = await prisma.item.update({
      where: {
        id: existing.id
      },
      data: {
        ...(req.body?.closetId !== undefined ? { closetId: nextClosetId } : {}),
        ...(req.body?.sectionId !== undefined ? { sectionId: nextSectionId } : {}),
        ...(req.body?.brand !== undefined ? { brand: requireString(req.body.brand, "brand") } : {}),
        ...(req.body?.name !== undefined ? { name: requireString(req.body.name, "name") } : {}),
        ...(req.body?.price !== undefined ? { price: optionalString(req.body.price) } : {}),
        ...(req.body?.originalPrice !== undefined ? { originalPrice: optionalString(req.body.originalPrice) } : {}),
        ...(req.body?.currency !== undefined ? { currency: optionalString(req.body.currency) } : {}),
        ...(req.body?.source !== undefined ? { source: optionalString(req.body.source) } : {}),
        ...(req.body?.url !== undefined ? { url: optionalString(req.body.url) } : {}),
        ...(req.body?.season !== undefined ? { season: requireString(req.body.season, "season") } : {}),
        ...(req.body?.tags !== undefined ? { tags: optionalStringArray(req.body.tags, "tags") ?? [] } : {}),
        ...(req.body?.colors !== undefined ? { colors: optionalStringArray(req.body.colors, "colors") ?? [] } : {}),
        ...(req.body?.description !== undefined ? { description: optionalString(req.body.description) } : {}),
        ...(req.body?.imageUrl !== undefined ? { imageUrl: optionalString(req.body.imageUrl) } : {}),
        ...(req.body?.favorited !== undefined ? { favorited: optionalBoolean(req.body.favorited, "favorited") } : {}),
        ...(req.body?.inStock !== undefined ? { inStock: optionalNullableBoolean(req.body.inStock, "inStock") } : {})
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
      }
    });

    res.json(serializeItem(item));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const itemId = requireString(req.params.id, "id");
    const item = await findOwnedItem(request.user.id, itemId);

    if (!item) {
      throw new HttpError(404, "Item not found.");
    }

    await prisma.item.delete({
      where: {
        id: item.id
      }
    });

    res.status(204).send();
  })
);

router.post(
  "/:id/refresh",
  parseLimiter,
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const itemId = requireString(req.params.id, "id");
    const item = await findOwnedItem(request.user.id, itemId);

    if (!item) {
      throw new HttpError(404, "Item not found.");
    }

    const url = await requireRefreshableUrl(item.url);
    let parsed;

    try {
      parsed = await parseProductPage(url);
    } catch (error) {
      if (error instanceof ParserFetchError) {
        throw new HttpError(502, error.message);
      }

      throw error;
    }

    const prevPrice = parsePriceToNumber(item.price);
    const newPrice = parsePriceToNumber(parsed.price);
    const onSale = prevPrice > 0 && newPrice > 0
      ? newPrice <= prevPrice * 0.9
      : item.onSale;

    const updated = await prisma.item.update({
      where: {
        id: item.id
      },
      data: {
        price: parsed.price,
        originalPrice: parsed.originalPrice,
        inStock: parsed.inStock,
        onSale,
        lastCheckedAt: new Date()
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
      }
    });

    res.json(serializeItem(updated));
  })
);

router.post(
  "/:id/favorite",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const itemId = requireString(req.params.id, "id");
    const item = await findOwnedItem(request.user.id, itemId);

    if (!item) {
      throw new HttpError(404, "Item not found.");
    }

    const updated = await prisma.item.update({
      where: {
        id: item.id
      },
      data: {
        favorited: !item.favorited
      }
    });

    res.json({ favorited: updated.favorited });
  })
);

router.post(
  "/:id/move",
  asyncHandler(async (req, res) => {
    const request = req as AuthenticatedRequest;
    const itemId = requireString(req.params.id, "id");
    const item = await findOwnedItem(request.user.id, itemId);

    if (!item) {
      throw new HttpError(404, "Item not found.");
    }

    const closetId = requireString(req.body?.closetId, "closetId");
    const sectionId =
      req.body?.sectionId === undefined ? null : optionalString(req.body.sectionId);

    await ensureClosetAndSection(request.user.id, closetId, sectionId);

    const updated = await prisma.item.update({
      where: {
        id: item.id
      },
      data: {
        closetId,
        sectionId
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
      }
    });

    res.json(serializeItem(updated));
  })
);

export default router;
