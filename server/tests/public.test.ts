import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { parseProductPage } from "../src/services/parser";
import { validateSsrfSafeUrl } from "../src/utils/ssrf";

vi.mock("../src/services/parser", async () => {
  const actual = await vi.importActual<typeof import("../src/services/parser")>(
    "../src/services/parser"
  );
  return {
    ...actual,
    parseProductPage: vi.fn()
  };
});

vi.mock("../src/utils/ssrf", () => ({
  validateSsrfSafeUrl: vi.fn(async (rawUrl: string) => new URL(rawUrl))
}));

const mockedParse = vi.mocked(parseProductPage);
const mockedSsrf = vi.mocked(validateSsrfSafeUrl);

const sampleProduct = {
  brand: "Acme",
  name: "Wool Coat",
  price: "320",
  originalPrice: null,
  currency: "USD",
  imageUrl: "https://cdn.example.com/coat.jpg",
  description: null,
  inStock: true,
  colors: [],
  suggestedTags: ["wool"],
  suggestedSeason: "Winter",
  source: "example.com",
  enrichmentSuccess: null
};

describe("POST /api/public/parse-url", () => {
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    // Low daily cap so the cap test is deterministic; read at module import time.
    process.env.DEMO_PARSE_DAILY_CAP = "2";
    const { createApp } = await import("../src/index");
    request = supertest(createApp());
  });

  afterAll(() => {
    delete process.env.DEMO_PARSE_DAILY_CAP;
  });

  beforeEach(() => {
    mockedParse.mockReset();
    mockedSsrf.mockReset();
    mockedSsrf.mockImplementation(async (rawUrl: string) => new URL(rawUrl));
  });

  it("parses a public URL in demoMode (no auth)", async () => {
    mockedParse.mockResolvedValue(sampleProduct);

    const response = await request
      .post("/api/public/parse-url")
      .send({ url: "https://example.com/coat" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Wool Coat");
    expect(mockedParse).toHaveBeenCalledWith("https://example.com/coat", {
      demoMode: true
    });
  });

  it("rejects an SSRF-blocked URL", async () => {
    mockedSsrf.mockImplementation(async () => {
      throw new Error("Refusing to fetch a private address.");
    });

    const response = await request
      .post("/api/public/parse-url")
      .send({ url: "http://169.254.169.254/latest/meta-data" });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockedParse).not.toHaveBeenCalled();
  });

  it("enforces the global daily cap with a 429", async () => {
    mockedParse.mockResolvedValue(sampleProduct);

    // Cap is 2; the first two succeed and the third is rejected. Other tests in
    // this file also consume the counter, so assert on the transition rather than
    // exact ordinals: drive enough requests to exceed the cap and expect a 429.
    let saw429 = false;
    for (let i = 0; i < 5; i += 1) {
      const response = await request
        .post("/api/public/parse-url")
        .send({ url: "https://example.com/coat" });
      if (response.status === 429) {
        saw429 = true;
        break;
      }
    }

    expect(saw429).toBe(true);
  });
});
