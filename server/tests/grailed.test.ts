import { beforeEach, describe, expect, it, vi } from "vitest";

const { validateSsrfSafeUrl, fetchRenderedHtml, safeFetch } = vi.hoisted(() => ({
  validateSsrfSafeUrl: vi.fn(async (url: string) => new URL(url)),
  fetchRenderedHtml: vi.fn<(url: string, options?: { userAgent?: string }) => Promise<string>>(),
  safeFetch: vi.fn()
}));

vi.mock("../src/utils/ssrf", () => ({ validateSsrfSafeUrl }));
vi.mock("../src/services/browser", () => ({ fetchRenderedHtml }));
vi.mock("../src/utils/safeFetch", () => ({ safeFetch }));

import {
  extractGrailedProduct,
  isGrailedHost,
  GRAILED_RENDER_USER_AGENT
} from "../src/services/parsers/grailed";
import { parseProductPage } from "../src/services/parser";

// Grailed server-renders the listing into a `__NEXT_DATA__` blob. Shape below is the
// real one (trimmed): priceDrops is the descending price history whose last entry is
// the current price, colors live in `traits`, and `sold` drives stock.
function listing(overrides: Record<string, unknown> = {}) {
  return {
    title: "Manchester United Training Jacket Windbreaker",
    description: "Excellent pre-owned condition.\nShips worldwide.",
    designerNames: "Nike",
    price: 65,
    priceDrops: [],
    dropped: false,
    sold: false,
    photos: [
      { url: "https://media-assets.grailed.com/prd/listing/temp/abc" },
      { url: "https://media-assets.grailed.com/prd/listing/temp/def" }
    ],
    traits: [
      { name: "color", value: "blue" },
      { name: "country_of_origin", value: "CN" }
    ],
    ...overrides
  };
}

function pageHtml(listingOverrides: Record<string, unknown> = {}) {
  const nextData = { props: { pageProps: { listing: listing(listingOverrides) } } };
  return `<html><head><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    nextData
  )}</script></head><body></body></html>`;
}

const URL_LISTING = new URL("https://www.grailed.com/listings/100444221-nike-jacket");

describe("isGrailedHost", () => {
  it("matches grailed.com and its subdomains only", () => {
    expect(isGrailedHost("grailed.com")).toBe(true);
    expect(isGrailedHost("www.grailed.com")).toBe(true);
    expect(isGrailedHost("notgrailed.com")).toBe(false);
    expect(isGrailedHost("grailed.com.evil.test")).toBe(false);
  });
});

describe("extractGrailedProduct", () => {
  it("maps a listing from the __NEXT_DATA__ blob", () => {
    const result = extractGrailedProduct(pageHtml(), URL_LISTING);

    expect(result).toMatchObject({
      brand: "Nike",
      name: "Manchester United Training Jacket Windbreaker",
      price: "65",
      originalPrice: null,
      imageUrl: "https://media-assets.grailed.com/prd/listing/temp/abc",
      description: "Excellent pre-owned condition.\nShips worldwide.",
      inStock: true,
      colors: ["blue"]
    });
    // currency is intentionally left unset so the generic JSON-LD offer supplies it.
    expect(result).not.toHaveProperty("currency");
  });

  it("surfaces the first price drop as originalPrice", () => {
    const result = extractGrailedProduct(
      pageHtml({ price: 141, dropped: true, priceDrops: [175, 157, 141] }),
      URL_LISTING
    );

    expect(result).toMatchObject({ price: "141", originalPrice: "175" });
  });

  it("ignores priceDrops when the seller has not dropped the price", () => {
    const result = extractGrailedProduct(
      pageHtml({ price: 175, dropped: false, priceDrops: [175] }),
      URL_LISTING
    );

    expect(result.originalPrice).toBeNull();
  });

  it("does not report an originalPrice equal to the current price", () => {
    const result = extractGrailedProduct(
      pageHtml({ price: 175, dropped: true, priceDrops: [175] }),
      URL_LISTING
    );

    expect(result.originalPrice).toBeNull();
  });

  it("marks a sold listing as out of stock", () => {
    const result = extractGrailedProduct(pageHtml({ sold: true }), URL_LISTING);
    expect(result.inStock).toBe(false);
  });

  it("returns no colors when the traits carry none", () => {
    const result = extractGrailedProduct(
      pageHtml({ traits: [{ name: "country_of_origin", value: "CN" }] }),
      URL_LISTING
    );
    expect(result.colors).toEqual([]);
  });

  it("no-ops on a non-Grailed host", () => {
    expect(extractGrailedProduct(pageHtml(), new URL("https://example.com/x"))).toEqual({});
  });

  it("no-ops when the page has no __NEXT_DATA__ blob", () => {
    expect(extractGrailedProduct("<html><body>nope</body></html>", URL_LISTING)).toEqual({});
  });

  it("no-ops when __NEXT_DATA__ is malformed JSON", () => {
    const html = `<html><script id="__NEXT_DATA__" type="application/json">{not json</script></html>`;
    expect(extractGrailedProduct(html, URL_LISTING)).toEqual({});
  });

  it("no-ops when the blob carries no listing (e.g. a category page)", () => {
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: { pageProps: {} }
    })}</script></html>`;
    expect(extractGrailedProduct(html, URL_LISTING)).toEqual({});
  });
});

// Grailed's Cloudflare edge 403s Chromium's default "HeadlessChrome" UA, so the render
// for that host — and only that host — must present a real browser User-Agent.
describe("parseProductPage — Grailed render User-Agent", () => {
  beforeEach(() => {
    fetchRenderedHtml.mockReset();
    safeFetch.mockReset();
    // Shopify/WooCommerce/Squarespace probes hit safeFetch — 404 so they resolve to null.
    safeFetch.mockResolvedValue({ status: 404, ok: false, text: "not found" });
  });

  it("renders a Grailed listing with a real browser User-Agent", async () => {
    fetchRenderedHtml.mockResolvedValue(pageHtml());

    const result = await parseProductPage(URL_LISTING.toString());

    expect(fetchRenderedHtml).toHaveBeenCalledWith(URL_LISTING.toString(), {
      userAgent: GRAILED_RENDER_USER_AGENT
    });
    expect(result).toMatchObject({ brand: "Nike", price: "65", colors: ["blue"] });
  });

  it("leaves the default User-Agent in place for other hosts", async () => {
    fetchRenderedHtml.mockResolvedValue("<html><head><title>Thing</title></head></html>");

    await parseProductPage("https://example.com/products-page");

    expect(fetchRenderedHtml).toHaveBeenCalledWith("https://example.com/products-page", undefined);
  });
});
