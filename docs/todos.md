# Todos

A running list of features and fixes I want to make. Newest ideas can go at the
bottom of each section; check things off as they ship.

## Fixes

- [x] **Surface parser enrichment failures to frontend** — added tri-state
  `enrichmentSuccess` (`boolean | null`) to `ParsedProduct`: `null` = parse complete /
  manual entry, `true` = AI enrichment filled the gaps, `false` = enrichment ran but the
  result is still incomplete or the enricher threw. Set in `parseProductPage`
  (`server/src/services/parser.ts`), passed through `mergePartial`. AddItemFlow preview
  shows a "couldn't fully read this page" warning when the flag is `false`.
- [ ] **Daily refresh email cron not firing on Railway** — the Railway Cron job
  running `npm run job:refresh` isn't triggering reliably; investigate Railway Cron
  config, job logs, and whether the service is being reached correctly.
- [x] **Refresh-stale button not updating item cards in prod** — debugged: query-key
  invalidation was a red herring (`["items"]` prefix-matches the grid query, refetch
  fires correctly). Real cause: `ItemCard` shows `formatRelativeDate(item.addedAt)` —
  the add date, which never moves on refresh; only the stale dot ● reflects
  `lastCheckedAt`, and it only clears when the server actually re-parses (prod parse
  failures legitimately leave it). Decision: keep the card text as `addedAt`, dot is
  the refresh signal. Fix: sidebar now always toasts a run summary
  (`Checked N · …price drops · …couldn't be reached`) so a working refresh gives
  feedback. Server-side parse reliability for prod retailer pages left as a separate gap.

- [x] **Item refresh tests failing** — mocked the SSRF guard in tests so refresh
  assertions pass without live DNS. Fix on `claude/fix-refresh-tests`.
- [x] **Verify Google sign-in renders in production** — after the Dockerfile
  build-arg fix deploys, load `/login` on the live site and complete a sign-in.
- [ ] **Clear residual `undici` HIGH advisory (dev/CI only)** — `npm audit` flags
  `undici 6.26.0` (GHSA-vxpw-j846-p89q WebSocket-DoS + GHSA-p88m-4jfj-68fv header
  injection) via `npm@11 → node-gyp@12 → undici`, bundled inside the npm CLI that
  `@semantic-release/npm` vendors. Not runtime-exploitable (app runtime pins the safe
  `undici@7.28`; the WS-DoS path isn't reached by node-gyp) and not `overrides`-fixable
  (bundledDependencies). Clears when npm ships a node-gyp bundling `undici ≥6.27`; bump
  npm/@semantic-release/npm then. Also tracking the related `esbuild` LOW (vite→esbuild,
  Windows dev-server only). Watch item, not urgent.

- [ ] **`safeFetch` single-IP pinning is fragile against Cloudflare anycast** — surfaced
  while testing the WooCommerce Store API locally. `safeFetch` (server/src/utils/safeFetch.ts)
  resolves one vetted IP and pins the undici connection to it (no Happy-Eyeballs), for SSRF
  safety. Against Cloudflare-fronted hosts (which return several anycast IPs) the single
  pinned IP is often unreachable *from local dev*, so the fetch intermittently throws
  `fetch failed` / `ERR_INVALID_IP_ADDRESS`; plain happy-eyeballs undici was 100% reliable to
  the same hosts. This affects **every** `safeFetch` caller (Shopify, WooCommerce, Amazon
  raw), masked today by each parser's `.catch → generic-render` fallback. Unconfirmed whether
  it also bites in prod (Railway may reach all anycast IPs). Investigate: does Railway see the
  failures? If so, consider trying all vetted IPs (validate every address, then Happy-Eyeballs
  across the vetted set) instead of pinning one.

## Features

- [x] **Account menu / sign-out from the sidebar avatar** — clicking the
  bottom-left account block opens a page-centered Account settings modal with
  General (appearance + sign out) and Profile tabs.
- [x] **Editable display name / profile** — Profile tab lets users change their
  display name (PATCH /api/user); Google accounts can override the synced name
  (Google login no longer re-syncs name for linked accounts).
- [x] **Empty state gaps** — audited every main view. Only gap was ClosetDetail's
  item grid; added empty states for empty closet (CTA to add first item), empty
  section, and no-search-match. Home and ClosetGrid already covered.
- [x] **Email infrastructure** — Resend transactional email service at
  `server/src/services/email.ts` (`sendEmail`, `getAppBaseUrl`, `EmailSendError`)
  plus `email-templates.ts` (inline-CSS layout + `simpleNotice`). Inert under
  `NODE_ENV=test` / missing `RESEND_API_KEY`; env keys added to `.env.example`.
  Price-drop + password-reset features build on top of this.
- [x] **Price drop notifications** — `refreshStaleItemsForUser` (server/src/services/refresh.ts)
  shared by the manual `refresh-stale` route and a daily `jobs/refresh-all.ts` cron;
  emails a digest of price drops + out-of-stock *transitions* via `priceDropEmail`,
  gated on a new `User.emailNotifications` pref (toggle in Account settings). Every send
  is recorded in the new `EmailLog` table. Railway Cron runs `npm run job:refresh` daily.
- [x] **Password reset** — `PasswordResetToken` model (sha256-hashed, single-use,
  1h expiry); `POST /api/auth/forgot-password` (anti-enumeration, always 200) +
  `POST /api/auth/reset-password`; `/forgot-password` + `/reset-password` pages and
  a "Forgot password?" link on Login. Google accounts can set a password without
  breaking either login method. Existing JWTs still survive a reset (noted).
- [x] **Mobile / responsive layout** — `useIsMobile` hook (matchMedia ≤768px);
  AppShell switches to single-column block layout; Sidebar becomes sticky top-bar
  with expandable drawer (chip-style closet/season rows, horizontally scrollable);
  Modal adapts to bottom-sheet (full-width, rounded top corners, slide-up animation).
- [ ] **Back-in-stock alerts** — refresh already emails out-of-stock *transitions*
  (`notifyPriceChanges` in `server/src/services/refresh.ts`); add the reverse
  transition (`inStock` false→true) to the same digest. `inStock` is already tracked
  per item. Reuse the existing email infra (`priceDropEmail` / `email-templates.ts`)
  and the daily `jobs/refresh-all.ts` cron; gate on the existing `User.emailNotifications`
  pref. Mostly: detect the transition in `refreshItemRecord`/`refreshStaleItemsForUser`
  and add a "back in stock" section to the digest template.

- [ ] **Target-price alerts** — let users set a desired price per item; email when the
  refreshed price drops to or below it. Add `targetPrice String?` (or normalized number)
  to `Item` (`server/prisma/schema.prisma` + migration), expose in `ItemPayload`
  (`shared/types.ts`) and the item form/drawer. In `refreshStaleItemsForUser`, compare
  `parsePriceToNumber(price)` against the target and send via the existing
  `priceDropEmail` path. Reuses email + cron; no new notification channel.

- [ ] **Price history + sparkline** — biggest value, medium cost. Today `Item.price` is a
  single String with no history. Add a `PriceSnapshot { id, itemId, price, inStock,
  capturedAt }` model (+ index on `itemId, capturedAt`); write one row each time
  `refreshItemRecord` runs (and on create). Expose `GET /api/items/:id/history`; render a
  small sparkline in `ItemDrawer` (and optionally on `ItemCard`). Note: price is a
  formatted String, so store the parsed number alongside for charting. Consider a
  retention cap (e.g. keep last N or 1/day) so the table doesn't grow unbounded.

- [ ] **Shareable public closet link** — read-only, no-auth view of one closet via a
  share token. Add a `shareToken String? @unique` (or `public Boolean`) to `Closet`;
  new **public** route (`GET /api/public/closets/:token`) that bypasses the auth
  middleware and returns only safe fields (no user PII, no internal ids beyond what's
  needed to render); new unauthenticated frontend page that reuses `ItemGrid`/`ItemCard`
  read-only. **Security surface — review carefully:** token must be unguessable, route
  must be rate-limited, and revoking the token must invalidate the link.

- [ ] **Landing-page parse demo** — let visitors paste a URL and see it parsed before
  signing up. Parse logic is already auth-independent: `parseProductPage` +
  `validateSsrfSafeUrl` in `POST /api/items/parse-url` ([items.ts:204]), only blocked by
  being mounted behind `requireAuth`. No model/migration/PII — read-only, nothing
  persisted. **Security surface — review carefully:** unauth arbitrary-URL fetch open to
  the internet (SSRF guard is the critical defense — reuse PR #53's hardened
  `validateSsrfSafeUrl` + `safeFetch`, don't reimplement) and $ abuse (each parse runs a
  headless browser + Claude enrichment). Mitigations baked into the plan below.

  **Plan**

  _Backend_
  - `parseProductPage` ([server/src/services/parser.ts:522]) signature becomes
    `options?: { fetcher?: HtmlFetcher; aiEnricher?: AiEnricher; demoMode?: boolean }`.
    Gate the enrichment block by changing line 633 to `if (!isComplete(result) &&
    !options?.demoMode)` — so in demo mode an *incomplete* cheerio result is returned as-is
    with `enrichmentSuccess: null` and `claudeEnrich` is never reached. (Complete pages
    already skip enrichment, so this only matters for incomplete ones.) No Claude call ⇒ no
    $ on the public path. Authed `/api/items/parse-url` is unchanged (option absent).
  - New router `server/src/routes/public.ts` with `POST /parse-url`: `requireString(url)`
    → `validateSsrfSafeUrl(url)` → `parseProductPage(safe, { demoMode: true })`, same
    `ParserFetchError → 502` mapping as the authed route. No auth, no DB.
  - **SSRF (reuse, do not reimplement):** all three fetch paths inside `parseProductPage`
    are already hardened by PR #53 — `fetchRawHtml`/`fetchAmazonHtml` go through `safeFetch`
    (DNS-pinned to the vetted IP), and `fetchRenderedHtml` (Playwright) routes through the
    localhost SSRF-pinning proxy + re-validates every redirect target
    ([browser.ts:66]). The route just calls `validateSsrfSafeUrl` up front like the authed
    route; no new guard code.
  - **Stricter** rate limit: `demoParseLimiter` = `windowMs 60s, max 3` per IP (vs the
    authed `parseLimiter` 10/min), `skip` under `NODE_ENV==="test"`. Plus a module-level
    **global daily cap** (in-memory counter, resets on UTC day rollover) → `429` when
    exceeded; covers the distributed-IP abuse the per-IP limiter misses. Threshold is a
    module constant so tests can set it low — **caveat:** in-memory ⇒ per-process, resets on
    restart and is not shared across instances; adequate for the current single-instance
    Railway deploy, would need Redis if scaled horizontally.
  - Mount in [server/src/index.ts:69] as `app.use("/api/public", publicRoutes)` —
    **before** the `/api` 404 catch-all (line 70) and **outside** `requireAuth`.
  - Tests (`server/tests/`, vitest, mirror `api.test.ts`): (a) public parse returns a
    product via injected `fetcher` mock; (b) SSRF-blocked URL → rejected/4xx; (c) demoMode
    skips enrichment — pass a spy `aiEnricher` and assert it is never called on an
    incomplete page; (d) global daily cap → 429 by driving requests past a low injected
    threshold (not the real default, to keep the test deterministic).

  _Frontend (api + hook)_
  - `src/api/items.ts`: add `parseUrlPublic(url)` → `POST /api/public/parse-url` (reuses
    `apiClient`; works unauth). Hook `useParseUrlPublic()` in `src/hooks/useItems.ts`
    mirroring `useParseUrl` (line 83).

  _UI_
  - Extract the preview card markup from `AddItemFlow` ([AddItemFlow.tsx:441]) into a
    shared `src/components/items/ProductPreviewCard.tsx` (ProductTile + brand/name/price);
    refactor `AddItemFlow` to consume it (surgical, no behavior change).
  - New `src/components/items/LandingParseDemo.tsx`: URL input + "Try it" button →
    `useParseUrlPublic` → states idle / loading / preview / error. Preview renders
    `ProductPreviewCard` + a "Sign up to save this" CTA (`<Link to="/register">`). On fetch
    failure show an inline "couldn't reach that page" message (no enrichment warning — demo
    is always `enrichmentSuccess: null`). Carry over `AddItemFlow`'s `"Untitled product"`
    name fallback ([AddItemFlow.tsx:460]) so a nameless parse still renders.
  - Embed `LandingParseDemo` on `src/pages/Landing.tsx` (hero section, above "How it
    works"). Login page reuse optional/skipped to keep scope tight.

- [ ] **Expand parser coverage (new retailers)** — add dedicated/hardened parsers for
  the sites below, ranked by ease of impl. Confirmed-working set + this list documented
  in `server/src/services/parsers/README.md`. Pattern: guard on `url.hostname`, prefer the
  site's own embedded JSON / JSON-LD over DOM scraping, spread into `siteProduct` in
  `parser.ts`. Each should ship with a fixture-backed test mirroring the existing parser
  tests. Ordered easiest → hardest:
  1. [x] **WooCommerce** (platform) — **shipped** (`parsers/woocommerce.ts`, wired into
     `parser.ts` as a Shopify-style short-circuit; `tests/woocommerce.test.ts`). Uses the
     no-auth Store API (`/wp-json/wc/store/products?slug=<slug>`), gated on a
     product-permalink base (`/product/` + WPML locale variants) so it doesn't probe every
     URL. Verified live against goshopia/nordrepublic/akke. Note: `safeFetch`'s single-IP
     pinning is flaky against Cloudflare anycast hosts *from local dev* (falls back to the
     generic render path on failure) — see the separate safeFetch reliability item below.
  2. [x] **Squarespace Commerce** (platform) — **shipped** (`parsers/squarespace.ts`, wired
     into `parser.ts` as a Shopify-style short-circuit; `tests/squarespace.test.ts`). Uses
     the `<path>?format=json` store-item endpoint, gated on the `/p/<slug>` segment. Closes
     the generic-path gaps: clean `item.title` (drops the `— <StoreName>` suffix), colors
     from variant options, and `originalPrice` from `onSale`/`salePriceMoney`. Price/currency
     come from `variants[0]` (item/structuredContent prices are `0.00` per-variant). Shape
     verified live against aaksonline.com; color/sale paths covered by builder tests (AAKS
     products are single-variant, so live color verification is pending a variant store).
  3. [x] **The RealReal** — **addressed pending API key.** Unblocker tier shipped
     (`server/src/services/unblocker.ts`): set `UNBLOCKER_API_URL` + `UNBLOCKER_API_KEY`
     (ScrapingBee or equivalent) and The RealReal routes through it automatically. Clean
     JSON-LD `Product` is expected once the PerimeterX wall is cleared. Documented in
     README "Behind the unblocker tier". Live verification requires a real key.
  4. [x] **Nordstrom** — **addressed pending API key.** Same unblocker tier as The RealReal
     (Akamai JS challenge). Set the env vars and Nordstrom routes through automatically.
     Documented in README "Behind the unblocker tier".
  5. **Grailed** — menswear resale, very on-brand. React SPA but embeds `__NEXT_DATA__` /
     JSON-LD; extract the Next.js data blob after render.
  6. **ASOS** — big catalog; structured data + internal `/api/product/`. Some bot
     protection — may need rendered-fetch hardening.
  7. **SSENSE** — luxury, super on-brand. **Regression, not a new add: used to work, now
     broken for unknown reasons** (see README "Known broken"). Diagnose first (markup change
     vs. new bot wall) before deciding effort. React SPA + likely Cloudflare.

  _Note: Farfetch now works via the generic rendered path (headless render must wait for
  navigation `commit`; plain fetch 502s) — no dedicated parser needed. Recorded in README._

## iOS App (Expo / React Native)

Build the iOS app reusing the existing API + data layer. **Phases are ordered — do
not start a phase until every prereq below it is checked.** Full plan: `docs/mobile-build.md`.

**Manual prerequisites (human-only — start early, they gate later phases):**

- [ ] **Xcode installed + set up** — Mac App Store (multi-GB), then open once to accept
  the license and install the iOS platform/simulator. _Gates: running/verifying the app
  from Phase 3 onward, and any local dev build._ _Doc: § Prerequisites (human-only)._
- [ ] **Google iOS OAuth client ID** — create in Google Cloud Console; set
  `GOOGLE_IOS_CLIENT_ID` (server) and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (mobile).
  _Gates: Phase 5 native Google sign-in._ _Doc: §§ Environment variables, Backend changes
  required #1._
- [ ] **Apple Developer account** ($99/yr). _Gates: Phase 7 device builds / TestFlight / submission._
  _Doc: §§ Prerequisites (human-only), Build & release._

**Phases:**

- [x] **Phase 1 — Backend auth** (PR #49) — iOS Google audience array, sliding sessions
  (`X-Refreshed-Token` + refreshed cookie), global sign-out (`sessionsValidAfter` +
  `POST /auth/logout-all`), shared cookie util, CORS `exposedHeaders`. _Doc: §§ Backend
  changes required #1–3, Authentication._
- [x] **Phase 2 — Shared types** (PR #49) — domain types moved to `shared/types.ts` with
  a re-export shim. _Doc: § Domain types._
- [ ] **Phase 3 — Scaffold `mobile/`** — Expo app (TS + `expo-router` + `expo-dev-client`)
  sibling to `server/`; Metro `watchFolders` → `shared/`; `EXPO_PUBLIC_*` env. _Prereq to
  scaffold: none (codeable now). Prereq to run/verify: Xcode._ _Doc: §§ Repository layout,
  Library choices._
- [ ] **Phase 4 — Data layer port** — port `src/api/*` + `src/hooks/*`; variants for
  `client.ts` (env base URL + read `X-Refreshed-Token` + 401→router redirect), `store/auth.ts`
  (`expo-secure-store` token persistence + `merge`/`migrate` fix + hydration gate),
  `useMediaQuery`→`useWindowDimensions`. _Prereq: Phase 3._ _Doc: §§ What ports vs. what gets
  rewritten, Session lifecycle, Mobile auth store._
- [ ] **Phase 5 — Auth + "Sign out on all devices" (client)** — `logoutAll()` +
  `useAuth.logoutAllDevices()` + button in account settings (web modal **and** mobile);
  native Google sign-in (`@react-native-google-signin`) + email/password; verify token
  round-trip against Railway. _Prereqs: Phase 4 **+ Google iOS OAuth client ID + a dev
  build** (Xcode or EAS)._ _Doc: §§ Google native handshake, Backend changes required #3 (UI)._
- [ ] **Phase 6 — UI rebuild** — from `mobile.jsx`: login → closets → closet detail →
  item detail → add-from-URL. Swaps: `window.confirm`→`Alert.alert`,
  `navigator.clipboard`→`expo-clipboard`, `react-router`→`expo-router`. _Prereq: Phase 4
  (Phase 5 for auth-gated screens)._ _Doc: § What ports vs. what gets rewritten (Rewrite row)._
- [ ] **Phase 7 — Build & ship** — `expo-dev-client` dev build; EAS Build + Submit →
  TestFlight → App Store. _Prereqs: Phase 6 **+ Apple Developer account + Sign in with
  Apple** (see Deferred)._ _Doc: § Build & release._

**Deferred (must land before App Store submission):**

- [ ] **Sign in with Apple** — App Store guideline 4.8 requires it once Google sign-in
  ships; another `verifyIdToken`-style backend endpoint + native button. _Gates: Phase 7
  submission._ _Doc: § Backend changes required #4 (Later) Sign in with Apple._
- [ ] **Face ID gate** — `expo-local-authentication` biometric unlock on cold open
  (optional UX; not a submission blocker). _Doc: § Face ID gate._

## Ideas / Maybe

- [ ] _Nothing yet — capture rough ideas here before they're scoped._
