import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { parseProductPage, ParserFetchError } from "../src/services/parser";

vi.mock("axios", () => ({
  default: {
    get: vi.fn()
  }
}));

const mockedAxios = vi.mocked(axios, true);

describe("parseProductPage", () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it("extracts Open Graph and meta tag fields", async () => {
    mockedAxios.get.mockResolvedValue({
      data: `
        <html>
          <head>
            <meta property="og:title" content="Soft Wool Coat" />
            <meta property="og:image" content="https://cdn.example.com/coat.jpg" />
            <meta property="og:description" content="A warm winter wool coat for layering." />
            <meta property="product:price:amount" content="690" />
            <meta property="product:price:currency" content="USD" />
          </head>
        </html>
      `
    } as never);

    const product = await parseProductPage("https://shop.example.com/coat");

    expect(product.name).toBe("Soft Wool Coat");
    expect(product.imageUrl).toBe("https://cdn.example.com/coat.jpg");
    expect(product.price).toBe("690");
    expect(product.currency).toBe("USD");
    expect(product.suggestedTags).toContain("wool");
    expect(product.suggestedSeason).toBe("Winter");
  });

  it("extracts JSON-LD product fields", async () => {
    mockedAxios.get.mockResolvedValue({
      data: `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Oversized Cashmere Crewneck",
                "description": "A timeless cashmere sweater for winter layering.",
                "brand": { "@type": "Brand", "name": "The Row" },
                "color": "Camel, Oat",
                "image": ["https://cdn.example.com/crewneck.jpg"],
                "offers": {
                  "@type": "Offer",
                  "price": "1290",
                  "priceCurrency": "USD"
                }
              }
            </script>
          </head>
        </html>
      `
    } as never);

    const product = await parseProductPage("https://shop.example.com/crewneck");

    expect(product.brand).toBe("The Row");
    expect(product.name).toBe("Oversized Cashmere Crewneck");
    expect(product.colors).toEqual(["Camel", "Oat"]);
    expect(product.price).toBe("1290");
    expect(product.currency).toBe("USD");
    expect(product.suggestedTags).toEqual(expect.arrayContaining(["cashmere", "oversized", "layering"]));
  });

  it("falls back to the title tag when structured product data is missing", async () => {
    mockedAxios.get.mockResolvedValue({
      data: `
        <html>
          <head>
            <title>Vintage Denim Jacket | Khaite</title>
          </head>
        </html>
      `
    } as never);

    const product = await parseProductPage("https://shop.example.com/jacket");

    expect(product.brand).toBe("Khaite");
    expect(product.name).toBe("Vintage Denim Jacket");
    expect(product.suggestedTags).toEqual(expect.arrayContaining(["denim", "vintage"]));
  });

  it("throws a fetch error when the remote page cannot be reached", async () => {
    mockedAxios.get.mockRejectedValue(new Error("socket hang up"));

    await expect(parseProductPage("https://shop.example.com/fail")).rejects.toBeInstanceOf(
      ParserFetchError
    );
  });
});
