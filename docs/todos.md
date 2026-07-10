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
- [x] **Daily refresh email cron not firing on Railway** — the Railway Cron service
  (`refresh-cron`) was crashing/stopped. Switched the trigger to a GitHub Action
  (`.github/workflows/refresh-cron.yml`, daily 12:00 UTC / 7am EST + manual
  `workflow_dispatch`) that POSTs to a new bearer-guarded `POST /api/cron/refresh` on the
  web service. Endpoint (`server/src/routes/cron.ts`) runs the shared `refreshAllUsers`
  (`server/src/services/refresh-all.ts`, extracted from `jobs/refresh-all.ts`) in the
  live service env (Playwright + DB + Resend already there), responds 202 and runs
  detached, with a 409 overlap guard and 503-when-unconfigured. Manual follow-ups: set
  `CRON_SECRET` (web service var) + `APP_URL`/`CRON_SECRET` (GitHub secrets), verify via
  `workflow_dispatch`, then delete the `refresh-cron` Railway service.
- [ ] **Activate the refresh-cron GitHub Action (blocked on main sync)** — the endpoint
  is live in prod (Railway deploys from `claude/mobile-infra`; PR #67 merged, probe returns
  401), but the workflow `.github/workflows/refresh-cron.yml` is only on `mobile-infra`, not
  `main`. GitHub runs `schedule:` (and shows `workflow_dispatch`) **only from the default
  branch** (`main`), so the daily cron is dormant. Don't just cherry-pick the workflow onto
  `main` in isolation: the endpoint/route code (`server/src/routes/cron.ts`,
  `services/refresh-all.ts`) plus other work it may lean on live on `mobile-infra` and aren't
  on `main` yet — activating the schedule before that code reaches `main` risks the workflow
  hitting a prod that later redeploys from `main` without the route. Proper fix: merge
  `mobile-infra → main` (ships the cron code + workflow together), then confirm the workflow
  registers and a scheduled/`workflow_dispatch` run returns 202 + email. Until then the daily
  refresh does NOT run automatically — trigger manually with a `curl` to `/api/cron/refresh`
  if needed.
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
- [x] **Back-in-stock alerts** — `refreshStaleItemsForUser` now collects a
  `BackInStockEntry` on the strict `inStock` false→true transition (symmetric with the
  existing OOS gate but null-safe: `null → true` stays silent because there was no OOS
  event to reverse). `priceDropEmail` gained a "Back in stock" section (HTML + text) and
  a subject fragment (`Nn back in stock`). `RefreshStaleSummary` +
  `RefreshAllSummary` gained additive `backInStock: number` counters (shared
  `shared/types.ts`), surfaced in the sidebar refresh toast + summary line. No schema
  change; reuses the daily `refresh-all` cron and the `User.emailNotifications` gate.
  Two new tests in `server/tests/api.test.ts`: OOS→in-stock digest, plus null-prev
  silence check.

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

- [x] **Shareable public closet link** — shipped in #69 (branch
  `claude/public-closet-share`, base `claude/mobile-infra`). `Closet.shareToken String? @unique`
  (+ migration); owner-scoped `POST`/`DELETE /api/closets/:id/share` (idempotent enable,
  revoke nulls the token, both behind `requireAuth` + `shareLimiter`); unauthenticated
  `GET /api/public/closets/:token` (`server/src/routes/public.ts`) outside `requireAuth`,
  dedicated `shareViewLimiter`, 64-hex token validated pre-DB, opaque 404 for
  wrong/revoked/malformed, `X-Robots-Tag: noindex`, `findUnique` lookup. Safe fields via a
  dedicated explicit-allowlist `publicSerializers.ts` (no `userId`/`note`/`favorited`/
  `lastCheckedAt`/`shareToken`). Frontend `/share/:token` read-only page reuses `ProductTile`
  (not `ItemCard` — it's coupled to auth hooks), bare-axios public fetch (no bearer leak),
  client `noindex`; share enable/copy/revoke UI in `ClosetDetail`. Reviewed via
  `/total-security` (all PASS/CLEAN, no CRITICAL/HIGH). Token unguessable (256-bit CSPRNG),
  rate-limited, revocation invalidates instantly — all three security requirements met.

- [x] **Landing-page parse demo** — shipped in #58. Public `POST /api/public/parse-url`
  (`server/src/routes/public.ts`) calls `parseProductPage(url, { demoMode: true })` —
  demoMode skips Claude enrichment (no $ on the unauth path), reuses the hardened
  `validateSsrfSafeUrl` + `safeFetch`, own stricter limiter + global daily cap, mounted at
  `/api/public` before the 404 catch-all and outside `requireAuth`. Frontend: `parseUrlPublic`
  + `useParseUrlPublic`, shared `ProductPreviewCard` extracted from `AddItemFlow`, and
  `LandingParseDemo` embedded on `src/pages/Landing.tsx`.

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
  5. [x] **Grailed** — **shipped** (`parsers/grailed.ts`, spread into `parser.ts` alongside
     the other HTML extractors; `tests/grailed.test.ts`). Reads the `__NEXT_DATA__`
     `props.pageProps.listing` blob: brand from `designerNames`, `priceDrops[0]` →
     `originalPrice` when `dropped`, color from `traits`, `inStock` = `!sold`, and the real
     seller description (the JSON-LD one is boilerplate). Currency comes from the generic
     JSON-LD offer. **Gotcha:** Grailed's Cloudflare edge 403s Chromium's default
     `HeadlessChrome` UA, so `fetchRenderedHtml` gained an optional `userAgent` and
     `parser.ts` passes a real browser UA for `grailed.com` only. Verified live against
     real listings (incl. a price-dropped one).
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
