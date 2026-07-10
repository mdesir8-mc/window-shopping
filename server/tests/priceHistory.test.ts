import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { hasTestDatabase, prepareTestDatabase, resetDatabase, testPrisma } from "./test-db";
import { parseProductPage } from "../src/services/parser";

vi.mock("../src/services/parser", () => {
  class MockParserFetchError extends Error {}

  return {
    ParserFetchError: MockParserFetchError,
    parseProductPage: vi.fn()
  };
});

// Bypass the real SSRF guard (live DNS) so refresh stays hermetic.
vi.mock("../src/utils/ssrf", () => ({
  validateSsrfSafeUrl: vi.fn(async (rawUrl: string) => new URL(rawUrl))
}));

const describeDb = hasTestDatabase ? describe : describe.skip;
const mockedParseProductPage = vi.mocked(parseProductPage);

function parsed(overrides: Record<string, unknown> = {}) {
  return {
    brand: "Lemaire",
    name: "Jacket",
    price: "$100.00",
    originalPrice: null,
    currency: "USD",
    imageUrl: null,
    description: null,
    inStock: true,
    colors: [],
    suggestedTags: [],
    suggestedSeason: null,
    source: "shop.example.com",
    enrichmentSuccess: null,
    ...overrides
  };
}

describeDb("price history", () => {
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
    process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id";
    await prepareTestDatabase();
    const { createApp } = await import("../src/index");
    request = supertest(createApp());
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase();
  });

  afterAll(async () => {
    await testPrisma?.$disconnect();
  });

  async function registerUser(email: string) {
    const response = await request.post("/api/auth/register").send({
      email,
      name: email.split("@")[0],
      password: "password123"
    });

    return response.body.token as string;
  }

  async function createCloset(token: string) {
    const response = await request
      .post("/api/closets")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Main Wardrobe", tags: [] });

    return response.body;
  }

  async function createItem(token: string, closetId: string, overrides: Record<string, unknown> = {}) {
    const response = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId,
        brand: "Lemaire",
        name: "Jacket",
        season: "Fall",
        price: "$100.00",
        url: "https://shop.example.com/jacket",
        inStock: true,
        tags: [],
        colors: [],
        ...overrides
      });

    return response.body;
  }

  it("records a snapshot when an item is created", async () => {
    const token = await registerUser("history-create@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    const snapshots = await testPrisma!.priceSnapshot.findMany({ where: { itemId: item.id } });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].price).toBe("$100.00");
    expect(snapshots[0].priceNumeric).toBe(100);
    expect(snapshots[0].inStock).toBe(true);
  });

  it("stores a null priceNumeric when the item has no parseable price", async () => {
    const token = await registerUser("history-nullprice@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id, { price: undefined, url: undefined });

    const snapshots = await testPrisma!.priceSnapshot.findMany({ where: { itemId: item.id } });

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].priceNumeric).toBeNull();
  });

  it("records a new snapshot when a refresh changes the price", async () => {
    const token = await registerUser("history-refresh@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    mockedParseProductPage.mockResolvedValueOnce(parsed({ price: "$89.99" }));

    const refreshed = await request
      .post(`/api/items/${item.id}/refresh`)
      .set("Authorization", `Bearer ${token}`);

    expect(refreshed.status).toBe(200);

    const snapshots = await testPrisma!.priceSnapshot.findMany({
      where: { itemId: item.id },
      orderBy: { capturedAt: "asc" }
    });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[1].priceNumeric).toBe(89.99);
  });

  it("does not record a duplicate snapshot when price and stock are unchanged", async () => {
    const token = await registerUser("history-dedup@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    mockedParseProductPage.mockResolvedValueOnce(parsed({ price: "$100.00", inStock: true }));

    const refreshed = await request
      .post(`/api/items/${item.id}/refresh`)
      .set("Authorization", `Bearer ${token}`);

    expect(refreshed.status).toBe(200);

    const snapshots = await testPrisma!.priceSnapshot.findMany({ where: { itemId: item.id } });

    expect(snapshots).toHaveLength(1);
  });

  it("records a snapshot when only stock changes", async () => {
    const token = await registerUser("history-stock@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    mockedParseProductPage.mockResolvedValueOnce(parsed({ price: "$100.00", inStock: false }));

    await request.post(`/api/items/${item.id}/refresh`).set("Authorization", `Bearer ${token}`);

    const snapshots = await testPrisma!.priceSnapshot.findMany({
      where: { itemId: item.id },
      orderBy: { capturedAt: "asc" }
    });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[1].inStock).toBe(false);
  });

  it("prunes the oldest snapshots beyond the retention cap", async () => {
    const { MAX_SNAPSHOTS_PER_ITEM, recordPriceSnapshot } = await import("../src/services/priceHistory");
    const token = await registerUser("history-cap@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    // Creation already wrote one snapshot; drive well past the cap with changing prices.
    for (let index = 1; index <= MAX_SNAPSHOTS_PER_ITEM + 5; index += 1) {
      await recordPriceSnapshot(item.id, { price: `$${index}.00`, inStock: true });
    }

    const snapshots = await testPrisma!.priceSnapshot.findMany({
      where: { itemId: item.id },
      orderBy: { capturedAt: "asc" }
    });

    expect(snapshots).toHaveLength(MAX_SNAPSHOTS_PER_ITEM);
    // The $100.00 creation snapshot and the earliest loop writes should be gone.
    expect(snapshots[snapshots.length - 1].priceNumeric).toBe(MAX_SNAPSHOTS_PER_ITEM + 5);
  });

  it("returns history oldest-first for the owner", async () => {
    const token = await registerUser("history-get@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    mockedParseProductPage.mockResolvedValueOnce(parsed({ price: "$89.99" }));
    await request.post(`/api/items/${item.id}/refresh`).set("Authorization", `Bearer ${token}`);

    const response = await request
      .get(`/api/items/${item.id}/history`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].priceNumeric).toBe(100);
    expect(response.body[1].priceNumeric).toBe(89.99);
    expect(response.body[0].capturedAt).toEqual(expect.any(String));
  });

  it("limits history to the most recent readings", async () => {
    const token = await registerUser("history-limit@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    mockedParseProductPage.mockResolvedValueOnce(parsed({ price: "$89.99" }));
    await request.post(`/api/items/${item.id}/refresh`).set("Authorization", `Bearer ${token}`);

    const response = await request
      .get(`/api/items/${item.id}/history?limit=1`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].priceNumeric).toBe(89.99);
  });

  it("404s history for an item owned by another user", async () => {
    const ownerToken = await registerUser("history-owner@example.com");
    const closet = await createCloset(ownerToken);
    const item = await createItem(ownerToken, closet.id);

    const otherToken = await registerUser("history-intruder@example.com");

    const response = await request
      .get(`/api/items/${item.id}/history`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
  });

  it("deletes snapshots when the item is deleted", async () => {
    const token = await registerUser("history-cascade@example.com");
    const closet = await createCloset(token);
    const item = await createItem(token, closet.id);

    await request.delete(`/api/items/${item.id}`).set("Authorization", `Bearer ${token}`);

    const snapshots = await testPrisma!.priceSnapshot.findMany({ where: { itemId: item.id } });

    expect(snapshots).toHaveLength(0);
  });
});
