import axios from "axios";
import * as cheerio from "cheerio";
import type { ParsedProduct } from "../types";

export class ParserFetchError extends Error {}

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

    const value = (candidate as Record<string, unknown>)[field];
    const text = asText(value);
    if (text) {
      return text;
    }

    if (field === "price" && value !== undefined && value !== null) {
      return String(value);
    }
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

export async function parseProductPage(rawUrl: string): Promise<ParsedProduct> {
  const url = normalizeUrl(rawUrl);
  let html: string;

  try {
    const response = await axios.get<string>(url.toString(), {
      headers: {
        "User-Agent": "WindowShoppingBot/1.0 (+https://window-shopping.local)"
      },
      maxRedirects: 5,
      responseType: "text",
      timeout: 10_000,
      validateStatus: (status) => status >= 200 && status < 400
    });

    html = response.data;
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

  const brand = extractBrand(product) ?? titleFallback.brand;
  const name = asText(product.name) ?? ogTitle ?? titleFallback.name;
  const description = asText(product.description) ?? ogDescription;
  const price = extractOfferField(offers, "price") ?? ogPrice;
  const originalPrice = extractOriginalPrice(offers);
  const currency = extractOfferField(offers, "priceCurrency") ?? ogCurrency;
  const imageUrl =
    firstText([
      Array.isArray(product.image) ? product.image[0] : product.image,
      ogImage
    ]) ?? null;
  const colors = extractColors(product.color);
  const textForInference = [brand, name, description].filter(Boolean).join(" ");

  return {
    brand,
    name,
    price,
    originalPrice,
    currency,
    imageUrl,
    description,
    colors,
    suggestedTags: inferTags(textForInference),
    suggestedSeason: inferSeason(textForInference),
    source: url.hostname.replace(/^www\./, "")
  };
}
