import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { hasTestDatabase, prepareTestDatabase, resetDatabase, testPrisma } from "./test-db";
import { parseProductPage, ParserFetchError } from "../src/services/parser";
import { hashResetToken } from "../src/utils/passwordReset";

vi.mock("../src/services/parser", () => {
  class MockParserFetchError extends Error {}

  return {
    ParserFetchError: MockParserFetchError,
    parseProductPage: vi.fn()
  };
});

// Bypass the real SSRF guard (which does live DNS) so URL-backed refresh tests
// stay hermetic and don't depend on test-fixture hosts resolving.
vi.mock("../src/utils/ssrf", () => ({
  validateSsrfSafeUrl: vi.fn(async (rawUrl: string) => new URL(rawUrl))
}));

const verifyIdToken = vi.hoisted(() => vi.fn());

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken }))
}));

const sendEmailMock = vi.hoisted(() => vi.fn());

vi.mock("../src/services/email", () => ({
  sendEmail: sendEmailMock,
  getAppBaseUrl: () => "http://localhost:5173",
  EmailSendError: class EmailSendError extends Error {}
}));

function mockGooglePayload(payload: Record<string, unknown>) {
  verifyIdToken.mockResolvedValue({ getPayload: () => payload });
}

const describeDb = hasTestDatabase ? describe : describe.skip;
const mockedParseProductPage = vi.mocked(parseProductPage);

describeDb("API integration", () => {
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
      .send({
        name,
        tags: []
      });

    return response.body;
  }

  function getAuthCookie(response: supertest.Response) {
    const setCookie = response.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const cookie = cookies.find((value) => value.startsWith("auth_token="));

    expect(cookie).toEqual(expect.stringContaining("HttpOnly"));
    return cookie!.split(";")[0];
  }

  it("registers users, logs them in, and rejects duplicate emails", async () => {
    const register = await request.post("/api/auth/register").send({
      email: "mira@example.com",
      name: "Mira",
      password: "password123"
    });

    expect(register.status).toBe(201);
    expect(register.body.user).toMatchObject({
      email: "mira@example.com",
      name: "Mira",
      plan: "free"
    });
    expect(register.body.token).toEqual(expect.any(String));
    expect(getAuthCookie(register)).toEqual(expect.stringContaining("auth_token="));

    const login = await request.post("/api/auth/login").send({
      email: "mira@example.com",
      password: "password123"
    });

    expect(login.status).toBe(200);
    expect(login.body.user.email).toBe("mira@example.com");
    expect(login.body.token).toEqual(expect.any(String));
    expect(getAuthCookie(login)).toEqual(expect.stringContaining("auth_token="));

    const duplicate = await request.post("/api/auth/register").send({
      email: "mira@example.com",
      name: "Mira Again",
      password: "password123"
    });

    expect(duplicate.status).toBe(409);
  });

  it("signs in with Google, stores the avatar, and reuses the account on repeat sign-in", async () => {
    mockGooglePayload({
      sub: "google-sub-1",
      email: "glenda@example.com",
      email_verified: true,
      name: "Glenda",
      picture: "https://lh3.googleusercontent.com/a/glenda"
    });

    const first = await request.post("/api/auth/google").send({ credential: "id-token-1" });

    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({
      email: "glenda@example.com",
      name: "Glenda",
      avatarUrl: "https://lh3.googleusercontent.com/a/glenda"
    });
    expect(first.body.token).toEqual(expect.any(String));
    expect(getAuthCookie(first)).toEqual(expect.stringContaining("auth_token="));

    const stored = await testPrisma!.user.findUniqueOrThrow({ where: { email: "glenda@example.com" } });
    expect(stored.googleId).toBe("google-sub-1");
    expect(stored.password).toBeNull();

    const second = await request.post("/api/auth/google").send({ credential: "id-token-1" });
    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);

    const count = await testPrisma!.user.count({ where: { email: "glenda@example.com" } });
    expect(count).toBe(1);
  });

  it("links Google sign-in to an existing password account with the same email", async () => {
    const register = await request.post("/api/auth/register").send({
      email: "bob@example.com",
      name: "Bob",
      password: "password123"
    });

    mockGooglePayload({
      sub: "google-sub-2",
      email: "bob@example.com",
      email_verified: true,
      name: "Bob",
      picture: "https://lh3.googleusercontent.com/a/bob"
    });

    const google = await request.post("/api/auth/google").send({ credential: "id-token-2" });

    expect(google.status).toBe(200);
    expect(google.body.user.id).toBe(register.body.user.id);

    const linked = await testPrisma!.user.findUniqueOrThrow({ where: { email: "bob@example.com" } });
    expect(linked.googleId).toBe("google-sub-2");
    expect(linked.password).not.toBeNull();

    const count = await testPrisma!.user.count({ where: { email: "bob@example.com" } });
    expect(count).toBe(1);
  });

  it("rejects a Google sign-in with an unverified email", async () => {
    mockGooglePayload({
      sub: "google-sub-3",
      email: "unverified@example.com",
      email_verified: false,
      name: "Una"
    });

    const response = await request.post("/api/auth/google").send({ credential: "id-token-3" });
    expect(response.status).toBe(401);
  });

  it("enforces authentication on protected routes", async () => {
    const response = await request.get("/api/user");
    expect(response.status).toBe(401);
  });

  it("authenticates protected routes with cookies and bearer tokens", async () => {
    const register = await request.post("/api/auth/register").send({
      email: "cookie@example.com",
      name: "Cookie",
      password: "password123"
    });
    const authCookie = getAuthCookie(register);

    const cookieAuth = await request.get("/api/user").set("Cookie", authCookie);
    expect(cookieAuth.status).toBe(200);
    expect(cookieAuth.body.email).toBe("cookie@example.com");

    const bearerAuth = await request
      .get("/api/user")
      .set("Authorization", `Bearer ${register.body.token}`);
    expect(bearerAuth.status).toBe(200);
    expect(bearerAuth.body.email).toBe("cookie@example.com");
  });

  it("updates the display name via PATCH /api/user", async () => {
    const token = await registerUser("rename@example.com");

    const updated = await request
      .patch("/api/user")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed Person" });

    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe("Renamed Person");
    expect(updated.body.isGoogleAccount).toBe(false);

    const fetched = await request.get("/api/user").set("Authorization", `Bearer ${token}`);
    expect(fetched.body.name).toBe("Renamed Person");
  });

  it("rejects an empty display name", async () => {
    const token = await registerUser("emptyname@example.com");

    const response = await request
      .patch("/api/user")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("clears the auth cookie on logout", async () => {
    const response = await request.post("/api/auth/logout");
    const setCookie = response.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const clearCookie = cookies.find((value) => value.startsWith("auth_token="));

    expect(response.status).toBe(200);
    expect(clearCookie).toEqual(expect.stringContaining("auth_token=;"));
  });

  async function seedResetToken(userId: string, overrides: { usedAt?: Date; expiresAt?: Date } = {}) {
    const rawToken = `raw-${Math.random().toString(36).slice(2)}`;
    await testPrisma!.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashResetToken(rawToken),
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000),
        usedAt: overrides.usedAt ?? null
      }
    });
    return rawToken;
  }

  it("does not reveal whether an account exists on forgot-password", async () => {
    const unknown = await request.post("/api/auth/forgot-password").send({ email: "nobody@example.com" });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual({ ok: true });
    expect(await testPrisma!.passwordResetToken.count()).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();

    await registerUser("known@example.com");
    const known = await request.post("/api/auth/forgot-password").send({ email: "known@example.com" });
    expect(known.status).toBe(200);
    expect(known.body).toEqual({ ok: true });
    expect(await testPrisma!.passwordResetToken.count()).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "known@example.com" })
    );
  });

  it("resets the password with a valid token and invalidates the old one", async () => {
    await registerUser("resetme@example.com");
    const user = await testPrisma!.user.findUniqueOrThrow({ where: { email: "resetme@example.com" } });
    const rawToken = await seedResetToken(user.id);

    const reset = await request.post("/api/auth/reset-password").send({
      token: rawToken,
      password: "brand-new-pw"
    });
    expect(reset.status).toBe(200);

    // New password works, old password rejected, token consumed.
    const newLogin = await request.post("/api/auth/login").send({ email: "resetme@example.com", password: "brand-new-pw" });
    expect(newLogin.status).toBe(200);
    const oldLogin = await request.post("/api/auth/login").send({ email: "resetme@example.com", password: "password123" });
    expect(oldLogin.status).toBe(401);
    expect(await testPrisma!.passwordResetToken.count()).toBe(0);
  });

  it("rejects invalid, expired, and already-used reset tokens", async () => {
    await registerUser("tokens@example.com");
    const user = await testPrisma!.user.findUniqueOrThrow({ where: { email: "tokens@example.com" } });

    const unknown = await request.post("/api/auth/reset-password").send({ token: "not-a-real-token", password: "brand-new-pw" });
    expect(unknown.status).toBe(400);

    const expiredToken = await seedResetToken(user.id, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await request.post("/api/auth/reset-password").send({ token: expiredToken, password: "brand-new-pw" });
    expect(expired.status).toBe(400);

    const usedToken = await seedResetToken(user.id, { usedAt: new Date() });
    const used = await request.post("/api/auth/reset-password").send({ token: usedToken, password: "brand-new-pw" });
    expect(used.status).toBe(400);

    const short = await request.post("/api/auth/reset-password").send({ token: await seedResetToken(user.id), password: "short" });
    expect(short.status).toBe(400);
  });

  it("lets a Google account set a password without breaking either login method", async () => {
    mockGooglePayload({
      sub: "google-reset-sub",
      email: "googler@example.com",
      email_verified: true,
      name: "Googler",
      picture: "https://lh3.googleusercontent.com/a/googler"
    });
    const google = await request.post("/api/auth/google").send({ credential: "google-reset-token" });
    expect(google.status).toBe(200);

    const user = await testPrisma!.user.findUniqueOrThrow({ where: { email: "googler@example.com" } });
    const rawToken = await seedResetToken(user.id);
    const reset = await request.post("/api/auth/reset-password").send({ token: rawToken, password: "added-password" });
    expect(reset.status).toBe(200);

    // Email/password login now works...
    const passwordLogin = await request.post("/api/auth/login").send({ email: "googler@example.com", password: "added-password" });
    expect(passwordLogin.status).toBe(200);

    // ...and Google sign-in still resolves to the same account.
    const googleAgain = await request.post("/api/auth/google").send({ credential: "google-reset-token" });
    expect(googleAgain.status).toBe(200);
    expect(googleAgain.body.user.id).toBe(user.id);
  });

  it("isolates closets by owner", async () => {
    const tokenA = await registerUser("a@example.com");
    const tokenB = await registerUser("b@example.com");
    const closet = await createCloset(tokenA, "A Closet");

    const response = await request
      .get(`/api/closets/${closet.id}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(404);
  });

  it("requires explicit confirmation before deleting a non-empty section", async () => {
    const token = await registerUser("sections@example.com");
    const closet = await createCloset(token);
    const section = await request
      .post(`/api/closets/${closet.id}/sections`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Knitwear", tags: [] });

    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.id,
        sectionId: section.body.id,
        brand: "Toteme",
        name: "Cardigan",
        season: "F/W",
        tags: ["wool"],
        colors: ["Cream"]
      });

    expect(item.status).toBe(201);

    const blockedDelete = await request
      .delete(`/api/closets/${closet.id}/sections/${section.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(blockedDelete.status).toBe(409);

    const confirmedDelete = await request
      .delete(`/api/closets/${closet.id}/sections/${section.body.id}?deleteItems=true`)
      .set("Authorization", `Bearer ${token}`);

    expect(confirmedDelete.status).toBe(204);

    const count = await testPrisma!.item.count();
    expect(count).toBe(0);
  });

  it("rejects moves to a section that does not belong to the target closet", async () => {
    const token = await registerUser("move@example.com");
    const closetA = await createCloset(token, "Closet A");
    const closetB = await createCloset(token, "Closet B");
    const sectionA = await request
      .post(`/api/closets/${closetA.id}/sections`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "A Section", tags: [] });
    const sectionB = await request
      .post(`/api/closets/${closetB.id}/sections`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "B Section", tags: [] });
    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closetA.id,
        sectionId: sectionA.body.id,
        brand: "Khaite",
        name: "Danielle High-Rise",
        season: "S/S",
        tags: ["denim"],
        colors: ["Indigo"]
      });

    const response = await request
      .post(`/api/items/${item.body.id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closetB.id,
        sectionId: sectionA.body.id
      });

    expect(response.status).toBe(400);

    const success = await request
      .post(`/api/items/${item.body.id}/move`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closetB.id,
        sectionId: sectionB.body.id
      });

    expect(success.status).toBe(200);
    expect(success.body.closetId).toBe(closetB.id);
    expect(success.body.sectionId).toBe(sectionB.body.id);
  });

  it("serializes freshness fields and accepts nullable stock patches", async () => {
    const token = await registerUser("freshness@example.com");
    const closet = await createCloset(token);

    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.id,
        brand: "Toteme",
        name: "Coat",
        season: "Winter",
        url: "https://shop.example.com/coat",
        inStock: true,
        tags: [],
        colors: []
      });

    expect(item.status).toBe(201);
    expect(item.body.lastCheckedAt).toEqual(expect.any(String));
    expect(item.body.inStock).toBe(true);
    expect(item.body.onSale).toBe(false);

    const patched = await request
      .patch(`/api/items/${item.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ inStock: null });

    expect(patched.status).toBe(200);
    expect(patched.body.inStock).toBeNull();
  });

  it("refreshes URL-backed items and marks sale drops", async () => {
    const token = await registerUser("refresh@example.com");
    const closet = await createCloset(token);
    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.id,
        brand: "Lemaire",
        name: "Jacket",
        season: "Fall",
        price: "$100.00",
        url: "https://shop.example.com/jacket",
        inStock: true,
        tags: [],
        colors: []
      });

    mockedParseProductPage.mockResolvedValueOnce({
      brand: "Lemaire",
      name: "Jacket",
      price: "$89.99",
      originalPrice: "$120.00",
      currency: "USD",
      imageUrl: "https://cdn.example.com/jacket.jpg",
      description: "Updated",
      inStock: false,
      colors: [],
      suggestedTags: [],
      suggestedSeason: null,
      source: "shop.example.com"
    });

    const refreshed = await request
      .post(`/api/items/${item.body.id}/refresh`)
      .set("Authorization", `Bearer ${token}`);

    expect(refreshed.status).toBe(200);
    expect(mockedParseProductPage).toHaveBeenCalledWith("https://shop.example.com/jacket");
    expect(refreshed.body.price).toBe("$89.99");
    expect(refreshed.body.originalPrice).toBe("$120.00");
    expect(refreshed.body.inStock).toBe(false);
    expect(refreshed.body.onSale).toBe(true);
    expect(refreshed.body.lastCheckedAt).toEqual(expect.any(String));
  });

  it("rejects refresh for items without usable URLs", async () => {
    const token = await registerUser("refresh-missing@example.com");
    const closet = await createCloset(token);
    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.id,
        brand: "Khaite",
        name: "Jeans",
        season: "S/S",
        tags: [],
        colors: []
      });

    const response = await request
      .post(`/api/items/${item.body.id}/refresh`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(mockedParseProductPage).not.toHaveBeenCalled();
  });

  it("returns 502 when refresh parsing cannot fetch the product page", async () => {
    const token = await registerUser("refresh-fail@example.com");
    const closet = await createCloset(token);
    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.id,
        brand: "A.P.C.",
        name: "Bag",
        season: "Spring",
        url: "https://shop.example.com/bag",
        tags: [],
        colors: []
      });

    mockedParseProductPage.mockRejectedValueOnce(new ParserFetchError("Request failed"));

    const response = await request
      .post(`/api/items/${item.body.id}/refresh`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(502);
  });

  it("bulk-refreshes only stale URL-backed items and summarizes the run", async () => {
    const token = await registerUser("bulk-refresh@example.com");
    const closet = await createCloset(token);

    const stale = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.id,
        brand: "Lemaire",
        name: "Coat",
        season: "Fall",
        price: "$200.00",
        url: "https://shop.example.com/coat",
        inStock: true,
        tags: [],
        colors: []
      });

    // Freshly added URL-backed items are marked checked, so backdate to force staleness.
    await testPrisma!.item.update({
      where: { id: stale.body.id },
      data: { lastCheckedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    });

    // A second item without a URL must be ignored by the bulk run.
    await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.id,
        brand: "Khaite",
        name: "Tee",
        season: "Summer",
        tags: [],
        colors: []
      });

    mockedParseProductPage.mockResolvedValueOnce({
      brand: "Lemaire",
      name: "Coat",
      price: "$150.00",
      originalPrice: "$200.00",
      currency: "USD",
      imageUrl: "https://cdn.example.com/coat.jpg",
      description: "Updated",
      inStock: false,
      colors: [],
      suggestedTags: [],
      suggestedSeason: null,
      source: "shop.example.com"
    });

    const response = await request
      .post("/api/items/refresh-stale")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(mockedParseProductPage).toHaveBeenCalledTimes(1);
    expect(mockedParseProductPage).toHaveBeenCalledWith("https://shop.example.com/coat");
    expect(response.body).toEqual({
      checked: 1,
      refreshed: 1,
      priceDrops: 1,
      outOfStock: 1,
      failed: 0
    });
  });

  async function createStalePricedItem(
    token: string,
    closetId: string,
    overrides: { price?: string; inStock?: boolean; name?: string } = {}
  ) {
    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId,
        brand: "Lemaire",
        name: overrides.name ?? "Coat",
        season: "Fall",
        price: overrides.price ?? "$200.00",
        url: `https://shop.example.com/${overrides.name ?? "coat"}`.toLowerCase(),
        inStock: overrides.inStock ?? true,
        tags: [],
        colors: []
      });

    await testPrisma!.item.update({
      where: { id: item.body.id },
      data: { lastCheckedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    });

    return item.body;
  }

  function mockParsed(overrides: { price?: string; inStock?: boolean | null }) {
    mockedParseProductPage.mockResolvedValueOnce({
      brand: "Lemaire",
      name: "Coat",
      price: overrides.price ?? "$200.00",
      originalPrice: "$200.00",
      currency: "USD",
      imageUrl: "https://cdn.example.com/coat.jpg",
      description: "Updated",
      inStock: overrides.inStock ?? true,
      colors: [],
      suggestedTags: [],
      suggestedSeason: null,
      source: "shop.example.com"
    });
  }

  it("emails a price-drop digest and records an EmailLog row", async () => {
    const token = await registerUser("drop@example.com");
    const closet = await createCloset(token);
    await createStalePricedItem(token, closet.id, { price: "$200.00", inStock: true });

    mockParsed({ price: "$150.00", inStock: true });
    sendEmailMock.mockResolvedValueOnce({ id: "resend-123", skipped: false });

    const response = await request.post("/api/items/refresh-stale").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ priceDrops: 1, outOfStock: 0 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const sent = sendEmailMock.mock.calls[0][0];
    expect(sent.to).toBe("drop@example.com");
    expect(sent.html).toContain("Coat");

    const logs = await testPrisma!.emailLog.findMany({ where: { type: "price_drop" } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ recipient: "drop@example.com", status: "sent", providerId: "resend-123" });
  });

  it("emails on out-of-stock transition but not while an item stays out of stock", async () => {
    const token = await registerUser("oos@example.com");
    const closet = await createCloset(token);
    const item = await createStalePricedItem(token, closet.id, { price: "$200.00", inStock: true });

    // First run: in-stock -> out-of-stock transition, price unchanged.
    mockParsed({ price: "$200.00", inStock: false });
    const first = await request.post("/api/items/refresh-stale").set("Authorization", `Bearer ${token}`);
    expect(first.body).toMatchObject({ priceDrops: 0, outOfStock: 1 });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    // Backdate again and re-run: still out of stock, no new transition -> no email.
    sendEmailMock.mockClear();
    await testPrisma!.item.update({
      where: { id: item.id },
      data: { lastCheckedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    });
    mockParsed({ price: "$200.00", inStock: false });
    const second = await request.post("/api/items/refresh-stale").set("Authorization", `Bearer ${token}`);
    expect(second.body).toMatchObject({ priceDrops: 0, outOfStock: 1 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not email when the user disabled notifications", async () => {
    const token = await registerUser("muted@example.com");
    const closet = await createCloset(token);
    await createStalePricedItem(token, closet.id, { price: "$200.00", inStock: true });

    await request
      .patch("/api/user")
      .set("Authorization", `Bearer ${token}`)
      .send({ emailNotifications: false });

    mockParsed({ price: "$150.00", inStock: true });
    const response = await request.post("/api/items/refresh-stale").set("Authorization", `Bearer ${token}`);

    expect(response.body).toMatchObject({ priceDrops: 1 });
    expect(sendEmailMock).not.toHaveBeenCalled();
    const logs = await testPrisma!.emailLog.findMany({ where: { type: "price_drop" } });
    expect(logs).toHaveLength(0);
  });

  it("persists the emailNotifications preference", async () => {
    const token = await registerUser("prefs@example.com");

    const patched = await request
      .patch("/api/user")
      .set("Authorization", `Bearer ${token}`)
      .send({ emailNotifications: false });
    expect(patched.status).toBe(200);
    expect(patched.body.emailNotifications).toBe(false);

    const fetched = await request.get("/api/user").set("Authorization", `Bearer ${token}`);
    expect(fetched.body.emailNotifications).toBe(false);
  });

  it("toggles favorites and deletes tag usage across closets, sections, and items", async () => {
    const token = await registerUser("tags@example.com");
    const closet = await request
      .post("/api/closets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Tagged Closet",
        tags: ["investment"]
      });
    const section = await request
      .post(`/api/closets/${closet.body.id}/sections`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Section",
        tags: ["investment"]
      });
    await request
      .post("/api/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "investment",
        color: "#5A4A38"
      });
    const item = await request
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        closetId: closet.body.id,
        sectionId: section.body.id,
        brand: "Lemaire",
        name: "Coat",
        season: "Winter",
        tags: ["investment"],
        colors: ["Ash"]
      });

    const favoriteA = await request
      .post(`/api/items/${item.body.id}/favorite`)
      .set("Authorization", `Bearer ${token}`);
    const favoriteB = await request
      .post(`/api/items/${item.body.id}/favorite`)
      .set("Authorization", `Bearer ${token}`);

    expect(favoriteA.body.favorited).toBe(true);
    expect(favoriteB.body.favorited).toBe(false);

    const deleted = await request
      .delete("/api/tags/investment")
      .set("Authorization", `Bearer ${token}`);

    expect(deleted.status).toBe(204);

    const [freshCloset, freshSection, freshItem, tags] = await Promise.all([
      testPrisma!.closet.findFirstOrThrow({ where: { id: closet.body.id } }),
      testPrisma!.section.findFirstOrThrow({ where: { id: section.body.id } }),
      testPrisma!.item.findFirstOrThrow({ where: { id: item.body.id } }),
      testPrisma!.tag.findMany()
    ]);

    expect(freshCloset.tags).toEqual([]);
    expect(freshSection.tags).toEqual([]);
    expect(freshItem.tags).toEqual([]);
    expect(tags).toEqual([]);
  });
});
