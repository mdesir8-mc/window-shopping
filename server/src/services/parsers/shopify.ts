import type { ParsedProduct } from "../../../../shared/types";
import { safeFetch } from "../../utils/safeFetch";

// Any Shopify storefront exposes a product as JSON at `/products/<handle>.js`
// (prices in cents, no auth, no anti-bot). This lets us skip HTML scraping and the
// AI fallback for the hundreds of DTC fashion brands that run on Shopify.

const FETCH_TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface ShopifyVariant {
  id: number;
  price: number;
  compare_at_price: number | null;
  available: boolean;
  options: string[];
}

interface ShopifyOption {
  name: string;
  position: number;
  values: string[];
}

interface ShopifyProductJs {
  title: string;
  handle: string;
  vendor?: string;
  description?: string;
  available?: boolean;
  price?: number;
  compare_at_price?: number | null;
  featured_image?: string | null;
  images?: string[];
  options?: ShopifyOption[];
  variants?: ShopifyVariant[];
}

function money(cents: unknown): string | null {
  if (typeof cents !== "number" || !Number.isFinite(cents) || cents <= 0) {
    return null;
  }
  const value = cents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function httpsify(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  return url.startsWith("//") ? `https:${url}` : url;
}

function stripHtml(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
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
    // Shopify serves /products/<handle>.js as `text/javascript`, so don't gate on
    // content-type — parse the body and let shape validation reject non-JSON.
    return JSON.parse(result.text);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function colorOption(product: ShopifyProductJs): ShopifyOption | null {
  return (product.options ?? []).find((option) => /colou?r/i.test(option.name)) ?? null;
}

function extractColors(product: ShopifyProductJs, selectedVariantId: string | null): string[] {
  const option = colorOption(product);
  if (!option) {
    return [];
  }

  if (selectedVariantId) {
    const variant = (product.variants ?? []).find((entry) => String(entry.id) === selectedVariantId);
    const value = variant?.options?.[option.position - 1];
    if (value) {
      return [value];
    }
  }

  return Array.from(new Set(option.values.filter(Boolean)));
}

export async function fetchShopifyProduct(url: URL): Promise<Partial<ParsedProduct> | null> {
  const match = url.pathname.match(/^(.*\/products\/[^/?#]+)/i);
  if (!match) {
    return null;
  }

  const data = await fetchJson(`${url.origin}${match[1]}.js`);
  const product = data as ShopifyProductJs | null;

  // Guard: only treat as Shopify when the JSON really is a product document.
  if (!product || typeof product.title !== "string" || typeof product.handle !== "string" || !Array.isArray(product.variants)) {
    return null;
  }

  const selectedVariantId = url.searchParams.get("variant");
  const selectedVariant =
    (selectedVariantId && product.variants.find((entry) => String(entry.id) === selectedVariantId)) || null;

  const priceCents = selectedVariant?.price ?? product.price;
  const compareCents = selectedVariant?.compare_at_price ?? product.compare_at_price ?? null;
  const price = money(priceCents);
  const original = money(compareCents);

  // product.js carries no currency code; the shop-wide meta.json does.
  const meta = (await fetchJson(`${url.origin}/meta.json`)) as { currency?: string } | null;

  const imageUrl =
    httpsify(selectedVariant ? null : product.featured_image) ??
    httpsify(product.images?.[0]) ??
    httpsify(product.featured_image);

  // Most stores put the brand in `vendor`, but some (e.g. Gymshark) misuse it for
  // the colorway ("Black/Asphalt Grey"). Real brands rarely contain a slash.
  const vendor = product.vendor?.trim();
  const brand = vendor && !vendor.includes("/") ? vendor : null;

  return {
    brand,
    name: product.title.trim() || null,
    price,
    originalPrice: original && original !== price ? original : null,
    currency: price ? meta?.currency ?? null : null,
    imageUrl,
    description: stripHtml(product.description),
    inStock: typeof (selectedVariant?.available ?? product.available) === "boolean"
      ? (selectedVariant?.available ?? product.available ?? null)
      : null,
    colors: extractColors(product, selectedVariantId)
  };
}
