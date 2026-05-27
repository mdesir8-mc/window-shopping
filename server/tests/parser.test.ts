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
