import { prisma } from "../lib/prisma";
import { parsePriceToNumber } from "../../../shared/price";

// Keeps the table bounded. Snapshots are only written on change, so this is a lot of
// history in practice.
export const MAX_SNAPSHOTS_PER_ITEM = 365;

// parsePriceToNumber() returns 0 for missing/unparseable input, which would plot as a
// real $0. Null keeps "no comparable price" distinct from "free".
function toPriceNumeric(price: string | null | undefined) {
  const numeric = parsePriceToNumber(price);
  return numeric > 0 ? numeric : null;
}

async function pruneOverflow(itemId: string) {
  const total = await prisma.priceSnapshot.count({ where: { itemId } });
  const overflow = total - MAX_SNAPSHOTS_PER_ITEM;

  if (overflow <= 0) {
    return;
  }

  const oldest = await prisma.priceSnapshot.findMany({
    where: { itemId },
    orderBy: { capturedAt: "asc" },
    take: overflow,
    select: { id: true }
  });

  await prisma.priceSnapshot.deleteMany({
    where: { id: { in: oldest.map((snapshot) => snapshot.id) } }
  });
}

/**
 * Record an observed price/stock reading for an item, skipping the write when nothing
 * changed since the last snapshot.
 *
 * Best-effort by design: refresh runs are not transactional and the bulk loop only
 * catches parser/HTTP errors, so a throw here would abort an entire 25-item batch.
 * History is nice-to-have; refreshing the item is not.
 */
export async function recordPriceSnapshot(
  itemId: string,
  reading: { price: string | null | undefined; inStock: boolean | null | undefined }
) {
  try {
    const priceNumeric = toPriceNumeric(reading.price);
    const inStock = reading.inStock ?? null;

    const latest = await prisma.priceSnapshot.findFirst({
      where: { itemId },
      orderBy: { capturedAt: "desc" },
      select: { priceNumeric: true, inStock: true }
    });

    if (latest && latest.priceNumeric === priceNumeric && latest.inStock === inStock) {
      return null;
    }

    const snapshot = await prisma.priceSnapshot.create({
      data: {
        itemId,
        price: reading.price ?? null,
        priceNumeric,
        inStock
      }
    });

    await pruneOverflow(itemId);

    return snapshot;
  } catch (error) {
    console.error("[priceHistory] failed to record snapshot:", error);
    return null;
  }
}

// Returns oldest-first for charting. A `limit` takes the most *recent* N, so the
// caller gets the tail of the series rather than its ancient head.
export async function listPriceSnapshots(itemId: string, limit?: number) {
  if (!limit) {
    return prisma.priceSnapshot.findMany({
      where: { itemId },
      orderBy: { capturedAt: "asc" }
    });
  }

  const recent = await prisma.priceSnapshot.findMany({
    where: { itemId },
    orderBy: { capturedAt: "desc" },
    take: limit
  });

  return recent.reverse();
}
