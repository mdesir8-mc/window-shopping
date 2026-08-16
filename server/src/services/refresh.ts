import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http";
import { validateSsrfSafeUrl } from "../utils/ssrf";
import { parseProductPage, ParserFetchError } from "./parser";
import { EmailSendError, getAppBaseUrl, sendEmail, type SendEmailResult } from "./email";
import {
  priceDropEmail,
  type BackInStockEntry,
  type OutOfStockEntry,
  type PriceDropEntry,
  type TargetPriceEntry
} from "./email-templates";
import { recordEmailLog } from "./email-log";
import { recordPriceSnapshot } from "./priceHistory";
import { FRESHNESS_THRESHOLD_MS } from "../../../shared/staleness";
import { isMarkedDown, parsePriceToNumber } from "../../../shared/price";

const BULK_REFRESH_LIMIT = 25;

async function requireRefreshableUrl(value: string | null) {
  if (!value) {
    throw new HttpError(400, "Item has no URL to refresh.");
  }

  const url = await validateSsrfSafeUrl(value);
  return url.toString();
}

type RefreshableItem = {
  id: string;
  url: string | null;
  price: string | null;
  originalPrice: string | null;
  targetPrice: string | null;
  targetPriceNumeric: number | null;
  onSale: boolean;
  inStock: boolean | null;
};

function reachedTargetPrice(prevPrice: number, newPrice: number, targetPriceNumeric: number | null) {
  return Boolean(targetPriceNumeric && newPrice > 0 && newPrice <= targetPriceNumeric && (prevPrice <= 0 || prevPrice > targetPriceNumeric));
}

export async function refreshItemRecord(item: RefreshableItem) {
  const url = await requireRefreshableUrl(item.url);
  const parsed = await parseProductPage(url);

  const prevPrice = parsePriceToNumber(item.price);
  const newPrice = parsePriceToNumber(parsed.price);

  // `onSale` is derived, never heuristic: it is always `price < originalPrice`. To keep a
  // refresh-detected drop visible under that single predicate, fall back to the highest
  // price we've seen when the retailer isn't advertising a list price of its own. The flag
  // then self-clears — if the price recovers to the carried-forward original, isMarkedDown
  // goes false on its own.
  const droppedVsPrev = prevPrice > 0 && newPrice > 0 && newPrice < prevPrice;
  const originalPrice = parsed.originalPrice ?? (droppedVsPrev ? item.price : item.originalPrice);
  const onSale = isMarkedDown(parsed.price, originalPrice);

  const updated = await prisma.item.update({
    where: {
      id: item.id
    },
    data: {
      price: parsed.price,
      originalPrice,
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

  // Best-effort; never let a history write fail the refresh itself. Note prevPrice above
  // comes from the item row (which manual PATCH edits touch), while the snapshot dedup
  // compares against the last *snapshot* — the two "previous" values can legitimately
  // differ.
  await recordPriceSnapshot(item.id, { price: parsed.price, inStock: parsed.inStock });

  return { updated, prevPrice, newPrice, prevInStock: item.inStock };
}

export type RefreshStaleSummary = {
  checked: number;
  refreshed: number;
  priceDrops: number;
  targetPriceHits: number;
  outOfStock: number;
  backInStock: number;
  failed: number;
};

/**
 * Refresh a single user's stale, URL-backed items (up to BULK_REFRESH_LIMIT). Collects
 * genuine price drops and out-of-stock *transitions* and, if the user has email
 * notifications enabled, sends one digest email for the run. Shared by the manual
 * `POST /api/items/refresh-stale` route and the scheduled refresh-all job.
 */
export async function refreshStaleItemsForUser(userId: string): Promise<RefreshStaleSummary> {
  const threshold = new Date(Date.now() - FRESHNESS_THRESHOLD_MS);

  const candidates = await prisma.item.findMany({
    where: {
      closet: { userId },
      url: { not: null },
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: threshold } }]
    },
    select: {
      id: true,
      url: true,
      price: true,
      originalPrice: true,
      targetPrice: true,
      targetPriceNumeric: true,
      onSale: true,
      inStock: true,
      brand: true,
      name: true,
      closet: { select: { name: true } }
    },
    orderBy: {
      lastCheckedAt: { sort: "asc", nulls: "first" }
    }
  });

  const stale = candidates
    .filter((item) => /^https?:\/\//i.test(item.url ?? ""))
    .slice(0, BULK_REFRESH_LIMIT);

  let refreshed = 0;
  let priceDrops = 0;
  let targetPriceHits = 0;
  let outOfStock = 0;
  let backInStock = 0;
  let failed = 0;

  const drops: PriceDropEntry[] = [];
  const targetHits: TargetPriceEntry[] = [];
  const oosTransitions: OutOfStockEntry[] = [];
  const backInStockTransitions: BackInStockEntry[] = [];

  for (const item of stale) {
    try {
      const { updated, prevPrice, newPrice, prevInStock } = await refreshItemRecord(item);
      refreshed += 1;

      if (prevPrice > 0 && newPrice > 0 && newPrice < prevPrice) {
        priceDrops += 1;
        drops.push({
          brand: item.brand,
          name: item.name,
          oldPrice: item.price ?? "",
          newPrice: updated.price ?? "",
          url: item.url,
          closetName: item.closet.name
        });
      }

      if (reachedTargetPrice(prevPrice, newPrice, item.targetPriceNumeric)) {
        targetPriceHits += 1;
        targetHits.push({
          brand: item.brand,
          name: item.name,
          targetPrice: item.targetPrice ?? String(item.targetPriceNumeric),
          currentPrice: updated.price ?? String(newPrice),
          url: item.url,
          closetName: item.closet.name
        });
      }

      if (updated.inStock === false) {
        outOfStock += 1;
        if (prevInStock !== false) {
          oosTransitions.push({
            brand: item.brand,
            name: item.name,
            url: item.url,
            closetName: item.closet.name
          });
        }
      }

      // Symmetric-but-not-identical with the OOS gate above. OOS fires on `null → false`
      // (first check discovers OOS). Back-in-stock is strict `false → true`: without a
      // prior OOS event there's nothing to "come back" from, so `null → true` is silent.
      if (prevInStock === false && updated.inStock === true) {
        backInStock += 1;
        backInStockTransitions.push({
          brand: item.brand,
          name: item.name,
          url: item.url,
          closetName: item.closet.name
        });
      }
    } catch (error) {
      if (error instanceof ParserFetchError || error instanceof HttpError) {
        failed += 1;
        continue;
      }

      throw error;
    }
  }

  if (drops.length > 0 || targetHits.length > 0 || oosTransitions.length > 0 || backInStockTransitions.length > 0) {
    await notifyPriceChanges(userId, drops, targetHits, oosTransitions, backInStockTransitions);
  }

  return { checked: stale.length, refreshed, priceDrops, targetPriceHits, outOfStock, backInStock, failed };
}

async function notifyPriceChanges(
  userId: string,
  drops: PriceDropEntry[],
  targetHits: TargetPriceEntry[],
  outOfStock: OutOfStockEntry[],
  backInStock: BackInStockEntry[]
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailNotifications: true }
  });

  if (!user || !user.emailNotifications) {
    return;
  }

  const rendered = priceDropEmail({ drops, targetHits, outOfStock, backInStock, baseUrl: getAppBaseUrl() });

  let result: SendEmailResult | undefined;
  let sendError: unknown;
  try {
    result = await sendEmail({ to: user.email, ...rendered });
  } catch (error) {
    sendError = error;
    if (!(error instanceof EmailSendError)) {
      console.error("[refresh] unexpected error sending price-drop email:", error);
    }
  }

  await recordEmailLog({
    userId,
    type: "price_drop",
    recipient: user.email,
    subject: rendered.subject,
    result,
    error: sendError
  });
}
