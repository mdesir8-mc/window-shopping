import * as cheerio from "cheerio";
import type { ParsedProduct } from "../../../../shared/types";

function asText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.replace(/\s+/g, " ").trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function isCarharttHost(hostname: string): boolean {
  return /(^|\.)carhartt\.com$/i.test(hostname);
}

// Carhartt ships a JSON-LD Product block; pull the first one out.
function findLdProduct($: cheerio.CheerioAPI): Record<string, unknown> | null {
  let product: Record<string, unknown> | null = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    if (product) {
      return;
    }
    const raw = $(element).contents().text().trim();
    if (!raw) {
      return;
    }
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (node && typeof node === "object" && (node as Record<string, unknown>)["@type"] === "Product") {
          product = node as Record<string, unknown>;
          return;
        }
      }
    } catch {
      // Ignore malformed structured data.
    }
  });

  return product;
}

function extractBrand(product: Record<string, unknown>): string | null {
  const brand = product.brand;
  if (typeof brand === "string") {
    return asText(brand);
  }
  if (brand && typeof brand === "object") {
    return asText((brand as Record<string, unknown>).name);
  }
  return "Carhartt";
}

function firstOffer(offers: unknown): Record<string, unknown> | null {
  if (Array.isArray(offers)) {
    return (offers.find((entry) => entry && typeof entry === "object") as Record<string, unknown>) ?? null;
  }
  if (offers && typeof offers === "object") {
    return offers as Record<string, unknown>;
  }
  return null;
}

function availabilityToStock(value: unknown): boolean | null {
  const text = asText(value)?.toLowerCase().replace(/[^a-z]/g, "");
  if (!text) {
    return null;
  }
  if (text.includes("instock") || text.includes("limited") || text.includes("preorder")) {
    return true;
  }
  if (text.includes("outofstock") || text.includes("soldout") || text.includes("discontinued")) {
    return false;
  }
  return null;
}

// The displayed variant's color lives in the main product image alt, formatted as
// "Carhartt <color> <product name>" (e.g. "Carhartt Carhartt Brown Rugged Flex...").
// JSON-LD `color` is null and swatches are only marked selected after hydration.
function extractColor($: cheerio.CheerioAPI, name: string | null): string[] {
  const alt = asText($("img.main-static-image").first().attr("alt"));
  if (!alt) {
    return [];
  }

  let color = alt;
  if (name) {
    color = color.replace(name, "");
  }
  color = color.replace(/^carhartt\s+/i, "").trim();

  return color ? [color] : [];
}

export function extractCarharttProduct(html: string, url: URL): Partial<ParsedProduct> {
  if (!isCarharttHost(url.hostname)) {
    return {};
  }

  const $ = cheerio.load(html);
  const product = findLdProduct($);
  if (!product) {
    return {};
  }

  const name = asText(product.name);
  const offer = firstOffer(product.offers);
  const price = asText(offer?.price) ?? asText(offer?.lowPrice);
  const currency = asText(offer?.priceCurrency);
  // Carhartt's AggregateOffer low/high is a size price range, not a markdown, so
  // we intentionally do not surface highPrice as an "original" (was) price.
  const description = asText(product.description)?.replace(/^description/i, "").trim() ?? null;
  const ldImage = Array.isArray(product.image) ? asText(product.image[0]) : asText(product.image);
  const mainImage = asText($("img.main-static-image").first().attr("src"));

  return {
    brand: extractBrand(product),
    name,
    price,
    originalPrice: null,
    currency: price ? currency : null,
    imageUrl: mainImage ?? ldImage,
    description,
    inStock: availabilityToStock(offer?.availability),
    colors: asText(product.color) ? [asText(product.color) as string] : extractColor($, name)
  };
}
