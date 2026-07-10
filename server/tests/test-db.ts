import path from "node:path";
import { execFileSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL?.trim() ?? "";
export const hasTestDatabase = TEST_DATABASE_URL.length > 0;

if (hasTestDatabase) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

export const testPrisma = hasTestDatabase
  ? new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL
        }
      }
    })
  : null;

export async function prepareTestDatabase() {
  if (!hasTestDatabase) {
    return;
  }

  execFileSync(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL
      },
      stdio: "pipe"
    }
  );
}

export async function resetDatabase() {
  if (!testPrisma) {
    return;
  }

  await testPrisma.$executeRaw`TRUNCATE TABLE "PriceSnapshot", "Item", "Section", "Closet", "Tag", "User" RESTART IDENTITY CASCADE;`;
}
