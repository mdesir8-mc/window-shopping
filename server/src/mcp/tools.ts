import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http";
import { ensureClosetAndSection, findOwnedCloset, findOwnedItem } from "../utils/ownership";
import {
  serializeCloset,
  serializeItem,
  serializePriceSnapshot,
  serializeSection,
  serializeTag
} from "../utils/serializers";
import { generateShareToken } from "../utils/shareToken";
import { validateSsrfSafeUrl } from "../utils/ssrf";
import { getAppBaseUrl } from "../services/email";
import { parseProductPage, ParserFetchError } from "../services/parser";
import { refreshItemRecord } from "../services/refresh";
import { listPriceSnapshots, recordPriceSnapshot } from "../services/priceHistory";
import { isMarkedDown, parsePriceToNumber } from "../../../shared/price";
import { SCOPE_CLOSETS_READ, SCOPE_CLOSETS_WRITE, SCOPE_PROFILE } from "../oauth/config";

export interface ToolContext {
  userId: string;
  scopes: string[];
}

/**
 * Scraping a product page can take a long while — a queued headless render plus a
 * raw-fetch fallback runs to ~32s, and Amazon's retry loop is worse. Cap it so a
 * tool call returns an actionable message instead of hanging the conversation.
 */
const PARSE_TIMEOUT_MS = 55_000;

const CLOSET_INCLUDE = {
  sections: {
    orderBy: { order: "asc" as const },
    include: { _count: { select: { items: true } } }
  },
  _count: { select: { items: true } }
};

const ITEM_INCLUDE = {
  closet: { select: { id: true, name: true } },
  section: { select: { id: true, name: true } }
};

function ok(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function fail(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new HttpError(504, label)), ms);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * Tool handlers reach Prisma directly, so every thrown HttpError (a 404 from the
 * shared ownership helpers, a 400 from validation) has to become a tool error
 * rather than escaping into the transport.
 */
function guard<Args>(handler: (args: Args) => Promise<unknown>) {
  return async (args: Args) => {
    try {
      return ok(await handler(args));
    } catch (error) {
      if (error instanceof HttpError) {
        return fail(error.message);
      }

      if (error instanceof ParserFetchError) {
        return fail(`Could not load that page: ${error.message}`);
      }

      // Anything else is unexpected (a Prisma error, a bug). Those messages can
      // carry schema and query detail, so they go to the log, not to the client.
      console.error("MCP tool failed", error);
      return fail("Something went wrong handling that request.");
    }
  };
}

function targetPriceFields(targetPrice: string | null | undefined) {
  if (targetPrice === undefined) {
    return {};
  }

  if (targetPrice === null || targetPrice === "") {
    return { targetPrice: null, targetPriceNumeric: null };
  }

  const numeric = parsePriceToNumber(targetPrice);

  if (numeric <= 0) {
    throw new HttpError(400, "targetPrice must be a positive price.");
  }

  return { targetPrice, targetPriceNumeric: numeric };
}

async function requireOwnedItem(userId: string, itemId: string) {
  const item = await findOwnedItem(userId, itemId);

  if (!item) {
    throw new HttpError(404, "Item not found.");
  }

  return item;
}

async function requireOwnedCloset(userId: string, closetId: string) {
  const closet = await findOwnedCloset(userId, closetId);

  if (!closet) {
    throw new HttpError(404, "Closet not found.");
  }

  return closet;
}

// ---------------------------------------------------------------------------

export function registerTools(server: McpServer, context: ToolContext): void {
  const { userId, scopes } = context;
  const canRead = scopes.includes(SCOPE_CLOSETS_READ);
  const canWrite = scopes.includes(SCOPE_CLOSETS_WRITE);

  if (scopes.includes(SCOPE_PROFILE)) {
    server.registerTool(
      "get_profile",
      {
        title: "Get profile",
        description: "Get the signed-in user's name, email, plan, and total item count.",
        inputSchema: {},
        annotations: { readOnlyHint: true }
      },
      guard(async () => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, plan: true, emailNotifications: true }
        });

        if (!user) {
          throw new HttpError(404, "User not found.");
        }

        const itemCount = await prisma.item.count({ where: { closet: { userId } } });
        return { ...user, itemCount };
      })
    );
  }

  // -------------------------------------------------------------------------
  // Read tools
  // -------------------------------------------------------------------------

  if (canRead) {
    server.registerTool(
      "list_closets",
      {
        title: "List closets",
        description:
          "List all of the user's closets, oldest first, each with its sections and item counts. Start here to find a closet id.",
        inputSchema: {},
        annotations: { readOnlyHint: true }
      },
      guard(async () => {
        const closets = await prisma.closet.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: CLOSET_INCLUDE
        });

        return closets.map(serializeCloset);
      })
    );

    server.registerTool(
      "get_closet",
      {
        title: "Get closet",
        description: "Get one closet by id, including its sections and item count.",
        inputSchema: { closetId: z.string().describe("The closet id.") },
        annotations: { readOnlyHint: true }
      },
      guard(async ({ closetId }) => serializeCloset(await requireOwnedCloset(userId, closetId)))
    );

    server.registerTool(
      "list_items",
      {
        title: "List items",
        description:
          "List the user's items with optional filters. Use this to search a wishlist by brand, name, tag, season, or sale/stock status.",
        inputSchema: {
          closetId: z.string().optional().describe("Only items in this closet."),
          sectionId: z.string().optional().describe("Only items in this section."),
          season: z.string().optional(),
          search: z.string().optional().describe("Case-insensitive match on brand or name."),
          tags: z.array(z.string()).optional().describe("Items carrying any of these tags."),
          onSale: z.boolean().optional(),
          inStock: z.boolean().optional(),
          sort: z
            .enum(["newest", "oldest", "updated", "price-asc", "price-desc"])
            .optional()
            .describe("Defaults to newest."),
          limit: z.number().int().min(1).max(200).optional().describe("Defaults to 50.")
        },
        annotations: { readOnlyHint: true }
      },
      guard(async (args) => {
        const items = await prisma.item.findMany({
          where: {
            closet: { userId },
            ...(args.closetId ? { closetId: args.closetId } : {}),
            ...(args.sectionId ? { sectionId: args.sectionId } : {}),
            ...(args.season ? { season: args.season } : {}),
            ...(args.onSale !== undefined ? { onSale: args.onSale } : {}),
            ...(args.inStock !== undefined ? { inStock: args.inStock } : {}),
            ...(args.tags?.length ? { tags: { hasSome: args.tags } } : {}),
            ...(args.search
              ? {
                  OR: [
                    { brand: { contains: args.search, mode: "insensitive" as const } },
                    { name: { contains: args.search, mode: "insensitive" as const } }
                  ]
                }
              : {})
          },
          include: ITEM_INCLUDE,
          orderBy:
            args.sort === "oldest"
              ? { addedAt: "asc" }
              : args.sort === "updated"
                ? { updatedAt: "desc" }
                : { addedAt: "desc" }
        });

        const serialized = items.map(serializeItem);

        // Prices are strings on the model, so the two price sorts happen here for
        // the same reason they do in the HTTP route.
        if (args.sort === "price-asc" || args.sort === "price-desc") {
          const direction = args.sort === "price-asc" ? 1 : -1;
          serialized.sort(
            (a, b) => direction * (parsePriceToNumber(a.price ?? undefined) - parsePriceToNumber(b.price ?? undefined))
          );
        }

        return serialized.slice(0, args.limit ?? 50);
      })
    );

    server.registerTool(
      "get_item",
      {
        title: "Get item",
        description: "Get one item by id with its closet and section.",
        inputSchema: { itemId: z.string() },
        annotations: { readOnlyHint: true }
      },
      guard(async ({ itemId }) => serializeItem(await requireOwnedItem(userId, itemId)))
    );

    server.registerTool(
      "get_price_history",
      {
        title: "Get price history",
        description:
          "Get recorded price and stock changes for an item, oldest first. Snapshots are only written when an observed price or stock value actually changes.",
        inputSchema: {
          itemId: z.string(),
          limit: z.number().int().min(1).max(365).optional().describe("Most recent N snapshots.")
        },
        annotations: { readOnlyHint: true }
      },
      guard(async ({ itemId, limit }) => {
        await requireOwnedItem(userId, itemId);
        const snapshots = await listPriceSnapshots(itemId, limit);
        return snapshots.map(serializePriceSnapshot);
      })
    );

    server.registerTool(
      "list_tags",
      {
        title: "List tags",
        description: "List the user's tags with the number of items carrying each.",
        inputSchema: {},
        annotations: { readOnlyHint: true }
      },
      guard(async () => {
        const tags = await prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" } });

        return Promise.all(
          tags.map(async (tag) =>
            serializeTag(tag, await prisma.item.count({ where: { closet: { userId }, tags: { has: tag.name } } }))
          )
        );
      })
    );
  }

  // -------------------------------------------------------------------------
  // Write tools
  // -------------------------------------------------------------------------

  if (!canWrite) {
    return;
  }

  server.registerTool(
    "create_closet",
    {
      title: "Create closet",
      description: "Create a new closet.",
      inputSchema: {
        name: z.string().min(1),
        subtitle: z.string().optional(),
        accent: z.string().optional().describe("A hex colour used as the closet's accent."),
        season: z.string().optional(),
        tags: z.array(z.string()).optional()
      }
    },
    guard(async (args) => {
      const closet = await prisma.closet.create({
        data: {
          userId,
          name: args.name,
          subtitle: args.subtitle ?? null,
          accent: args.accent ?? null,
          season: args.season ?? null,
          tags: args.tags ?? []
        },
        include: CLOSET_INCLUDE
      });

      return serializeCloset(closet);
    })
  );

  server.registerTool(
    "update_closet",
    {
      title: "Update closet",
      description: "Rename or restyle a closet. Only the fields you pass are changed.",
      inputSchema: {
        closetId: z.string(),
        name: z.string().min(1).optional(),
        subtitle: z.string().nullable().optional(),
        accent: z.string().nullable().optional(),
        season: z.string().nullable().optional(),
        tags: z.array(z.string()).optional()
      }
    },
    guard(async ({ closetId, ...changes }) => {
      await requireOwnedCloset(userId, closetId);

      const closet = await prisma.closet.update({
        where: { id: closetId },
        data: {
          ...(changes.name !== undefined ? { name: changes.name } : {}),
          ...(changes.subtitle !== undefined ? { subtitle: changes.subtitle } : {}),
          ...(changes.accent !== undefined ? { accent: changes.accent } : {}),
          ...(changes.season !== undefined ? { season: changes.season } : {}),
          ...(changes.tags !== undefined ? { tags: changes.tags } : {})
        },
        include: CLOSET_INCLUDE
      });

      return serializeCloset(closet);
    })
  );

  server.registerTool(
    "delete_closet",
    {
      title: "Delete closet",
      description:
        "Permanently delete a closet along with every section and item inside it. This cannot be undone.",
      inputSchema: { closetId: z.string() },
      annotations: { destructiveHint: true }
    },
    guard(async ({ closetId }) => {
      const closet = await requireOwnedCloset(userId, closetId);
      await prisma.closet.delete({ where: { id: closetId } });
      return { deleted: true, closetId, itemsDeleted: closet._count.items };
    })
  );

  server.registerTool(
    "create_section",
    {
      title: "Create section",
      description: "Add a section to a closet. Sections group items inside a closet.",
      inputSchema: { closetId: z.string(), name: z.string().min(1), tags: z.array(z.string()).optional() }
    },
    guard(async ({ closetId, name, tags }) => {
      await requireOwnedCloset(userId, closetId);

      const last = await prisma.section.findFirst({
        where: { closetId },
        orderBy: { order: "desc" },
        select: { order: true }
      });

      const section = await prisma.section.create({
        data: { closetId, name, tags: tags ?? [], order: (last?.order ?? -1) + 1 },
        include: { _count: { select: { items: true } } }
      });

      return serializeSection(section);
    })
  );

  server.registerTool(
    "update_section",
    {
      title: "Update section",
      description: "Rename, retag, or reorder a section.",
      inputSchema: {
        closetId: z.string(),
        sectionId: z.string(),
        name: z.string().min(1).optional(),
        tags: z.array(z.string()).optional(),
        order: z.number().int().optional()
      }
    },
    guard(async ({ closetId, sectionId, ...changes }) => {
      await requireOwnedCloset(userId, closetId);

      const existing = await prisma.section.findFirst({ where: { id: sectionId, closetId } });

      if (!existing) {
        throw new HttpError(404, "Section not found.");
      }

      const section = await prisma.section.update({
        where: { id: sectionId },
        data: {
          ...(changes.name !== undefined ? { name: changes.name } : {}),
          ...(changes.tags !== undefined ? { tags: changes.tags } : {}),
          ...(changes.order !== undefined ? { order: changes.order } : {})
        },
        include: { _count: { select: { items: true } } }
      });

      return serializeSection(section);
    })
  );

  server.registerTool(
    "delete_section",
    {
      title: "Delete section",
      description:
        "Delete a section. Fails if the section still holds items unless deleteItems is true, which also deletes them.",
      inputSchema: { closetId: z.string(), sectionId: z.string(), deleteItems: z.boolean().optional() },
      annotations: { destructiveHint: true }
    },
    guard(async ({ closetId, sectionId, deleteItems }) => {
      await requireOwnedCloset(userId, closetId);

      const section = await prisma.section.findFirst({
        where: { id: sectionId, closetId },
        include: { _count: { select: { items: true } } }
      });

      if (!section) {
        throw new HttpError(404, "Section not found.");
      }

      if (section._count.items > 0 && !deleteItems) {
        throw new HttpError(
          409,
          `Section still holds ${section._count.items} item(s). Pass deleteItems: true to delete them too.`
        );
      }

      if (deleteItems) {
        await prisma.item.deleteMany({ where: { sectionId } });
      }

      await prisma.section.delete({ where: { id: sectionId } });
      return { deleted: true, sectionId, itemsDeleted: deleteItems ? section._count.items : 0 };
    })
  );

  server.registerTool(
    "create_item",
    {
      title: "Create item",
      description:
        "Add an item to a closet from details you already have. To add from a product page URL, use add_item_from_url instead.",
      inputSchema: {
        closetId: z.string(),
        brand: z.string().min(1),
        name: z.string().min(1),
        season: z.string().min(1).describe('For example "Fall" or "All Season".'),
        sectionId: z.string().optional(),
        price: z.string().optional(),
        originalPrice: z.string().optional(),
        targetPrice: z.string().optional().describe("Notify the user when the price drops to this."),
        currency: z.string().optional(),
        url: z.string().optional(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
        note: z.string().optional(),
        tags: z.array(z.string()).optional(),
        colors: z.array(z.string()).optional(),
        source: z.string().optional()
      }
    },
    guard(async ({ closetId, sectionId, targetPrice, ...rest }) => {
      await ensureClosetAndSection(userId, closetId, sectionId);

      const item = await prisma.item.create({
        data: {
          closetId,
          sectionId: sectionId ?? null,
          brand: rest.brand,
          name: rest.name,
          season: rest.season,
          price: rest.price ?? null,
          originalPrice: rest.originalPrice ?? null,
          // onSale is server-derived and is the single predicate every surface
          // reads (badge, ON SALE stat, ?onSale filter, Home count). Items added
          // through MCP have to derive it exactly as POST /api/items does, or
          // they'd be invisible to the on-sale filter.
          onSale: isMarkedDown(rest.price, rest.originalPrice),
          currency: rest.currency ?? null,
          url: rest.url ?? null,
          imageUrl: rest.imageUrl ?? null,
          description: rest.description ?? null,
          note: rest.note ?? null,
          source: rest.source ?? null,
          tags: rest.tags ?? [],
          colors: rest.colors ?? [],
          ...targetPriceFields(targetPrice)
        },
        include: ITEM_INCLUDE
      });

      await recordPriceSnapshot(item.id, { price: item.price, inStock: item.inStock });
      return serializeItem(item);
    })
  );

  server.registerTool(
    "add_item_from_url",
    {
      title: "Add item from URL",
      description:
        "Scrape a product page and add it to a closet in one step. This can take up to a minute on sites that need a full browser render — call it once and wait rather than retrying.",
      inputSchema: {
        closetId: z.string(),
        url: z.string().describe("The product page URL."),
        sectionId: z.string().optional(),
        season: z.string().optional().describe("Defaults to the season inferred from the page."),
        targetPrice: z.string().optional(),
        note: z.string().optional()
      }
    },
    guard(async ({ closetId, url, sectionId, season, targetPrice, note }) => {
      await ensureClosetAndSection(userId, closetId, sectionId);
      await validateSsrfSafeUrl(url);

      const parsed = await withTimeout(
        parseProductPage(url),
        PARSE_TIMEOUT_MS,
        "That page took too long to load. Try again, or add the item manually with create_item."
      );

      if (!parsed.name && !parsed.brand) {
        throw new HttpError(
          422,
          "Could not read a product from that page. Add the item manually with create_item."
        );
      }

      const item = await prisma.item.create({
        data: {
          closetId,
          sectionId: sectionId ?? null,
          brand: parsed.brand ?? "Unknown",
          name: parsed.name ?? "Untitled item",
          season: season ?? parsed.suggestedSeason ?? "All Season",
          price: parsed.price ?? null,
          originalPrice: parsed.originalPrice ?? null,
          onSale: isMarkedDown(parsed.price, parsed.originalPrice),
          currency: parsed.currency ?? null,
          url,
          imageUrl: parsed.imageUrl ?? null,
          description: parsed.description ?? null,
          note: note ?? null,
          source: parsed.source ?? null,
          tags: parsed.suggestedTags ?? [],
          colors: parsed.colors ?? [],
          inStock: parsed.inStock ?? null,
          lastCheckedAt: new Date(),
          ...targetPriceFields(targetPrice)
        },
        include: ITEM_INCLUDE
      });

      await recordPriceSnapshot(item.id, { price: item.price, inStock: item.inStock });
      return serializeItem(item);
    })
  );

  server.registerTool(
    "update_item",
    {
      title: "Update item",
      description: "Change fields on an item. Only the fields you pass are changed.",
      inputSchema: {
        itemId: z.string(),
        brand: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        season: z.string().min(1).optional(),
        price: z.string().nullable().optional(),
        originalPrice: z.string().nullable().optional(),
        targetPrice: z.string().nullable().optional().describe("Pass null to clear the target price."),
        currency: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        imageUrl: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        note: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        colors: z.array(z.string()).optional(),
        favorited: z.boolean().optional()
      }
    },
    guard(async ({ itemId, targetPrice, ...changes }) => {
      const existing = await requireOwnedItem(userId, itemId);

      const data: Record<string, unknown> = { ...targetPriceFields(targetPrice) };
      for (const [key, value] of Object.entries(changes)) {
        if (value !== undefined) {
          data[key] = value;
        }
      }

      // Re-derive onSale whenever either price moves, matching PATCH /api/items/:id.
      // Unedited fields fall back to what's already stored, so editing one price
      // doesn't compare against a missing counterpart.
      if (changes.price !== undefined || changes.originalPrice !== undefined) {
        const nextPrice = changes.price !== undefined ? changes.price : existing.price;
        const nextOriginalPrice =
          changes.originalPrice !== undefined ? changes.originalPrice : existing.originalPrice;
        data.onSale = isMarkedDown(nextPrice, nextOriginalPrice);
      }

      const item = await prisma.item.update({ where: { id: itemId }, data, include: ITEM_INCLUDE });
      return serializeItem(item);
    })
  );

  server.registerTool(
    "move_item",
    {
      title: "Move item",
      description: "Move an item to a different closet, and optionally a section within it.",
      inputSchema: {
        itemId: z.string(),
        closetId: z.string(),
        sectionId: z.string().nullable().optional().describe("Pass null to clear the section.")
      }
    },
    guard(async ({ itemId, closetId, sectionId }) => {
      await requireOwnedItem(userId, itemId);
      await ensureClosetAndSection(userId, closetId, sectionId);

      const item = await prisma.item.update({
        where: { id: itemId },
        data: { closetId, sectionId: sectionId ?? null },
        include: ITEM_INCLUDE
      });

      return serializeItem(item);
    })
  );

  server.registerTool(
    "delete_item",
    {
      title: "Delete item",
      description: "Permanently delete an item and its price history. This cannot be undone.",
      inputSchema: { itemId: z.string() },
      annotations: { destructiveHint: true }
    },
    guard(async ({ itemId }) => {
      await requireOwnedItem(userId, itemId);
      await prisma.item.delete({ where: { id: itemId } });
      return { deleted: true, itemId };
    })
  );

  server.registerTool(
    "toggle_favorite",
    {
      title: "Toggle favorite",
      description: "Flip an item's favorited flag and return the new value.",
      inputSchema: { itemId: z.string() }
    },
    guard(async ({ itemId }) => {
      const item = await requireOwnedItem(userId, itemId);
      const updated = await prisma.item.update({
        where: { id: itemId },
        data: { favorited: !item.favorited }
      });

      return { itemId, favorited: updated.favorited };
    })
  );

  server.registerTool(
    "refresh_item",
    {
      title: "Refresh item",
      description:
        "Re-scrape an item's product page to update its price and stock. Can take up to a minute; the item must have a url.",
      inputSchema: { itemId: z.string() }
    },
    guard(async ({ itemId }) => {
      const item = await requireOwnedItem(userId, itemId);

      if (!item.url) {
        throw new HttpError(400, "This item has no url to refresh from.");
      }

      const result = await withTimeout(
        refreshItemRecord(item),
        PARSE_TIMEOUT_MS,
        "That page took too long to load. Try again later."
      );

      return {
        item: serializeItem(result.updated),
        previousPrice: result.prevPrice,
        newPrice: result.newPrice,
        previousInStock: result.prevInStock
      };
    })
  );

  server.registerTool(
    "set_share_link",
    {
      title: "Set closet share link",
      description:
        "Turn a closet's public read-only share link on or off. Anyone with the link can view the closet.",
      inputSchema: { closetId: z.string(), enabled: z.boolean() }
    },
    guard(async ({ closetId, enabled }) => {
      const closet = await requireOwnedCloset(userId, closetId);

      if (!enabled) {
        await prisma.closet.update({ where: { id: closetId }, data: { shareToken: null } });
        return { closetId, enabled: false, shareUrl: null };
      }

      // Idempotent, matching POST /api/closets/:id/share: an existing link is
      // reused rather than rotated, so previously shared URLs keep working.
      const shareToken = closet.shareToken ?? generateShareToken();

      if (!closet.shareToken) {
        await prisma.closet.update({ where: { id: closetId }, data: { shareToken } });
      }

      return {
        closetId,
        enabled: true,
        shareUrl: `${getAppBaseUrl().replace(/\/+$/, "")}/share/${shareToken}`
      };
    })
  );

  server.registerTool(
    "create_tag",
    {
      title: "Create tag",
      description: "Create a tag with an optional colour. Tags are applied to items and closets by name.",
      inputSchema: { name: z.string().min(1), color: z.string().optional() }
    },
    guard(async ({ name, color }) => {
      const existing = await prisma.tag.findUnique({ where: { userId_name: { userId, name } } });

      if (existing) {
        throw new HttpError(409, `A tag named "${name}" already exists.`);
      }

      return serializeTag(await prisma.tag.create({ data: { userId, name, color: color ?? null } }));
    })
  );

  server.registerTool(
    "update_tag",
    {
      title: "Update tag colour",
      description: "Change a tag's colour. Tags cannot be renamed.",
      inputSchema: { name: z.string().min(1), color: z.string().nullable() }
    },
    guard(async ({ name, color }) => {
      const existing = await prisma.tag.findUnique({ where: { userId_name: { userId, name } } });

      if (!existing) {
        throw new HttpError(404, "Tag not found.");
      }

      return serializeTag(await prisma.tag.update({ where: { id: existing.id }, data: { color } }));
    })
  );

  server.registerTool(
    "delete_tag",
    {
      title: "Delete tag",
      description:
        "Delete a tag and strip it from every closet, section, and item that carries it. This cannot be undone.",
      inputSchema: { name: z.string().min(1) },
      annotations: { destructiveHint: true }
    },
    guard(async ({ name }) => {
      const existing = await prisma.tag.findUnique({ where: { userId_name: { userId, name } } });

      if (!existing) {
        throw new HttpError(404, "Tag not found.");
      }

      await prisma.$transaction(async (tx) => {
        const closets = await tx.closet.findMany({ where: { userId, tags: { has: name } }, select: { id: true, tags: true } });
        for (const closet of closets) {
          await tx.closet.update({ where: { id: closet.id }, data: { tags: closet.tags.filter((tag) => tag !== name) } });
        }

        const sections = await tx.section.findMany({
          where: { closet: { userId }, tags: { has: name } },
          select: { id: true, tags: true }
        });
        for (const section of sections) {
          await tx.section.update({ where: { id: section.id }, data: { tags: section.tags.filter((tag) => tag !== name) } });
        }

        const items = await tx.item.findMany({
          where: { closet: { userId }, tags: { has: name } },
          select: { id: true, tags: true }
        });
        for (const item of items) {
          await tx.item.update({ where: { id: item.id }, data: { tags: item.tags.filter((tag) => tag !== name) } });
        }

        await tx.tag.delete({ where: { id: existing.id } });
      });

      return { deleted: true, name };
    })
  );
}
