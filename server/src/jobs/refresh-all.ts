import "dotenv/config";
import { prisma } from "../lib/prisma";
import { closeBrowser } from "../services/browser";
import { refreshAllUsers } from "../services/refresh-all";

/**
 * CLI entrypoint for the daily refresh. Runs once and exits — no in-process timer.
 * The shared refresh logic lives in `services/refresh-all.ts` so the HTTP cron route
 * (`POST /api/cron/refresh`) can reuse it. This process owns browser/prisma teardown.
 */
async function main() {
  await refreshAllUsers();
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
