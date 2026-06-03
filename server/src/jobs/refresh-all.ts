import "dotenv/config";
import { prisma } from "../lib/prisma";
import { closeBrowser, launchBrowser } from "../services/browser";
import { refreshStaleItemsForUser } from "../services/refresh";

/**
 * Scheduled entrypoint (invoked by Railway Cron). Refreshes every user's stale,
 * URL-backed items and emails each a digest of price drops / newly out-of-stock items
 * (gated on their notification preference). Runs once and exits — no in-process timer.
 */
async function main() {
  await launchBrowser().catch((error) => {
    console.warn("[refresh-all] browser warmup failed, continuing:", error);
  });

  const users = await prisma.user.findMany({
    where: { closets: { some: { items: { some: { url: { not: null } } } } } },
    select: { id: true }
  });

  console.log(`[refresh-all] processing ${users.length} user(s) with URL-backed items`);

  let totalRefreshed = 0;
  let totalDrops = 0;
  let totalOutOfStock = 0;

  for (const user of users) {
    try {
      const summary = await refreshStaleItemsForUser(user.id);
      totalRefreshed += summary.refreshed;
      totalDrops += summary.priceDrops;
      totalOutOfStock += summary.outOfStock;
    } catch (error) {
      console.error(`[refresh-all] failed for user ${user.id}:`, error);
    }
  }

  console.log(
    `[refresh-all] done: refreshed=${totalRefreshed} priceDrops=${totalDrops} outOfStock=${totalOutOfStock}`
  );
}

main()
  .catch((error) => {
    console.error("[refresh-all] fatal error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeBrowser();
    await prisma.$disconnect();
    process.exit(process.exitCode ?? 0);
  });
