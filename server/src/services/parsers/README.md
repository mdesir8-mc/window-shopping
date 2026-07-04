# Product Parsers

Site-specific extractors used by [`parser.ts`](../parser.ts). Each `extract*`
function returns a `Partial<ParsedProduct>` and no-ops (`{}`) when the URL host
doesn't match, so `parseProductPage` can spread them all and let the matching one
win. Anything not covered here falls through to the generic structured-data path,
then to Claude AI enrichment.

## How resolution works

`parseProductPage` resolves a URL in this order:

1. **Shopify** — if the URL resolves to a Shopify storefront (`/products/<handle>.js`
   returns a product JSON document), use that and skip HTML scraping + AI entirely.
2. **WooCommerce** — if the URL has a product-permalink base (`/product/<slug>` or a
   WPML locale variant) and the store exposes the no-auth Store API
   (`/wp-json/wc/store/products?slug=<slug>`), use that and skip HTML scraping + AI.
3. **Amazon** — plain request with browser headers + anti-bot retry (the rendered
   fetch gets served the "Continue shopping" interstitial).
4. **Rendered fetch** (headless Chromium) for everything else, falling back to a raw
   fetch if the render fails.
5. **Site-specific parsers** run against the fetched HTML (Uniqlo, Carhartt, …).
6. **Generic structured data** — JSON-LD `Product`, OpenGraph/`product:*` meta,
   microdata, `<title>` fallback.
7. **Claude enrichment** — only if the result is still incomplete (missing name,
   price, or image) **and** not in `demoMode` (the public landing-page preview
   skips AI so the unauthenticated path never spends Claude $).

## Confirmed working

### Dedicated parsers

| Service | Host match | Strategy | Notes |
|---------|-----------|----------|-------|
| **Shopify** (platform) | any store exposing `/products/<handle>.js` | product JSON endpoint | Covers the hundreds of DTC fashion brands on Shopify. One parser, many stores. |
| **WooCommerce** (platform) | `/product/<slug>` (+ WPML bases `prodotto`/`producto`/`produkt`/`produit`/`produto`) exposing `/wp-json/wc/store/products` | no-auth Store API | Prices are minor-unit integer strings (`currency_minor_unit`); `regular_price` → `originalPrice` when `on_sale`; brand/color often unset on single-brand stores (fall through to generic/AI). Fetch via `safeFetch`; on failure falls back to the rendered generic path. |
| **Amazon** | `amazon.*` (any TLD) | HTML DOM scrape + anti-bot retry | `#productTitle`, `.a-offscreen` price, strikethrough list price → `originalPrice`; currency from symbol/host; 8-attempt retry for the price-hydration A/B + robot-check interstitial. |
| **Uniqlo** | `uniqlo.com` | `window.__PRELOADED_STATE__` JSON | Brand fixed to `UNIQLO`; `promo`/`base` prices → `price`/`originalPrice`; colors + stock from `representative`. |
| **Carhartt** | `carhartt.com` | JSON-LD `Product` | Color pulled from main image `alt` (JSON-LD `color` is null pre-hydration); AggregateOffer low/high is a size range, not a markdown, so no `originalPrice`. |

### Working via the generic path (no dedicated parser)

| Service | Notes |
|---------|-------|
| **Farfetch** | Works via the rendered fetch + generic structured data. Requires the headless render to wait for navigation `commit` (heavy SPA); a plain fetch 502s. |
| **Squarespace Commerce** (platform) | Works via the rendered fetch + generic JSON-LD (brand, name, price, currency, image, description, stock all resolve). Only gaps: the `<title>` fallback appends `— <StoreName>` to the name, and `colors`/`originalPrice` aren't captured. A thin `?format=json` parser could clean those up, but the generic path already covers the essentials — low priority. |

Any retailer with clean JSON-LD `Product` or OpenGraph `product:*` meta generally
parses through the generic path without a dedicated file.

## Behind the unblocker tier

These sites have clean JSON-LD once the bot wall is cleared, but both the headless render
and a plain browser-UA fetch are blocked before any markup is reached. They route through
the configurable unblocker provider (`server/src/services/unblocker.ts`) before the
generic structured-data extractor runs.

**Required env vars:**
- `UNBLOCKER_API_URL` — provider endpoint (e.g. `https://app.scrapingbee.com/api/v1/`)
- `UNBLOCKER_API_KEY` — your API key

When either env var is unset the unblocker is disabled and requests to these hosts
return a 502 immediately (falling through to the headless render would only waste time
on a guaranteed bot-wall response). Live verification of name/price/image extraction
requires a real API key.

| Service | Bot wall | Notes |
|---------|---------|-------|
| **The RealReal** | PerimeterX `403` `px-captcha` (`_pxAppId 'PXev56mY37'`) | Both headless render and plain browser-UA fetch blocked. Expects clean JSON-LD `Product` once cleared. |
| **Nordstrom** | Akamai JS challenge (`istlWasHere`, 257 KB interstitial, empty `<title>`) | Same class as The RealReal. Plain fetch returns the interstitial with HTTP 200. |

## Known broken

| Service | Status |
|---------|--------|
| **SSENSE** | Previously worked, now fails for reasons unknown. Not yet diagnosed — likely a change to their markup or bot protection. Needs investigation. |

## Adding a new parser

1. Create `parsers/<site>.ts` exporting `extract<Site>Product(html, url)`.
2. Guard on `url.hostname` and return `{}` on no match.
3. Prefer the site's own structured data (embedded JSON, JSON-LD) over DOM scraping
   where possible — it survives redesigns better.
4. Spread it into `siteProduct` in [`parser.ts`](../parser.ts).
