import type { ParsedProduct } from "../../../../shared/types";
import { safeFetch } from "../../utils/safeFetch";

// WooCommerce stores expose a no-auth read Store API at
// `/wp-json/wc/store/products?slug=<slug>` (prices in minor units, currency code,
// stock, images). Like the Shopify parser, this lets us skip HTML scraping + the AI
// fallback for the thousands of indie brands running on WooCommerce/WordPress.

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Product permalink base segment across common WPML locales. Gating on this keeps
// the Store API probe off every non-WooCommerce URL we parse.
const PRODUCT_BASES = new Set([
  "product",
  "producto",
  "produkt",
  "produit",
  "prodotto",
  "produto"
]);

interface WooPrices {
  price?: string;
  regular_price?: string;
  sale_price?: string;
  currency_code?: string;
  currency_minor_unit?: number;
}

interface WooTerm {
  name?: string;
}

interface WooAttribute {
  name?: string;
  terms?: WooTerm[];
}

interface WooImage {
  src?: string;
}

interface WooBrand {
  name?: string;
}

interface WooStoreProduct {
  name?: string;
  slug?: string;
  type?: string;
  permalink?: string;
  short_description?: string;
  description?: string;
  on_sale?: boolean;
  is_in_stock?: boolean;
  prices?: WooPrices;
  images?: WooImage[];
  brands?: WooBrand[];
  attributes?: WooAttribute[];
}

// Store API prices are integer strings in the currency's minor unit (e.g. "11990"
// with minor_unit 2 -> 119.90).
function money(minor: string | undefined, minorUnit: number | undefined): string | null {
  if (typeof minor !== "string" || !/^\d+$/.test(minor)) {
    return null;
  }
  const units = Number.isFinite(minorUnit) ? (minorUnit as number) : 2;
  const value = Number(minor) / 10 ** units;
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(units);
}

function stripHtml(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function extractColors(product: WooStoreProduct): string[] {
  const attribute = (product.attributes ?? []).find((entry) =>
    /^colou?r$/i.test((entry.name ?? "").trim())
  );
  const values = (attribute?.terms ?? [])
    .map((term) => term.name?.trim())
    .filter((name): name is string => Boolean(name));
  return Array.from(new Set(values));
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

export async function fetchWooCommerceProduct(url: URL): Promise<Partial<ParsedProduct> | null> {
  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  // Product URLs look like /<base>/<slug>/ where <base> is "product" (or a WPML
  // locale variant). The slug is the segment following the base.
  const baseIndex = segments.findIndex((segment) => PRODUCT_BASES.has(segment.toLowerCase()));
  const slug = baseIndex >= 0 ? segments[baseIndex + 1] : undefined;
  if (!slug) {
    return null;
  }

  const data = await fetchJson(
    `${url.origin}/wp-json/wc/store/products?slug=${encodeURIComponent(slug)}`
  );

  // The Store API returns an array; match the requested slug so a store that
  // returns a fuzzy/empty result doesn't hand us the wrong product.
  const product = Array.isArray(data)
    ? (data.find((entry) => (entry as WooStoreProduct)?.slug === slug) as WooStoreProduct | undefined)
    : undefined;

  // Guard: only treat as WooCommerce when the JSON really is a Store API product.
  if (!product || typeof product.name !== "string" || !product.prices) {
    return null;
  }

  const prices = product.prices;
  const minorUnit = prices.currency_minor_unit;
  const price = money(prices.price, minorUnit);
  const regular = money(prices.regular_price, minorUnit);
  const original = product.on_sale && regular && regular !== price ? regular : null;

  const imageUrl = product.images?.find((image) => image.src)?.src ?? null;
  const brand = product.brands?.find((entry) => entry.name)?.name?.trim() ?? null;

  return {
    brand,
    name: product.name.trim() || null,
    price,
    originalPrice: original,
    currency: price ? prices.currency_code ?? null : null,
    imageUrl,
    description: stripHtml(product.short_description) ?? stripHtml(product.description),
    inStock: typeof product.is_in_stock === "boolean" ? product.is_in_stock : null,
    colors: extractColors(product)
  };
}
