import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { hasTestDatabase, prepareTestDatabase, resetDatabase, testPrisma } from "./test-db";
import { parseProductPage, ParserFetchError } from "../src/services/parser";

vi.mock("../src/services/parser", () => {
  class MockParserFetchError extends Error {}

  return {
    ParserFetchError: MockParserFetchError,
    parseProductPage: vi.fn()
  };
});

const describeDb = hasTestDatabase ? describe : describe.skip;
const mockedParseProductPage = vi.mocked(parseProductPage);

describeDb("API integration", () => {
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret";
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

  it("clears the auth cookie on logout", async () => {
    const response = await request.post("/api/auth/logout");
    const setCookie = response.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const clearCookie = cookies.find((value) => value.startsWith("auth_token="));

    expect(response.status).toBe(200);
    expect(clearCookie).toEqual(expect.stringContaining("auth_token=;"));
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
