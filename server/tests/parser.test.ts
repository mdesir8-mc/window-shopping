import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseProductPage,
  ParserFetchError,
  type AiEnricher,
  type HtmlFetcher
} from "../src/services/parser";

const anthropicMessagesCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: anthropicMessagesCreate
    }
  }))
}));

function htmlFetcher(html: string): HtmlFetcher {
  return async () => html;
}

describe("parseProductPage", () => {
  const noopEnricher: AiEnricher = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;
  });

  it("extracts Open Graph and meta tag fields", async () => {
    const product = await parseProductPage("https://shop.example.com/coat", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <meta property="og:title" content="Soft Wool Coat" />
            <meta property="og:image" content="https://cdn.example.com/coat.jpg" />
            <meta property="og:description" content="A warm winter wool coat for layering." />
            <meta property="product:price:amount" content="690" />
            <meta property="product:price:currency" content="USD" />
          </head>
        </html>
      `),
      aiEnricher: noopEnricher
    });

    expect(product.name).toBe("Soft Wool Coat");
    expect(product.imageUrl).toBe("https://cdn.example.com/coat.jpg");
    expect(product.price).toBe("690");
    expect(product.currency).toBe("USD");
    expect(product.suggestedTags).toContain("wool");
    expect(product.suggestedSeason).toBe("Winter");
  });

  it("extracts JSON-LD product fields", async () => {
    const product = await parseProductPage("https://shop.example.com/crewneck", {
      fetcher: htmlFetcher(`
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
      `),
      aiEnricher: noopEnricher
    });

    expect(product.brand).toBe("The Row");
    expect(product.name).toBe("Oversized Cashmere Crewneck");
    expect(product.colors).toEqual(["Camel", "Oat"]);
    expect(product.price).toBe("1290");
    expect(product.currency).toBe("USD");
    expect(product.suggestedTags).toEqual(expect.arrayContaining(["cashmere", "oversized", "layering"]));
  });

  it("extracts Uniqlo product fields from preloaded PDP state", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockResolvedValue({});
    const state = {
      pdp: {
        product: "E482303-000-00"
      },
      entity: {
        pdpEntity: {
          "E482303-000-00": {
            product: {
              colors: [
                { displayCode: "58", name: "DARK GREEN" },
                { displayCode: "00", name: "WHITE" }
              ],
              images: {
                main: {
                  "58": {
                    image: "https://image.uniqlo.com/UQ/ST3/us/imagesgoods/482303/item/usgoods_58_482303_3x4.jpg"
                  }
                }
              },
              longDescription: "<p>Regular fit cotton pique shirt for warm weather.</p>",
              name: "AIRism Cotton Pique Full Open Polo Shirt",
              prices: {
                base: {
                  currency: { code: "USD", symbol: "$" },
                  value: 29.9
                },
                promo: null
              },
              representative: {
                color: { displayCode: "58" },
                sales: true
              }
            }
          }
        }
      }
    };

    const product = await parseProductPage("https://www.uniqlo.com/us/en/products/E482303-000/", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <title>Unisex AIRism Cotton Pique Full Open Polo Shirt | UNIQLO US</title>
            <meta property="og:title" content="Unisex AIRism Cotton Pique Full Open Polo Shirt | UNIQLO US" />
          </head>
          <body>
            <script>window.__PRELOADED_STATE__ = ${JSON.stringify(state)};</script>
          </body>
        </html>
      `),
      aiEnricher
    });

    expect(product.brand).toBe("UNIQLO");
    expect(product.name).toBe("AIRism Cotton Pique Full Open Polo Shirt");
    expect(product.price).toBe("29.9");
    expect(product.currency).toBe("USD");
    expect(product.imageUrl).toBe("https://image.uniqlo.com/UQ/ST3/us/imagesgoods/482303/item/usgoods_58_482303_3x4.jpg");
    expect(product.colors).toEqual(["DARK GREEN", "WHITE"]);
    expect(product.inStock).toBe(true);
    expect(product.suggestedTags).toContain("cotton");
    expect(product.suggestedSeason).toBe("Summer");
    expect(aiEnricher).not.toHaveBeenCalled();
  });

  it("extracts stock from JSON-LD offer availability", async () => {
    const product = await parseProductPage("https://shop.example.com/preorder", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Preorder Coat",
                "image": ["https://cdn.example.com/coat.jpg"],
                "offers": {
                  "@type": "Offer",
                  "price": "450",
                  "availability": "https://schema.org/PreOrder"
                }
              }
            </script>
          </head>
        </html>
      `),
      aiEnricher: noopEnricher
    });

    expect(product.inStock).toBe(true);
  });

  it("extracts stock from Open Graph product availability", async () => {
    const product = await parseProductPage("https://shop.example.com/sold-out", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <meta property="og:title" content="Sold Out Bag" />
            <meta property="product:availability" content="sold out" />
          </head>
        </html>
      `),
      aiEnricher: noopEnricher
    });

    expect(product.inStock).toBe(false);
  });

  it("falls back to body text stock signals", async () => {
    const product = await parseProductPage("https://shop.example.com/available", {
      fetcher: htmlFetcher(`
        <html>
          <body>
            <h1>Linen Shirt</h1>
            <button>Add to cart</button>
            <p>Ready to ship.</p>
          </body>
        </html>
      `),
      aiEnricher: noopEnricher
    });

    expect(product.inStock).toBe(true);
  });

  it("prefers out-of-stock body text when stock signals conflict", async () => {
    const product = await parseProductPage("https://shop.example.com/conflict", {
      fetcher: htmlFetcher(`
        <html>
          <body>
            <button>Add to bag</button>
            <p>Currently unavailable. Notify me when available.</p>
          </body>
        </html>
      `),
      aiEnricher: noopEnricher
    });

    expect(product.inStock).toBe(false);
  });

  it("extracts AggregateOffer lowPrice as the product price", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockResolvedValue({});

    const product = await parseProductPage("https://shop.example.com/sport-jacket", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "Sport Jacket Grey Houndstooth Wool",
                "image": ["https://cdn.example.com/sport-jacket.jpg"],
                "offers": {
                  "@type": "AggregateOffer",
                  "lowPrice": 412.5,
                  "highPrice": 412.5,
                  "priceCurrency": "USD"
                }
              }
            </script>
          </head>
        </html>
      `),
      aiEnricher
    });

    expect(product.price).toBe("412.5");
    expect(aiEnricher).not.toHaveBeenCalled();
  });

  it("falls back to the title tag when structured product data is missing", async () => {
    const product = await parseProductPage("https://shop.example.com/jacket", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <title>Vintage Denim Jacket | Khaite</title>
          </head>
        </html>
      `),
      aiEnricher: noopEnricher
    });

    expect(product.brand).toBe("Khaite");
    expect(product.name).toBe("Vintage Denim Jacket");
    expect(product.suggestedTags).toEqual(expect.arrayContaining(["denim", "vintage"]));
  });

  it("calls AI enrichment when name, price, or image is missing", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockResolvedValue({
      name: "Pleated Trouser",
      price: "850",
      imageUrl: "https://cdn.example.com/trouser.jpg"
    });

    const product = await parseProductPage("https://shop.example.com/trouser", {
      fetcher: htmlFetcher("<html><head></head><body></body></html>"),
      aiEnricher
    });

    expect(aiEnricher).toHaveBeenCalledOnce();
    expect(product.name).toBe("Pleated Trouser");
    expect(product.price).toBe("850");
    expect(product.imageUrl).toBe("https://cdn.example.com/trouser.jpg");
    expect(product.enrichmentSuccess).toBe(true);
  });

  it("flags enrichmentSuccess false when enrichment leaves a gap", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockResolvedValue({
      name: "Pleated Trouser",
      imageUrl: "https://cdn.example.com/trouser.jpg"
      // no price → result stays incomplete
    });

    const product = await parseProductPage("https://shop.example.com/trouser", {
      fetcher: htmlFetcher("<html><head></head><body></body></html>"),
      aiEnricher
    });

    expect(aiEnricher).toHaveBeenCalledOnce();
    expect(product.price).toBeNull();
    expect(product.enrichmentSuccess).toBe(false);
  });

  it("skips AI enrichment when name, price, and image are all present", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockResolvedValue({
      name: "Should Not Be Used"
    });

    const product = await parseProductPage("https://shop.example.com/bag", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <meta property="og:title" content="Leather Bag" />
            <meta property="og:image" content="https://cdn.example.com/bag.jpg" />
            <meta property="product:price:amount" content="1200" />
          </head>
        </html>
      `),
      aiEnricher
    });

    expect(aiEnricher).not.toHaveBeenCalled();
    expect(product.name).toBe("Leather Bag");
    expect(product.enrichmentSuccess).toBeNull();
  });

  it("swallows AI enrichment failures and returns the cheerio result", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockRejectedValue(new Error("Anthropic unavailable"));

    const product = await parseProductPage("https://shop.example.com/skirt", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <title>Bias Cut Skirt | Toteme</title>
          </head>
        </html>
      `),
      aiEnricher
    });

    expect(product.brand).toBe("Toteme");
    expect(product.name).toBe("Bias Cut Skirt");
    expect(product.price).toBeNull();
    expect(product.enrichmentSuccess).toBe(false);
  });

  it("does not overwrite cheerio fields when AI fills remaining gaps", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockResolvedValue({
      name: "Incorrect AI Name",
      price: "740",
      imageUrl: "https://cdn.example.com/heel.jpg"
    });

    const product = await parseProductPage("https://shop.example.com/heel", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <meta property="og:title" content="Satin Slingback" />
          </head>
        </html>
      `),
      aiEnricher
    });

    expect(product.name).toBe("Satin Slingback");
    expect(product.price).toBe("740");
    expect(product.imageUrl).toBe("https://cdn.example.com/heel.jpg");
  });

  it("calls AI enrichment when meta tags are present but empty", async () => {
    const aiEnricher: AiEnricher = vi.fn().mockResolvedValue({
      price: "320",
      imageUrl: "https://cdn.example.com/shirt.jpg"
    });

    const product = await parseProductPage("https://shop.example.com/shirt", {
      fetcher: htmlFetcher(`
        <html>
          <head>
            <meta property="og:title" content="Linen Shirt" />
            <meta property="og:image" content="" />
            <meta property="product:price:amount" content="" />
          </head>
        </html>
      `),
      aiEnricher
    });

    expect(aiEnricher).toHaveBeenCalledOnce();
    expect(product.price).toBe("320");
    expect(product.imageUrl).toBe("https://cdn.example.com/shirt.jpg");
  });

  it("uses Claude Haiku fallback and preserves numeric price fields", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    anthropicMessagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            name: "Wool Jacket",
            price: 412.5,
            originalPrice: 550,
            imageUrl: "https://cdn.example.com/wool-jacket.jpg"
          })
        }
      ]
    });

    const product = await parseProductPage("https://shop.example.com/wool-jacket", {
      fetcher: htmlFetcher("<html><body>Wool Jacket</body></html>")
    });

    expect(anthropicMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001"
      })
    );
    expect(product.price).toBe("412.5");
    expect(product.originalPrice).toBe("550");
  });

  it("throws a fetch error when the remote page cannot be reached", async () => {
    const fetcher: HtmlFetcher = async () => {
      throw new Error("socket hang up");
    };

    await expect(
      parseProductPage("https://shop.example.com/fail", { fetcher })
    ).rejects.toBeInstanceOf(ParserFetchError);
  });
});
