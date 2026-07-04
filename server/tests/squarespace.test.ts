import { beforeEach, describe, expect, it, vi } from "vitest";

const { safeFetch } = vi.hoisted(() => ({ safeFetch: vi.fn() }));
vi.mock("../src/utils/safeFetch", () => ({ safeFetch }));

import { fetchSquarespaceProduct } from "../src/services/parsers/squarespace";

// Minimal Squarespace Commerce `?format=json` item (real shape, trimmed). The displayed
// price lives on the variants; item/structuredContent priceMoney are 0.00 when set
// per-variant, which is why the parser reads variants[0].
function item(overrides: Record<string, unknown> = {}) {
  return {
    item: {
      recordType: 11,
      title: "TIA BLUSH",
      excerpt: "<p>A crowd favourite raffia top-handle bag.</p><ul><li>Handcrafted in Ghana</li></ul>",
      body: "<div class=\"sqs-layout empty\"></div>",
      assetUrl: "https://static1.squarespace.com/static/redirect/",
      items: [{ assetUrl: "https://images.squarespace-cdn.com/content/tia.jpg" }],
      variantOptionOrdering: [],
      structuredContent: {
        _type: "StoreItem",
        productType: 1,
        priceMoney: { currency: "GBP", value: "0.00" },
        variants: [
          {
            priceMoney: { currency: "GBP", value: "190.00" },
            salePriceMoney: { currency: "GBP", value: "0.00" },
            onSale: false,
            qtyInStock: 5,
            unlimited: false,
            optionValues: [],
            attributes: {}
          }
        ],
        ...(overrides.structuredContent as Record<string, unknown> | undefined)
      },
      ...overrides
    }
  };
}

function mockApi(payload: unknown) {
  safeFetch.mockResolvedValue({ status: 200, ok: true, text: JSON.stringify(payload) });
}

const URL_TIA = new URL("https://www.aaksonline.com/shop/p/tia-blush");

describe("fetchSquarespaceProduct", () => {
  beforeEach(() => {
    safeFetch.mockReset();
  });

  it("maps a store item, taking price from the first variant", async () => {
    mockApi(item());

    const result = await fetchSquarespaceProduct(URL_TIA);

    expect(safeFetch).toHaveBeenCalledWith(
      "https://www.aaksonline.com/shop/p/tia-blush?format=json",
      expect.anything()
    );
    expect(result).toMatchObject({
      name: "TIA BLUSH",
      price: "190",
      originalPrice: null,
      currency: "GBP",
      imageUrl: "https://images.squarespace-cdn.com/content/tia.jpg",
      description: "A crowd favourite raffia top-handle bag. Handcrafted in Ghana",
      inStock: true,
      colors: []
    });
    // brand is intentionally left unset so the generic path fills it.
    expect(result).not.toHaveProperty("brand");
  });

  it("splits sale vs. original price when a variant is on sale", async () => {
    mockApi(
      item({
        structuredContent: {
          _type: "StoreItem",
          productType: 1,
          variants: [
            {
              priceMoney: { currency: "USD", value: "120.00" },
              salePriceMoney: { currency: "USD", value: "90.00" },
              onSale: true,
              qtyInStock: 2,
              unlimited: false
            }
          ]
        }
      })
    );

    const result = await fetchSquarespaceProduct(URL_TIA);

    expect(result).toMatchObject({ price: "90", originalPrice: "120", currency: "USD" });
  });

  it("extracts colours from variant optionValues", async () => {
    mockApi(
      item({
        variantOptionOrdering: ["Color", "Size"],
        structuredContent: {
          _type: "StoreItem",
          productType: 1,
          variants: [
            {
              priceMoney: { currency: "GBP", value: "190.00" },
              onSale: false,
              qtyInStock: 3,
              optionValues: [
                { optionName: "Color", value: "Blush" },
                { optionName: "Size", value: "One Size" }
              ]
            },
            {
              priceMoney: { currency: "GBP", value: "190.00" },
              onSale: false,
              qtyInStock: 0,
              optionValues: [
                { optionName: "Color", value: "Black" },
                { optionName: "Size", value: "One Size" }
              ]
            }
          ]
        }
      })
    );

    const result = await fetchSquarespaceProduct(URL_TIA);
    expect(result?.colors).toEqual(["Blush", "Black"]);
  });

  it("falls back to the attributes map when optionValues is absent", async () => {
    mockApi(
      item({
        variantOptionOrdering: ["Colour"],
        structuredContent: {
          _type: "StoreItem",
          productType: 1,
          variants: [
            {
              priceMoney: { currency: "GBP", value: "50.00" },
              onSale: false,
              qtyInStock: 1,
              attributes: { Colour: "Rouge" }
            }
          ]
        }
      })
    );

    const result = await fetchSquarespaceProduct(URL_TIA);
    expect(result?.colors).toEqual(["Rouge"]);
  });

  it("reports out of stock when no variant has quantity or is unlimited", async () => {
    mockApi(
      item({
        structuredContent: {
          _type: "StoreItem",
          productType: 1,
          variants: [
            { priceMoney: { currency: "GBP", value: "190.00" }, qtyInStock: 0, unlimited: false }
          ]
        }
      })
    );

    const result = await fetchSquarespaceProduct(URL_TIA);
    expect(result?.inStock).toBe(false);
  });

  it("returns null for a non-product URL without fetching", async () => {
    const result = await fetchSquarespaceProduct(new URL("https://www.aaksonline.com/shop/tote"));
    expect(result).toBeNull();
    expect(safeFetch).not.toHaveBeenCalled();
  });

  it("returns null when the JSON is not a store item", async () => {
    mockApi({ item: { recordType: 1, title: "A blog post" } });

    const result = await fetchSquarespaceProduct(URL_TIA);
    expect(result).toBeNull();
  });

  it("returns null when the response has no item", async () => {
    mockApi({ website: { siteTitle: "AAKS" } });

    const result = await fetchSquarespaceProduct(URL_TIA);
    expect(result).toBeNull();
  });
});
