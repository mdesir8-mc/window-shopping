import { prisma } from "../lib/prisma";
import { launchBrowser } from "./browser";
import { refreshStaleItemsForUser } from "./refresh";

export type RefreshAllSummary = {
  users: number;
  refreshed: number;
  priceDrops: number;
  targetPriceHits: number;
  outOfStock: number;
  backInStock: number;
};

/**
 * Refresh every user's stale, URL-backed items and email each a digest (gated on their
 * notification preference). Shared by the CLI job (`jobs/refresh-all.ts`) and the
 * `POST /api/cron/refresh` route.
 *
 * Intentionally does NOT close the browser or disconnect prisma: both are process-wide
 * singletons. The web service reuses them across requests, so teardown is the caller's
 * job — the CLI process does it on exit; the route leaves them running.
 */
export async function refreshAllUsers(): Promise<RefreshAllSummary> {
  await launchBrowser().catch((error) => {
    console.warn("[refresh-all] browser warmup failed, continuing:", error);
  });

  const users = await prisma.user.findMany({
    where: { closets: { some: { items: { some: { url: { not: null } } } } } },
    select: { id: true }
  });

  console.log(`[refresh-all] processing ${users.length} user(s) with URL-backed items`);

  let refreshed = 0;
  let priceDrops = 0;
  let targetPriceHits = 0;
  let outOfStock = 0;
  let backInStock = 0;

  for (const user of users) {
    try {
      const summary = await refreshStaleItemsForUser(user.id);
      refreshed += summary.refreshed;
      priceDrops += summary.priceDrops;
      targetPriceHits += summary.targetPriceHits;
      outOfStock += summary.outOfStock;
      backInStock += summary.backInStock;
    } catch (error) {
      console.error(`[refresh-all] failed for user ${user.id}:`, error);
    }
  }

  console.log(
    `[refresh-all] done: refreshed=${refreshed} priceDrops=${priceDrops} targetPriceHits=${targetPriceHits} outOfStock=${outOfStock} backInStock=${backInStock}`
  );

  return { users: users.length, refreshed, priceDrops, targetPriceHits, outOfStock, backInStock };
}
