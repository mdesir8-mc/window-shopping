import * as cheerio from "cheerio";
import type { ParsedProduct } from "../../../../shared/types";

const CURRENCY_SYMBOLS: Array<[string, string]> = [
  ["$", "USD"],
  ["£", "GBP"],
  ["€", "EUR"],
  ["¥", "JPY"],
  ["₹", "INR"]
];

const HOST_CURRENCY: Array<[RegExp, string]> = [
  [/\.co\.uk$/i, "GBP"],
  [/\.de$|\.fr$|\.es$|\.it$|\.nl$/i, "EUR"],
  [/\.co\.jp$/i, "JPY"],
  [/\.ca$/i, "CAD"],
  [/\.com\.au$/i, "AUD"],
  [/\.in$/i, "INR"]
];

function asText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isAmazonHost(hostname: string): boolean {
  return /(^|\.)amazon\.[a-z.]+$/i.test(hostname);
}

function currencyFromHost(hostname: string): string {
  for (const [pattern, code] of HOST_CURRENCY) {
    if (pattern.test(hostname)) {
      return code;
    }
  }
  return "USD";
}

function parsePrice(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const match = raw.replace(/[\s,]/g, "").match(/\d+(?:\.\d+)?/);
  return match ? match[0] : null;
}

function currencyFromRaw(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  for (const [symbol, code] of CURRENCY_SYMBOLS) {
    if (raw.includes(symbol)) {
      return code;
    }
  }
  return null;
}

function extractBrand($: cheerio.CheerioAPI): string | null {
  const byline = asText($("#bylineInfo").first().text());
  if (byline) {
    const cleaned = byline
      .replace(/^visit the\s+/i, "")
      .replace(/\s+store$/i, "")
      .replace(/^brand:\s*/i, "")
      .trim();
    if (cleaned) {
      return cleaned;
    }
  }

  // Product overview table row, e.g. "Brand | STANLEY".
  const poBrand = asText($("tr.po-brand td.a-span9 .po-break-word").first().text());
  if (poBrand) {
    return poBrand;
  }

  return asText($("a#brand").first().text());
}

// First non-strikethrough price; the strikethrough `.a-text-price` is the list price.
function extractCurrentPrice($: cheerio.CheerioAPI): string | null {
  const selectors = [
    "#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen",
    "#corePrice_feature_div .a-price .a-offscreen",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    "#priceblock_saleprice",
    "span.a-price .a-offscreen"
  ];
  for (const selector of selectors) {
    const value = asText($(selector).first().text());
    if (value) {
      return value;
    }
  }
  return null;
}

function extractListPrice($: cheerio.CheerioAPI): string | null {
  const selectors = [
    "#corePriceDisplay_desktop_feature_div .a-price.a-text-price .a-offscreen",
    "span[data-a-strike='true'] .a-offscreen",
    ".basisPrice .a-offscreen"
  ];
  for (const selector of selectors) {
    const value = asText($(selector).first().text());
    if (value) {
      return value;
    }
  }
  return null;
}

function extractImage($: cheerio.CheerioAPI): string | null {
  const landing = $("#landingImage").first();
  const oldHires = asText(landing.attr("data-old-hires"));
  if (oldHires) {
    return oldHires;
  }

  const dynamic = landing.attr("data-a-dynamic-image");
  if (dynamic) {
    try {
      const map = JSON.parse(dynamic) as Record<string, unknown>;
      const first = Object.keys(map)[0];
      if (first) {
        return first;
      }
    } catch {
      // Ignore malformed dynamic-image map.
    }
  }

  return asText(landing.attr("src")) ?? asText($("#imgTagWrapperId img").first().attr("src"));
}

function extractDescription($: cheerio.CheerioAPI): string | null {
  const bullets = $("#feature-bullets li span.a-list-item")
    .map((_, el) => asText($(el).text()))
    .get()
    .filter((entry): entry is string => !!entry && !/see more/i.test(entry));

  if (bullets.length > 0) {
    return bullets.join(" · ");
  }

  return asText($("#productDescription").first().text());
}

function extractStock($: cheerio.CheerioAPI): boolean | null {
  const availability = asText($("#availability").first().text())?.toLowerCase() ?? "";

  if (/(currently unavailable|out of stock|unavailable)/.test(availability)) {
    return false;
  }
  if (/(in stock|only \d+ left|ships|usually)/.test(availability)) {
    return true;
  }
  if ($("#add-to-cart-button").length > 0 || $("#buy-now-button").length > 0) {
    return true;
  }
  return null;
}

function extractColors($: cheerio.CheerioAPI): string[] {
  const selectors = [
    "#variation_color_name .selection",
    "#inline-twister-expander-content-color_name .selection"
  ];
  for (const selector of selectors) {
    const value = asText($(selector).first().text());
    if (value) {
      return [value];
    }
  }
  return [];
}

export function extractAmazonProduct(html: string, url: URL): Partial<ParsedProduct> {
  if (!isAmazonHost(url.hostname)) {
    return {};
  }

  const $ = cheerio.load(html);
  const name = asText($("#productTitle").first().text());

  // No product title means this is not a recognizable PDP (e.g. a robot check or
  // search page). Bail so the generic parser / AI fallback can take over.
  if (!name) {
    return {};
  }

  const currentPriceRaw = extractCurrentPrice($);
  const listPriceRaw = extractListPrice($);
  const price = parsePrice(currentPriceRaw);
  const originalPrice = parsePrice(listPriceRaw);
  const currency = currencyFromRaw(currentPriceRaw) ?? currencyFromHost(url.hostname);

  return {
    brand: extractBrand($),
    name,
    price,
    originalPrice: originalPrice && originalPrice !== price ? originalPrice : null,
    currency: price ? currency : null,
    imageUrl: extractImage($),
    description: extractDescription($),
    inStock: extractStock($),
    colors: extractColors($)
  };
}
