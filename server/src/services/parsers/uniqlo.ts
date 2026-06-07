import * as cheerio from "cheerio";
import type { ParsedProduct } from "../../../../shared/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
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

function textFromHtmlFragment(value: string | null) {
  if (!value) {
    return null;
  }

  const $ = cheerio.load(value);
  const text = $.text().replace(/\s+/g, " ").trim();
  return text || value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
}

function extractPreloadedState(html: string) {
  const marker = "window.__PRELOADED_STATE__ = ";
  const start = html.indexOf(marker);

  if (start === -1) {
    return null;
  }

  const jsonStart = start + marker.length;
  const scriptEnd = html.indexOf("</script>", jsonStart);
  const raw = html
    .slice(jsonStart, scriptEnd === -1 ? undefined : scriptEnd)
    .trim()
    .replace(/;$/, "");

  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

function priceText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return asText(value);
}

function extractPrice(prices: unknown) {
  const priceRecord = asRecord(prices);
  const base = asRecord(priceRecord?.base);
  const promo = asRecord(priceRecord?.promo);
  const baseValue = priceText(base?.value);
  const promoValue = priceText(promo?.value);
  const currency = firstText([
    asRecord(promo?.currency)?.code,
    asRecord(base?.currency)?.code
  ]);

  return {
    price: promoValue ?? baseValue,
    originalPrice: promoValue && baseValue && promoValue !== baseValue ? baseValue : null,
    currency
  };
}

function extractImage(product: Record<string, unknown>) {
  const images = asRecord(product.images);
  const mainImages = asRecord(images?.main);
  const representative = asRecord(product.representative);
  const representativeColor = asRecord(representative?.color);
  const representativeColorCode = asText(representativeColor?.displayCode);
  const candidates: unknown[] = [];

  if (representativeColorCode && mainImages) {
    candidates.push(asRecord(mainImages[representativeColorCode])?.image);
  }

  if (mainImages) {
    for (const image of Object.values(mainImages)) {
      candidates.push(asRecord(image)?.image);
    }
  }

  return firstText(candidates);
}

export function extractUniqloProduct(html: string, url: URL): Partial<ParsedProduct> {
  if (!/(^|\.)uniqlo\.com$/i.test(url.hostname)) {
    return {};
  }

  const state = extractPreloadedState(html);
  const pdp = asRecord(state?.pdp);
  const entity = asRecord(state?.entity);
  const pdpEntity = asRecord(entity?.pdpEntity);
  const productKey = asText(pdp?.product);
  const keyedEntry = productKey && pdpEntity ? asRecord(pdpEntity[productKey]) : null;
  let product = asRecord(keyedEntry?.product);

  if (!product && pdpEntity) {
    for (const entry of Object.values(pdpEntity)) {
      const candidate = asRecord(asRecord(entry)?.product);
      if (candidate) {
        product = candidate;
        break;
      }
    }
  }

  if (!product) {
    return {};
  }

  const representative = asRecord(product.representative);
  const colors = Array.isArray(product.colors)
    ? product.colors
        .map((color) => asText(asRecord(color)?.name))
        .filter((color): color is string => color !== null)
    : [];
  const prices = extractPrice(product.prices);
  const sales = representative?.sales;
  const description = textFromHtmlFragment(
    asText(product.longDescription) ?? asText(product.shortDescription)
  );

  return {
    brand: "UNIQLO",
    name: asText(product.name),
    price: prices.price,
    originalPrice: prices.originalPrice,
    currency: prices.currency,
    imageUrl: extractImage(product),
    description,
    inStock: typeof sales === "boolean" ? sales : null,
    colors
  };
}
