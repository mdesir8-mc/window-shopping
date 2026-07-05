import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { hasTestDatabase, prepareTestDatabase, resetDatabase, testPrisma } from "./test-db";

// Keep the auth/register path hermetic — none of these tests touch Google or email.
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken: vi.fn() }))
}));

vi.mock("../src/services/email", () => ({
  sendEmail: vi.fn(),
  getAppBaseUrl: () => "http://localhost:5173",
  EmailSendError: class EmailSendError extends Error {}
}));

const describeDb = hasTestDatabase ? describe : describe.skip;

describeDb("Public closet sharing", () => {
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

  async function createCloset(token: string, name = "Main Wardrobe") {
    const response = await request
      .post("/api/closets")
      .set("Authorization", `Bearer ${token}`)
      .send({ name, tags: ["daily"], subtitle: "the good stuff" });

    return response.body;
  }

  async function addItem(token: string, closetId: string) {
    const response = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId,
        brand: "Toteme",
        name: "Wool Coat",
        price: "$320",
        season: "F/W",
        tags: ["wool"],
        colors: ["Cream"],
        note: "secret personal note"
      });

    return response.body;
  }

  it("enables sharing, serves a safe public view, and revokes the link", async () => {
    const token = await registerUser("owner@example.com");
    const closet = await createCloset(token);
    await addItem(token, closet.id);

    // Enable.
    const enable = await request
      .post(`/api/closets/${closet.id}/share`)
      .set("Authorization", `Bearer ${token}`);
    expect(enable.status).toBe(200);
    expect(enable.body.shareToken).toMatch(/^[0-9a-f]{64}$/);
    expect(enable.body.shareUrl).toContain(`/share/${enable.body.shareToken}`);
    const shareToken = enable.body.shareToken as string;

    // Re-enabling is idempotent — returns the same token, never orphans the link.
    const reEnable = await request
      .post(`/api/closets/${closet.id}/share`)
      .set("Authorization", `Bearer ${token}`);
    expect(reEnable.body.shareToken).toBe(shareToken);

    // Public fetch (no auth) returns the closet + item.
    const view = await request.get(`/api/public/closets/${shareToken}`);
    expect(view.status).toBe(200);
    expect(view.headers["x-robots-tag"]).toBe("noindex");
    expect(view.body.name).toBe("Main Wardrobe");
    expect(view.body.items).toHaveLength(1);

    // No PII / owner-only fields leak.
    expect(view.body.userId).toBeUndefined();
    expect(view.body.shareToken).toBeUndefined();
    const item = view.body.items[0];
    expect(item.name).toBe("Wool Coat");
    expect(item.note).toBeUndefined();
    expect(item.favorited).toBeUndefined();
    expect(item.lastCheckedAt).toBeUndefined();

    // Revoke.
    const revoke = await request
      .delete(`/api/closets/${closet.id}/share`)
      .set("Authorization", `Bearer ${token}`);
    expect(revoke.status).toBe(204);

    // Link is dead immediately.
    const after = await request.get(`/api/public/closets/${shareToken}`);
    expect(after.status).toBe(404);
  });

  it("returns 404 for a malformed or unknown token without a DB hit distinction", async () => {
    const bogus = await request.get("/api/public/closets/not-a-real-token");
    expect(bogus.status).toBe(404);

    const wellFormedButUnknown = await request.get(`/api/public/closets/${"a".repeat(64)}`);
    expect(wellFormedButUnknown.status).toBe(404);
  });

  it("blocks a non-owner from enabling OR disabling another user's share link", async () => {
    const owner = await registerUser("owner2@example.com");
    const attacker = await registerUser("attacker@example.com");
    const closet = await createCloset(owner);

    const enableAsAttacker = await request
      .post(`/api/closets/${closet.id}/share`)
      .set("Authorization", `Bearer ${attacker}`);
    expect(enableAsAttacker.status).toBe(404);

    // Owner enables for real, then the attacker must not be able to revoke it.
    await request.post(`/api/closets/${closet.id}/share`).set("Authorization", `Bearer ${owner}`);
    const disableAsAttacker = await request
      .delete(`/api/closets/${closet.id}/share`)
      .set("Authorization", `Bearer ${attacker}`);
    expect(disableAsAttacker.status).toBe(404);

    // The owner's link still works after the failed hijack.
    const ownerCloset = await request
      .get(`/api/closets/${closet.id}`)
      .set("Authorization", `Bearer ${owner}`);
    const stillLive = await request.get(`/api/public/closets/${ownerCloset.body.shareToken}`);
    expect(stillLive.status).toBe(200);
  });
});
