import { describe, expect, it, beforeAll, beforeEach, afterAll } from "vitest";
import { hasTestDatabase, prepareTestDatabase, resetDatabase, testPrisma } from "./test-db";

const describeDb = hasTestDatabase ? describe : describe.skip;

describeDb("schema and migrations", () => {
  beforeAll(async () => {
    await prepareTestDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma?.$disconnect();
  });

  it("creates the expected tables", async () => {
    if (!testPrisma) {
      return;
    }

    const rows = await testPrisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('User', 'Closet', 'Section', 'Item', 'Tag')
    `;

    expect(rows.map((row: { table_name: string }) => row.table_name).sort()).toEqual([
      "Closet",
      "Item",
      "Section",
      "Tag",
      "User"
    ]);
  });

  it("cascades closet deletes to sections and items", async () => {
    const user = await testPrisma!.user.create({
      data: {
        email: "schema@example.com",
        name: "Schema User",
        password: "password-hash"
      }
    });
    const closet = await testPrisma!.closet.create({
      data: {
        userId: user.id,
        name: "Main",
        tags: []
      }
    });
    const section = await testPrisma!.section.create({
      data: {
        closetId: closet.id,
        name: "Knitwear",
        tags: []
      }
    });

    await testPrisma!.item.create({
      data: {
        closetId: closet.id,
        sectionId: section.id,
        brand: "Toteme",
        name: "Cardigan",
        season: "F/W",
        tags: [],
        colors: []
      }
    });

    await testPrisma!.closet.delete({
      where: {
        id: closet.id
      }
    });

    const [sectionCount, itemCount] = await Promise.all([
      testPrisma!.section.count(),
      testPrisma!.item.count()
    ]);

    expect(sectionCount).toBe(0);
    expect(itemCount).toBe(0);
  });
});
