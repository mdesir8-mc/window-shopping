import { beforeEach, describe, expect, it, vi } from "vitest";

const { safeFetch } = vi.hoisted(() => ({ safeFetch: vi.fn() }));
vi.mock("../src/utils/safeFetch", () => ({ safeFetch }));

import { fetchWooCommerceProduct } from "../src/services/parsers/woocommerce";

// Minimal WooCommerce Store API product (real shape, trimmed). Prices are integer
// strings in the currency's minor unit.
function storeProduct(overrides: Record<string, unknown> = {}) {
  return {
    name: "Merino Beanie",
    slug: "merino-beanie",
    type: "simple",
    permalink: "https://shop.test/product/merino-beanie/",
    short_description: "<p>A warm <strong>merino</strong> beanie.</p>",
    description: "<p>Long description.</p>",
    on_sale: false,
    is_in_stock: true,
    prices: {
      price: "3500",
      regular_price: "3500",
      sale_price: "3500",
      currency_code: "EUR",
      currency_minor_unit: 2
    },
    images: [{ src: "https://shop.test/img/beanie.jpg" }],
    brands: [{ name: "WoolCo" }],
    attributes: [],
    ...overrides
  };
}

function mockApi(products: unknown) {
  safeFetch.mockResolvedValue({ status: 200, ok: true, text: JSON.stringify(products) });
}

describe("fetchWooCommerceProduct", () => {
  beforeEach(() => {
    safeFetch.mockReset();
  });

  it("maps a Store API product, converting minor-unit prices", async () => {
    mockApi([storeProduct()]);

    const result = await fetchWooCommerceProduct(new URL("https://shop.test/product/merino-beanie/"));

    expect(safeFetch).toHaveBeenCalledWith(
      "https://shop.test/wp-json/wc/store/products?slug=merino-beanie",
      expect.anything()
    );
    expect(result).toMatchObject({
      brand: "WoolCo",
      name: "Merino Beanie",
      price: "35",
      originalPrice: null,
      currency: "EUR",
      imageUrl: "https://shop.test/img/beanie.jpg",
      description: "A warm merino beanie.",
      inStock: true,
      colors: []
    });
  });

  it("surfaces the regular price as originalPrice when on sale", async () => {
    mockApi([
      storeProduct({
        on_sale: true,
        prices: {
          price: "2999",
          regular_price: "3500",
          sale_price: "2999",
          currency_code: "USD",
          currency_minor_unit: 2
        }
      })
    ]);

    const result = await fetchWooCommerceProduct(new URL("https://shop.test/product/merino-beanie/"));

    expect(result).toMatchObject({ price: "29.99", originalPrice: "35", currency: "USD" });
  });

  it("extracts colors from a color attribute", async () => {
    mockApi([
      storeProduct({
        attributes: [
          { name: "Size", terms: [{ name: "M" }, { name: "L" }] },
          { name: "Colour", terms: [{ name: "Charcoal" }, { name: "Oat" }] }
        ]
      })
    ]);

    const result = await fetchWooCommerceProduct(new URL("https://shop.test/product/merino-beanie/"));

    expect(result?.colors).toEqual(["Charcoal", "Oat"]);
  });

  it("resolves the slug across localized permalink bases", async () => {
    mockApi([storeProduct({ slug: "cappello" })]);

    await fetchWooCommerceProduct(new URL("https://negozio.test/prodotto/cappello/"));

    expect(safeFetch).toHaveBeenCalledWith(
      "https://negozio.test/wp-json/wc/store/products?slug=cappello",
      expect.anything()
    );
  });

  it("returns null without fetching when the URL has no product base", async () => {
    const result = await fetchWooCommerceProduct(new URL("https://shop.test/collections/hats"));

    expect(result).toBeNull();
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it("returns null when the API result does not match the requested slug", async () => {
    mockApi([storeProduct({ slug: "something-else" })]);

    const result = await fetchWooCommerceProduct(new URL("https://shop.test/product/merino-beanie/"));

    expect(result).toBeNull();
  });

  it("returns null when the response is not a Store API product", async () => {
    mockApi({ code: "rest_no_route", message: "No route" });

    const result = await fetchWooCommerceProduct(new URL("https://shop.test/product/merino-beanie/"));

    expect(result).toBeNull();
  });
});
