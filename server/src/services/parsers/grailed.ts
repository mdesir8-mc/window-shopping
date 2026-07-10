import * as cheerio from "cheerio";
import type { ParsedProduct } from "../../../../shared/types";

// Grailed is a Next.js app that server-renders the whole listing into a
// `__NEXT_DATA__` blob. The page also ships a JSON-LD `Product`, but its description
// is boilerplate ("Find <name> and more items on grailed.com") and it carries no
// color, size, or price history — so we read the listing object instead and let the
// generic path supply the currency from JSON-LD offers.
//
// Grailed sits behind Cloudflare, which 403s Playwright's default `HeadlessChrome`
// User-Agent. The render must present a real browser UA; see GRAILED_RENDER_USER_AGENT.

export const GRAILED_RENDER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export function isGrailedHost(hostname: string): boolean {
  return /(^|\.)grailed\.com$/i.test(hostname);
}

interface GrailedPhoto {
  url?: string;
}

interface GrailedTrait {
  name?: string;
  value?: string;
}

interface GrailedListing {
  title?: string;
  description?: string;
  designerNames?: string;
  price?: number;
  priceDrops?: number[];
  dropped?: boolean;
  sold?: boolean;
  photos?: GrailedPhoto[];
  traits?: GrailedTrait[];
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function money(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function findListing(html: string): GrailedListing | null {
  const $ = cheerio.load(html);
  const raw = $("script#__NEXT_DATA__").first().contents().text().trim();
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw) as {
      props?: { pageProps?: { listing?: GrailedListing } };
    };
    const listing = data.props?.pageProps?.listing;
    // Guard: only treat as a listing when the blob really carries a titled product.
    return listing && typeof listing.title === "string" ? listing : null;
  } catch {
    return null;
  }
}

// `priceDrops` is the full descending price history with the current price as its last
// entry (e.g. [175, 157, 141] for a listing now at 141). The first entry is the original
// ask, so surface it as `originalPrice` — but only when the seller actually dropped it.
function extractOriginalPrice(listing: GrailedListing, price: string | null): string | null {
  if (!listing.dropped || !price) {
    return null;
  }
  const original = money(listing.priceDrops?.[0]);
  return original && original !== price ? original : null;
}

// Grailed stores structured attributes as a `traits` list; color is one of them
// (values are lowercase, e.g. "blue").
function extractColors(listing: GrailedListing): string[] {
  const color = (listing.traits ?? []).find((trait) => trait.name === "color")?.value;
  const value = asText(color);
  return value ? [value] : [];
}

export function extractGrailedProduct(html: string, url: URL): Partial<ParsedProduct> {
  if (!isGrailedHost(url.hostname)) {
    return {};
  }

  const listing = findListing(html);
  if (!listing) {
    return {};
  }

  const price = money(listing.price);

  return {
    brand: asText(listing.designerNames),
    name: asText(listing.title),
    price,
    originalPrice: extractOriginalPrice(listing, price),
    // The listing carries no currency code; the JSON-LD offer does, so leave it for
    // the generic path to fill rather than hardcoding USD.
    imageUrl: asText(listing.photos?.[0]?.url),
    // The seller's own copy, as opposed to the boilerplate JSON-LD description.
    description: asText(listing.description),
    inStock: typeof listing.sold === "boolean" ? !listing.sold : null,
    colors: extractColors(listing)
  };
}
