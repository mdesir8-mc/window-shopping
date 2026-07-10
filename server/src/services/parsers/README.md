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
3. **Squarespace Commerce** — if the URL has a `/p/<slug>` store-item segment and
   `<path>?format=json` returns a `StoreItem` (`recordType 11`), use that and skip
   HTML scraping + AI.
4. **Amazon** — plain request with browser headers + anti-bot retry (the rendered
   fetch gets served the "Continue shopping" interstitial).
5. **Rendered fetch** (headless Chromium) for everything else, falling back to a raw
   fetch if the render fails.
6. **Site-specific parsers** run against the fetched HTML (Uniqlo, Carhartt, …).
7. **Generic structured data** — JSON-LD `Product`, OpenGraph/`product:*` meta,
   microdata, `<title>` fallback.
8. **Claude enrichment** — only if the result is still incomplete (missing name,
   price, or image) **and** not in `demoMode` (the public landing-page preview
   skips AI so the unauthenticated path never spends Claude $).

## Confirmed working

### Dedicated parsers

| Service | Host match | Strategy | Notes |
|---------|-----------|----------|-------|
| **Shopify** (platform) | any store exposing `/products/<handle>.js` | product JSON endpoint | Covers the hundreds of DTC fashion brands on Shopify. One parser, many stores. |
| **WooCommerce** (platform) | `/product/<slug>` (+ WPML bases `prodotto`/`producto`/`produkt`/`produit`/`produto`) exposing `/wp-json/wc/store/products` | no-auth Store API | Prices are minor-unit integer strings (`currency_minor_unit`); `regular_price` → `originalPrice` when `on_sale`; brand/color often unset on single-brand stores (fall through to generic/AI). Fetch via `safeFetch`; on failure falls back to the rendered generic path. |
| **Squarespace Commerce** (platform) | `/p/<slug>` store-item path exposing `<path>?format=json` (`recordType 11` / `structuredContent._type === "StoreItem"`) | store-item JSON endpoint | Clean `item.title` (no `— <StoreName>` suffix); price/currency from `variants[0].priceMoney` (item/structuredContent prices are `0.00` when set per-variant); `onSale` splits `salePriceMoney` (live) vs `priceMoney` (`originalPrice`); colors from `variantOptionOrdering` + variant `optionValues`/`attributes`; image prefers direct CDN `item.items[]`; description from `item.excerpt`. Brand left unset (falls through to generic). Fetch via `safeFetch`; on failure falls back to the rendered generic path. |
| **Amazon** | `amazon.*` (any TLD) | HTML DOM scrape + anti-bot retry | `#productTitle`, `.a-offscreen` price, strikethrough list price → `originalPrice`; currency from symbol/host; 8-attempt retry for the price-hydration A/B + robot-check interstitial. |
| **Uniqlo** | `uniqlo.com` | `window.__PRELOADED_STATE__` JSON | Brand fixed to `UNIQLO`; `promo`/`base` prices → `price`/`originalPrice`; colors + stock from `representative`. |
| **Carhartt** | `carhartt.com` | JSON-LD `Product` | Color pulled from main image `alt` (JSON-LD `color` is null pre-hydration); AggregateOffer low/high is a size range, not a markdown, so no `originalPrice`. |
| **Grailed** | `grailed.com` | `__NEXT_DATA__` listing blob | **Requires a real browser User-Agent on the render** — Cloudflare 403s Chromium's default `HeadlessChrome` UA (see below). Brand from `designerNames`; `priceDrops` is the descending price history whose last entry is the current price, so `priceDrops[0]` → `originalPrice` when `dropped`; color from the `traits` list; `inStock` = `!sold`. Description comes from the listing (the JSON-LD one is boilerplate: "Find `<name>` and more items on grailed.com"). Currency is absent from the blob, so it's left to the generic JSON-LD offer (`USD`). |

### Working via the generic path (no dedicated parser)

| Service | Notes |
|---------|-------|
| **Farfetch** | Works via the rendered fetch + generic structured data. Requires the headless render to wait for navigation `commit` (heavy SPA); a plain fetch 502s. |

Any retailer with clean JSON-LD `Product` or OpenGraph `product:*` meta generally
parses through the generic path without a dedicated file.

## Render User-Agent

Playwright's headless Chromium advertises `HeadlessChrome` in its User-Agent, which some
Cloudflare configurations reject with a `403` before any markup is served. `fetchRenderedHtml`
takes an optional `userAgent` so a host that needs a real browser UA can opt in
(`parseProductPage` passes `GRAILED_RENDER_USER_AGENT` for `grailed.com`); every other host
keeps Chromium's default. This is a per-host override rather than a global default so the
render behaviour for already-working retailers is unchanged.

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
