import * as cheerio from "cheerio";
import type { ParsedProduct } from "../../../shared/types";
import { fetchRenderedHtml } from "./browser";
import { extractUniqloProduct } from "./parsers/uniqlo";
import { extractAmazonProduct } from "./parsers/amazon";
import { extractCarharttProduct } from "./parsers/carhartt";
import { fetchShopifyProduct } from "./parsers/shopify";
import { fetchWooCommerceProduct } from "./parsers/woocommerce";
import { fetchViaUnblocker } from "./unblocker";
import { safeFetch } from "../utils/safeFetch";

export class ParserFetchError extends Error {}

// Hosts whose bot walls (PerimeterX, Akamai JS challenge) block both the headless
// render and the plain raw fetch — the unblocker tier is required to get past them.
const HARD_WALL_HOSTS = new Set(["therealreal.com", "nordstrom.com"]);

function isHardWallHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return HARD_WALL_HOSTS.has(lower) || [...HARD_WALL_HOSTS].some((h) => lower.endsWith("." + h));
}
export type HtmlFetcher = (url: string) => Promise<string>;
export type AiEnricher = (
  html: string,
  partial: ParsedProduct
) => Promise<Partial<ParsedProduct>>;

const TAG_KEYWORDS: Record<string, string[]> = {
  wool: ["wool", "merino", "lambswool"],
  cashmere: ["cashmere"],
  leather: ["leather", "suede"],
  denim: ["denim", "jean"],
  oversized: ["oversized", "relaxed fit", "boyfriend fit"],
  vintage: ["vintage", "archive"],
  silk: ["silk", "satin"],
  cotton: ["cotton", "poplin", "jersey"],
  linen: ["linen", "flax"],
  knit: ["knit", "ribbed", "cardigan", "sweater"],
  layering: ["layering", "layer", "transitional"],
  structured: ["structured", "tailored"],
  investment: ["timeless", "investment", "signature"],
  print: ["print", "patterned", "floral"],
  woven: ["woven", "basketweave"],
  flats: ["flat", "ballet"],
  grail: ["grail"]
};

const SEASON_PATTERNS: Array<[string, RegExp]> = [
  ["Winter", /\bwinter\b|\bf\/w\b|\bfw\b|cold weather/],
  ["Fall", /\bfall\b|\bautumn\b/],
  ["Summer", /\bsummer\b|\bs\/s\b|\bss\b|warm weather/],
  ["Spring", /\bspring\b/]
];

const IN_STOCK_AVAILABILITY = new Set([
  "instock",
  "limitedavailability",
  "preorder",
  "backorder"
]);

const OUT_OF_STOCK_AVAILABILITY = new Set([
  "discontinued",
  "outofstock",
  "soldout"
]);

const RAW_FETCH_TIMEOUT_MS = 12_000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function normalizeUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  return url;
}

function metaContent($: cheerio.CheerioAPI, key: string) {
  return (
    $(`meta[property="${key}"]`).attr("content") ??
    $(`meta[name="${key}"]`).attr("content") ??
    $(`meta[itemprop="${key}"]`).attr("content") ??
    null
  );
}

function collectProducts(node: unknown, found: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    node.forEach((entry) => collectProducts(entry, found));
    return found;
  }

  if (!node || typeof node !== "object") {
    return found;
  }

  const record = node as Record<string, unknown>;
  const typeValue = record["@type"];

  if (
    (typeof typeValue === "string" && typeValue.toLowerCase() === "product") ||
    (Array.isArray(typeValue) && typeValue.some((entry) => typeof entry === "string" && entry.toLowerCase() === "product"))
  ) {
    found.push(record);
  }

  for (const value of Object.values(record)) {
    collectProducts(value, found);
  }

  return found;
}

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return null;
}

function firstText(values: unknown[]) {
  for (const value of values) {
    const text = asText(value);
    if (text) {
      return text;
    }
  }

  return null;
}

function extractBrand(product: Record<string, unknown>) {
  const brand = product.brand;

  if (typeof brand === "string") {
    return brand.trim() || null;
  }

  if (brand && typeof brand === "object") {
    return asText((brand as Record<string, unknown>).name);
  }

  return null;
}

function extractOfferField(offers: unknown, field: string) {
  const candidates = Array.isArray(offers) ? offers : [offers];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const record = candidate as Record<string, unknown>;
    const value = record[field];
    const text = asText(value);
    if (text) {
      return text;
    }

    if (field === "price" && value !== undefined && value !== null) {
      return String(value);
    }
  }

  if (field === "price") {
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") {
        continue;
      }

      const lowPrice = (candidate as Record<string, unknown>).lowPrice;
      if (lowPrice !== undefined && lowPrice !== null) {
        return String(lowPrice);
      }
    }
  }

  return null;
}

function normalizeAvailability(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\/(?:www\.)?schema\.org\//, "")
    .replace(/[^a-z]/g, "");
}

function stockFromAvailability(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = normalizeAvailability(value);

  if (IN_STOCK_AVAILABILITY.has(normalized)) {
    return true;
  }

  if (OUT_OF_STOCK_AVAILABILITY.has(normalized)) {
    return false;
  }

  return null;
}

function extractStockFromOffers(offers: unknown) {
  const candidates = Array.isArray(offers) ? offers : [offers];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const availability = asText((candidate as Record<string, unknown>).availability);
    const stock = stockFromAvailability(availability);
    if (stock !== null) {
      return stock;
    }
  }

  return null;
}

function stockFromOgAvailability(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().replace(/[^a-z]/g, "");

  if (normalized.includes("outofstock") || normalized.includes("soldout")) {
    return false;
  }

  if (normalized.includes("instock")) {
    return true;
  }

  return null;
}

function stockFromBodyText(text: string) {
  const lower = text.toLowerCase();
  const outOfStockSignals = [
    "sold out",
    "out of stock",
    "currently unavailable",
    "notify me when available"
  ];
  const inStockSignals = [
    "add to cart",
    "add to bag",
    "in stock",
    "available now",
    "ready to ship"
  ];

  if (outOfStockSignals.some((signal) => lower.includes(signal))) {
    return false;
  }

  if (inStockSignals.some((signal) => lower.includes(signal))) {
    return true;
  }

  return null;
}

function extractOriginalPrice(offers: unknown) {
  const candidates = Array.isArray(offers) ? offers : [offers];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const record = candidate as Record<string, unknown>;
    const priceSpecification = record.priceSpecification;
    if (priceSpecification && typeof priceSpecification === "object") {
      const price = asText((priceSpecification as Record<string, unknown>).price);
      if (price) {
        return price;
      }
    }

    const highPrice = asText(record.highPrice);
    if (highPrice) {
      return highPrice;
    }
  }

  return null;
}

function extractColors(colorValue: unknown) {
  const raw = firstText([colorValue]);

  if (!raw) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(/,|\/|\||;/g)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function inferTags(text: string) {
  const lower = text.toLowerCase();
  const tags = Object.entries(TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
    .map(([tag]) => tag);

  return Array.from(new Set(tags));
}

function inferSeason(text: string) {
  const lower = text.toLowerCase();

  for (const [season, pattern] of SEASON_PATTERNS) {
    if (pattern.test(lower)) {
      return season;
    }
  }

  return null;
}

function extractTitleFallback(title: string | null) {
  if (!title) {
    return { brand: null, name: null };
  }

  const parts = title
    .split(/\s+[|—–-]\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      brand: parts[parts.length - 1],
      name: parts[0]
    };
  }

  return {
    brand: null,
    name: title.trim()
  };
}

async function fetchRawHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RAW_FETCH_TIMEOUT_MS);
  try {
    const result = await safeFetch(url, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      signal: controller.signal
    });

    if (!result.ok) {
      throw new Error(`Request failed with status ${result.status}`);
    }

    return result.text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${RAW_FETCH_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Amazon is awkward to scrape without JS:
//   1. It intermittently answers with a "Continue shopping" anti-bot interstitial
//      (HTTP 200, title "Amazon.com", no product markup).
//   2. Even on a real PDP it A/B-serves two variants — one with the price inlined
//      server-side, one where the price block is hydrated client-side (no price in
//      the HTML at all).
// Both are random per request, so retry until we get a PDP that actually contains a
// price (falling back to the first usable PDP) instead of dropping to the AI enricher.
const AMAZON_MAX_ATTEMPTS = 8;
const AMAZON_RETRY_DELAY_MS = 400;

function isAmazonPdp(html: string): boolean {
  return html.includes('id="productTitle"');
}

function amazonHtmlHasPrice(html: string): boolean {
  return /class="a-offscreen">\s*[^<]*\d/.test(html);
}

async function fetchAmazonHtml(url: string): Promise<string> {
  let last = "";
  let firstPdp = "";

  for (let attempt = 0; attempt < AMAZON_MAX_ATTEMPTS; attempt += 1) {
    last = await fetchRawHtml(url);

    if (isAmazonPdp(last)) {
      if (amazonHtmlHasPrice(last)) {
        return last;
      }
      if (!firstPdp) {
        firstPdp = last;
      }
    }

    if (attempt < AMAZON_MAX_ATTEMPTS - 1) {
      // Linear backoff to let Amazon's short-term burst throttle clear.
      await new Promise((resolve) => setTimeout(resolve, AMAZON_RETRY_DELAY_MS * (attempt + 1)));
    }
  }

  return firstPdp || last;
}

function isComplete(result: ParsedProduct): boolean {
  return !!result.name && !!result.price && !!result.imageUrl;
}

function extractBodyText(html: string, maxLength = 15_000): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const fallback = html.replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, maxLength);
}

function parseClaudeResponse(text: string): Partial<ParsedProduct> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  if (!cleaned) {
    return {};
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const record = parsed as Record<string, unknown>;
    return {
      brand: asText(record.brand) ?? null,
      name: asText(record.name) ?? null,
      price: asText(record.price) ?? (typeof record.price === "number" ? String(record.price) : null),
      originalPrice: asText(record.originalPrice) ?? (typeof record.originalPrice === "number" ? String(record.originalPrice) : null),
      currency: asText(record.currency) ?? null,
      imageUrl: asText(record.imageUrl) ?? null,
      description: asText(record.description) ?? null,
      inStock: typeof record.inStock === "boolean" ? record.inStock : null,
      colors: Array.isArray(record.colors)
        ? record.colors.filter((entry): entry is string => typeof entry === "string")
        : undefined
    };
  } catch {
    return {};
  }
}

async function claudeEnrich(html: string, _partial: ParsedProduct): Promise<Partial<ParsedProduct>> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return {};
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system:
        "You extract product information from retail HTML. Return only a JSON object. Use null for uncertain fields and never invent missing data.",
      messages: [
        {
          role: "user",
          content:
            "Extract product data from this product page content. " +
            'Return JSON with keys: brand, name, price, originalPrice, currency, imageUrl, description, inStock, colors. ' +
            `HTML content:\n${extractBodyText(html)}`
        }
      ]
    });

    const textBlock = response.content.find((entry) => entry.type === "text");
    return textBlock?.type === "text" ? parseClaudeResponse(textBlock.text) : {};
  } catch (error) {
    console.error("Claude enrichment failed:", error);
    return {};
  }
}

function mergePartial(base: ParsedProduct, extra: Partial<ParsedProduct>): ParsedProduct {
  return {
    brand: base.brand || extra.brand || null,
    name: base.name || extra.name || null,
    price: base.price || extra.price || null,
    originalPrice: base.originalPrice || extra.originalPrice || null,
    currency: base.currency || extra.currency || null,
    imageUrl: base.imageUrl || extra.imageUrl || null,
    description: base.description || extra.description || null,
    inStock: base.inStock ?? extra.inStock ?? null,
    colors: base.colors.length > 0 ? base.colors : extra.colors ?? [],
    suggestedTags: base.suggestedTags,
    suggestedSeason: base.suggestedSeason,
    source: base.source,
    // Pass through; parseProductPage overwrites this with the post-merge completeness.
    enrichmentSuccess: base.enrichmentSuccess
  };
}

export async function parseProductPage(
  rawUrl: string,
  options?: { fetcher?: HtmlFetcher; aiEnricher?: AiEnricher; demoMode?: boolean }
): Promise<ParsedProduct> {
  const url = normalizeUrl(rawUrl);
  let html: string;

  // Hard-wall hosts (PerimeterX / Akamai challenge) block both the Shopify/WooCommerce
  // probes and the headless render — skip those probes to avoid an 8s timeout.
  const hardWall = !options?.fetcher && isHardWallHost(url.hostname);

  // Shopify storefronts expose product JSON at /products/<handle>.js — use it and
  // skip HTML scraping + AI fallback entirely when the URL resolves to one.
  const shopify =
    options?.fetcher || hardWall ? null : await fetchShopifyProduct(url).catch(() => null);
  // WooCommerce stores expose a Store API (/wp-json/wc/store/products) — gated on a
  // product-permalink base segment so the probe stays off non-Woo URLs. Same win as
  // Shopify: skip HTML scraping + AI when it resolves.
  const woo =
    options?.fetcher || shopify || hardWall
      ? null
      : await fetchWooCommerceProduct(url).catch(() => null);

  try {
    const fetcher = options?.fetcher;
    if (fetcher) {
      html = await fetcher(url.toString());
    } else if (shopify || woo) {
      html = "";
    } else if (hardWall && !options?.demoMode) {
      // Route through the unblocker tier (ScrapingBee or equivalent) for hosts whose
      // bot walls are impenetrable by normal fetch/render.  demoMode (unauthenticated
      // public path) never reaches here — it costs money and is an abuse vector.
      const unblocked = await fetchViaUnblocker(url.toString());
      if (unblocked === null) {
        // Unblocker disabled (env unset) or daily cap exceeded.  The headless render
        // and raw fetch are guaranteed to return the bot-wall interstitial for these
        // hosts, so fail fast rather than wasting time on a known-bad path.
        throw new ParserFetchError(
          "Unblocker not configured or daily cap reached for this retailer."
        );
      }
      html = unblocked;
    } else if (hardWall && options?.demoMode) {
      // demoMode on a hard-wall host: skip the render (it will only return the
      // bot-wall interstitial) and return an empty-ish result rather than 502.
      html = "";
    } else if (/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) {
      // Amazon serves headless browsers a "Continue shopping" anti-bot
      // interstitial, so a plain request with browser-like headers (which
      // returns the real PDP) is preferred over the rendered fetch here.
      try {
        html = await fetchAmazonHtml(url.toString());
      } catch (renderError) {
        console.error("[parser] Amazon fetch failed, falling back to rendered:", renderError);
        html = await fetchRenderedHtml(url.toString());
      }
    } else {
      try {
        html = await fetchRenderedHtml(url.toString());
      } catch (renderError) {
        console.error("[parser] rendered fetch failed, falling back to raw:", renderError);
        html = await fetchRawHtml(url.toString());
      }
    }
  } catch (error) {
    throw new ParserFetchError(
      error instanceof Error ? error.message : "Unable to fetch the remote product page."
    );
  }

  const $ = cheerio.load(html);
  const title = $("title").first().text().trim() || null;
  const ogTitle = metaContent($, "og:title");
  const ogDescription = metaContent($, "og:description");
  const ogImage = metaContent($, "og:image");
  const ogPrice = metaContent($, "og:price:amount") ?? metaContent($, "product:price:amount");
  const ogCurrency =
    metaContent($, "og:price:currency") ?? metaContent($, "product:price:currency");
  const ogAvailability = metaContent($, "product:availability");

  const products: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text().trim();
    if (!raw) {
      return;
    }

    try {
      collectProducts(JSON.parse(raw), products);
    } catch {
      // Ignore malformed structured data blocks and continue.
    }
  });

  const product = products[0] ?? {};
  const offers = product.offers;
  const titleFallback = extractTitleFallback(ogTitle ?? title);
  const siteProduct: Partial<ParsedProduct> = {
    ...extractUniqloProduct(html, url),
    ...extractAmazonProduct(html, url),
    ...extractCarharttProduct(html, url),
    ...(shopify ?? {}),
    ...(woo ?? {})
  };

  const brand = siteProduct.brand ?? extractBrand(product) ?? titleFallback.brand;
  const name = siteProduct.name ?? asText(product.name) ?? ogTitle ?? titleFallback.name;
  const description = siteProduct.description ?? asText(product.description) ?? ogDescription;
  const price = siteProduct.price ?? extractOfferField(offers, "price") ?? ogPrice;
  const originalPrice = siteProduct.originalPrice ?? extractOriginalPrice(offers);
  const currency = siteProduct.currency ?? extractOfferField(offers, "priceCurrency") ?? ogCurrency;
  const bodyText = extractBodyText(html, 5_000);
  const inStock =
    siteProduct.inStock ??
    extractStockFromOffers(offers) ??
    stockFromOgAvailability(ogAvailability) ??
    stockFromBodyText(bodyText);
  const imageUrl =
    siteProduct.imageUrl ??
    firstText([
      Array.isArray(product.image) ? product.image[0] : product.image,
      ogImage
    ]) ??
    null;
  const colors = siteProduct.colors?.length ? siteProduct.colors : extractColors(product.color);
  const textForInference = [brand, name, description].filter(Boolean).join(" ");

  let result: ParsedProduct = {
    brand,
    name,
    price,
    originalPrice,
    currency,
    imageUrl,
    description,
    inStock,
    colors,
    suggestedTags: inferTags(textForInference),
    suggestedSeason: inferSeason(textForInference),
    source: url.hostname.replace(/^www\./, ""),
    enrichmentSuccess: null
  };

  // demoMode (public landing-page preview) skips AI enrichment entirely so the
  // unauthenticated path never spends Claude $; an incomplete cheerio result is
  // returned as-is with enrichmentSuccess left null.
  if (!isComplete(result) && !options?.demoMode) {
    const enricher = options?.aiEnricher ?? claudeEnrich;
    try {
      const extra = await enricher(html, result);
      result = mergePartial(result, extra);
      // The enricher (incl. claudeEnrich) swallows its own errors and returns {} on
      // failure, so a still-incomplete result here means enrichment did not deliver.
      result.enrichmentSuccess = isComplete(result);
    } catch {
      // Enricher threw outright: keep the parser result but flag the gap.
      result.enrichmentSuccess = false;
    }
  }

  return result;
}
