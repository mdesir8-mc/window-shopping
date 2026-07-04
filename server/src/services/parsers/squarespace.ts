import type { ParsedProduct } from "../../../../shared/types";
import { safeFetch } from "../../utils/safeFetch";

// Squarespace Commerce serves any store-item page as JSON at `<product-path>?format=json`
// (no auth, no anti-bot). The generic JSON-LD path already handles these stores, but it
// suffers three gaps this parser closes: the name carries a `— <StoreName>` suffix, colors
// are missing, and the sale/original price isn't split out. The item JSON has the clean
// title, per-variant prices, and variant options, so we short-circuit like Shopify/Woo.

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Squarespace store-item URLs are always `<store-base>/p/<slug>` regardless of the store's
// configured base ("shop", "store", custom). Gating on the `/p/<slug>` segment keeps the
// probe off non-product URLs; shape validation below rejects any false positive.
const PRODUCT_PATH = /\/p\/[^/?#]+/;

interface SqspMoney {
  value?: string;
  currency?: string;
}

interface SqspOptionValue {
  optionName?: string;
  value?: string;
}

interface SqspVariant {
  priceMoney?: SqspMoney;
  salePriceMoney?: SqspMoney;
  onSale?: boolean;
  qtyInStock?: number;
  unlimited?: boolean;
  optionValues?: SqspOptionValue[];
  attributes?: Record<string, string>;
}

interface SqspStructuredContent {
  _type?: string;
  productType?: number;
  variants?: SqspVariant[];
}

interface SqspItemImage {
  assetUrl?: string;
}

interface SqspItem {
  recordType?: number;
  title?: string;
  excerpt?: string;
  body?: string;
  assetUrl?: string;
  items?: SqspItemImage[];
  variantOptionOrdering?: string[];
  structuredContent?: SqspStructuredContent;
}

interface SqspResponse {
  item?: SqspItem;
}

function stripHtml(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

// priceMoney.value is a decimal string ("190.00"). Normalise to a trimmed string, dropping
// a trailing `.00` so "190.00" -> "190" (matching the Shopify/Woo money() output), and
// reject zero/blank so the caller can fall through to the generic path.
function money(money: SqspMoney | undefined): string | null {
  const raw = money?.value?.trim();
  if (!raw || !/^\d+(\.\d+)?$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

// The displayed price comes from the variants, not the item/structuredContent priceMoney
// (those are 0.00 when the price is set per-variant). Use the first variant, splitting
// sale vs. original per Squarespace semantics: when onSale, salePriceMoney is the live
// price and priceMoney is the struck-through original.
function extractPrice(variant: SqspVariant | undefined): {
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
} {
  if (!variant) {
    return { price: null, originalPrice: null, currency: null };
  }
  const regular = money(variant.priceMoney);
  const sale = variant.onSale ? money(variant.salePriceMoney) : null;
  const price = sale ?? regular;
  const originalPrice = sale && regular && regular !== sale ? regular : null;
  const currency = price ? variant.salePriceMoney?.currency ?? variant.priceMoney?.currency ?? null : null;
  return { price, originalPrice, currency };
}

function extractColors(item: SqspItem): string[] {
  const variants = item.structuredContent?.variants ?? [];
  // Find the colour option name from the store's option ordering, defaulting to a
  // case-insensitive "color"/"colour" match.
  const colorOption = (item.variantOptionOrdering ?? []).find((name) => /colou?r/i.test(name));

  const values: string[] = [];
  for (const variant of variants) {
    // Prefer the structured optionValues array; fall back to the attributes map.
    const fromOptionValues = (variant.optionValues ?? []).find((entry) =>
      colorOption ? entry.optionName === colorOption : /colou?r/i.test(entry.optionName ?? "")
    )?.value;
    const fromAttributes = colorOption ? variant.attributes?.[colorOption] : undefined;
    const value = (fromOptionValues ?? fromAttributes)?.trim();
    if (value) {
      values.push(value);
    }
  }
  return Array.from(new Set(values));
}

function extractInStock(variants: SqspVariant[]): boolean | null {
  if (variants.length === 0) {
    return null;
  }
  return variants.some(
    (variant) => variant.unlimited === true || (typeof variant.qtyInStock === "number" && variant.qtyInStock > 0)
  );
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const result = await safeFetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal
    });
    if (!result.ok) {
      return null;
    }
    return JSON.parse(result.text);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSquarespaceProduct(url: URL): Promise<Partial<ParsedProduct> | null> {
  if (!PRODUCT_PATH.test(url.pathname)) {
    return null;
  }

  const data = (await fetchJson(`${url.origin}${url.pathname}?format=json`)) as SqspResponse | null;
  const item = data?.item;

  // Guard: only treat as Squarespace Commerce when the JSON really is a store item.
  if (!item || item.recordType !== 11 || item.structuredContent?._type !== "StoreItem") {
    return null;
  }

  const variants = item.structuredContent.variants ?? [];
  const { price, originalPrice, currency } = extractPrice(variants[0]);

  // Direct CDN image (item.items[].assetUrl) is cleaner than the redirect-style item.assetUrl.
  const imageUrl = item.items?.find((image) => image.assetUrl)?.assetUrl ?? item.assetUrl ?? null;

  return {
    name: item.title?.trim() || null,
    price,
    originalPrice,
    currency,
    imageUrl,
    description: stripHtml(item.excerpt) ?? stripHtml(item.body),
    inStock: extractInStock(variants),
    colors: extractColors(item)
  };
}
