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
- [x] **Activate the refresh-cron GitHub Action** — the workflow
  `.github/workflows/refresh-cron.yml` is now on `main` (PR #76 merged, `chore:`, workflow file
  only). GitHub runs `schedule:`/`workflow_dispatch` **only from the default branch** (`main`),
  so this activates the daily cron. Only the workflow file was merged — not the route code: the
  workflow `curl`s the prod endpoint, and prod deploys from `claude/mobile-infra` where
  `server/src/routes/cron.ts` → `services/refresh-all.ts` already run (probe returns 401), so
  porting the route to `main` would only add dead code (main isn't the deploy source).
  **Latent caveat:** if Railway's deploy source is ever repointed `mobile-infra → main`, bring
  `cron.ts` + `refresh-all.ts` across too or the workflow 404s. Post-merge verify (pending):
  GitHub Actions tab → **Daily refresh email** → `workflow_dispatch` → expect 202 + digest
  email (repo secrets `APP_URL` + `CRON_SECRET` confirmed set).
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

- [x] **`safeFetch` single-IP pinning is fragile against Cloudflare anycast** — surfaced
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
  - **Fixed** in `fix(safefetch): connect across all vetted IPs to survive anycast hosts`
    (PR #78 vs `claude/mobile-infra`): resolve the full validated set once per hop (IPv4-first)
    and try each pre-vetted IP in turn, capped at 4. SSRF/rebinding invariant preserved
    (frozen single lookup, TLS/abort errors propagate). `/total-security` PASS.

- [ ] **UNBLOCKER — enable the hard-wall retailer tier in prod** — the code path is merged
  (`HARD_WALL_HOSTS` = The RealReal, Nordstrom, SSENSE → `fetchViaUnblocker`), but prod has
  **no unblocker credentials**, so every hard-wall parse fails fast with
  `ParserFetchError: "Unblocker not configured or daily cap reached"`. Verified live against
  prod env (`railway run` + real `parseProductPage`): SSENSE threw in 0ms with
  `unblocker configured: false`. Gates SSENSE, The RealReal, and Nordstrom simultaneously.
  - [ ] **Sign up for an unblocker provider** (ScrapingBee or equiv) — human-only; paid
    account + API key. _Claude can't create accounts or handle the key._
  - [ ] **Set prod env vars** on the `window-shopping` service (rare-upliftment / production):
    `UNBLOCKER_API_URL=https://app.scrapingbee.com/api/v1/` + `UNBLOCKER_API_KEY=<key>`
    (optionally `UNBLOCKER_DAILY_CAP`, default 100). Set in Railway directly — don't paste the
    key into chat.
  - [ ] **Add `stealth_proxy` support to `unblocker.ts`** — current adapter sends only
    `render_js=true`; SSENSE's Cloudflare **managed** challenge (`cf-mitigated: challenge`)
    likely needs the provider's stealth/premium proxy (`stealth_proxy=true`) to clear. One-line
    param add; Claude can do this now so it's ready.
  - [ ] **Re-run the prod attempt to confirm** — after the key is set, re-run
    `parseProductPage` against a live SSENSE URL (e.g.
    `https://www.ssense.com/en-us/men/product/our-legacy/black-evening-coach-jacket/16240741`)
    and confirm real brand/name/price come back, not the CF interstitial.
  - [ ] **Verify The RealReal + Nordstrom** on the same key (same tier, previously
    "addressed pending API key").

- [x] **"On sale" is defined two conflicting ways** — the app decides "discounted" with
  two different predicates that disagree. **`originalPrice`-based:** the Home dashboard
  "marked-down" count (`src/pages/Home.tsx:182`, `items.filter(i => i.originalPrice)`) and
  the card/drawer **strikethrough** (`ItemDrawer.tsx:152`, `ItemCard.tsx`). **`onSale`
  boolean-based:** the closet "ON SALE" stat + On-sale filter (`useClosetDetail.ts:17`,
  `i.onSale`), the "ON SALE" badge, and price-drops. `onSale` is only ever set true by a
  *refresh* detecting a ≥10% drop vs the item's **own prior price** (`refresh.ts:49`,
  `newPrice <= prevPrice*0.9`) — it is **never** derived from `originalPrice < price`, and
  item create/parse never sets it. Result: an item parsed with a retailer markdown
  (`originalPrice` > `price`) shows a struck-through price everywhere but returns "No items
  match" under the On-sale filter, counts 0 in "ON SALE", and the dashboard's "marked-down"
  line links to `/?priceDrops=true` (the *other* predicate) → dead-ends to empty. Verified
  live (Wool Overcoat, $220 from $320, `onSale=f`). **Fix:** pick one definition — derive
  on-sale from `originalPrice && price < originalPrice` for the badge/count/filter (aligns
  with the strikethrough), or set `onSale` at create/parse time. Then reconcile
  price-drops vs. marked-down semantics.
  - **Fixed** in `fix: unify the on-sale predicate behind a server-derived onSale flag`
    (PR #80 vs `claude/onsale-and-a11y`). Chose **both** halves of the fix: `onSale` is now
    derived server-side from `price < originalPrice` via a new shared `isMarkedDown()`
    (`shared/price.ts`, reusing `parsePriceToNumber` with `> 0` guards), written at create,
    PATCH, **and** refresh — so the column is the single source of truth and every surface
    (badge, ON SALE stat, server `?onSale=true` filter, strikethrough, Home count, Sidebar
    "Price drops") now reads `item.onSale`. Price-drops and marked-down are thereby the same
    predicate, which reconciles the two semantics.
    - **Refresh keeps its drops:** when a refresh sees a price fall but the retailer
      advertises no list price, the previous price is carried forward into `originalPrice`.
      The flag self-clears if the price recovers. **This redefines `originalPrice` from
      "retailer list price" to "highest known price"** — deliberate, worth remembering.
    - Backfill migration `20260808120000_backfill_item_on_sale` recomputes both directions.
      Uses `CASE` (not an `AND` chain) because Postgres doesn't guarantee left-to-right
      `AND` evaluation — only `CASE` guarantees the regex guard runs before the `::numeric`
      cast, so junk like `1.2.3`/`Sold out` can't abort the migration. Dry-run on a
      throwaway DB with 7 edge-case rows matched the TS helper exactly. Note the `UPDATE`
      has no `WHERE`, so it rewrites every `Item` row.
    - Also fixed the hardcoded plurals on all three Home snapshot rows (the a11y bundle's
      item 2, moved here because both changes hit the same JSX block).
    - `/total-security` PASS. Caveat: no scanner supports `.sql`, so the migration's
      clearance rests on two hand-traces plus the dry-run.

- [ ] **Frontend a11y + copy polish (bundle)** — small, low-risk items found in an app
  walkthrough:
  1. **Inputs use placeholder as the only label** — login (email/password) + the landing
     parse demo have no associated `<label>`; the accessible name is the placeholder, which
     disappears on typing (WCAG fail). Inconsistent — 5 other form files do use `<label>`.
     Add `<label>` / `aria-label` to the placeholder-only inputs.
  2. **Dashboard count grammar** — `src/pages/Home.tsx:182` hardcodes the plural
     ("N items currently track a marked-down price"); reads wrong at count 1. Add a
     singular case ("1 item … tracks").
  3. **H1 accessible name reads "meantto"** — `src/pages/Landing.tsx:71`, `meant<br/>to`
     collapses without a space. Add `{" "}` before the `<br/>`.
  4. **Landing ignores dark mode** — stays light under `prefers-color-scheme: dark` while
     the authed app has a dark toggle. Confirm intent (fixed-light marketing page) vs. bug.
  5. **Login validation is native-tooltip only** — empty submit relies on the browser's
     `required` bubble; no inline error copy.

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

- [x] **Target-price alerts** — shipped on this branch. Adds `Item.targetPrice String?`
  plus server-only `targetPriceNumeric Float?` (`20260714120000_add_item_target_price`)
  and exposes `targetPrice` through `Item`, `ItemPayload`, create/patch, add-item
  preview, edit modal, and the `ItemDrawer` quick control. `refreshStaleItemsForUser`
  compares refreshed prices with the normalized target and records a `targetPriceHits`
  summary count; it emails only on the first crossing (`prevPrice` missing or above
  target → refreshed price at/below target) so already-below-target items do not repeat.
  The existing refresh digest now has a "Target price reached" section and reuses the
  email preference/cron path. DB-backed API coverage was added in `server/tests/api.test.ts`
  but skips locally unless `TEST_DATABASE_URL` is set.

- [x] **Price history + sparkline** — shipped in #73 (`feat: price history + Grailed
  parser`, with the core work in `cea740e`). Adds `PriceSnapshot { id, itemId, price,
  priceNumeric, inStock, capturedAt }` plus the `itemId, capturedAt` index and cascade
  delete. Snapshots are written on item create and refresh via `recordPriceSnapshot`,
  deduped when price/stock are unchanged, and capped at 365 per item. Exposes
  `GET /api/items/:id/history`, `PriceSnapshot` shared types, `getItemHistory` /
  `useItemHistory`, and an `ItemDrawer` sparkline with low/high/readings metadata.
  Covered by `server/tests/priceHistory.test.ts`; locally the suite skips unless
  `TEST_DATABASE_URL` is set.

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
  7. [x] **SSENSE** — luxury, super on-brand. **Diagnosed + routed through unblocker tier.**
     Regression cause: Cloudflare escalated to a managed challenge (`cf-mitigated: challenge`,
     `403`, "Just a moment...", `_cf_chl_opt` Turnstile) — site-wide, every UA blocked, not a
     markup change. Same class as The RealReal / Nordstrom, so added `ssense.com` to
     `HARD_WALL_HOSTS` in `parser.ts`; it now goes through `fetchViaUnblocker` automatically.
     **Open verification:** unblocker (ScrapingBee `render_js=true`) may need `stealth_proxy`/
     premium proxy to clear a CF *managed* challenge — confirm against a live SSENSE URL once
     `UNBLOCKER_API_*` env is set (unverified locally — no unblocker key here).

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
- [x] **Phase 3 — Scaffold `mobile/`** (PR #79) — Expo SDK 52 app (`expo-router` +
  `expo-dev-client`) sibling to `server/`; Metro `watchFolders` → `shared/`; `EXPO_PUBLIC_*`
  env; placeholder `app/index` + `app/login`. Also scoped release CI: `release.yml`
  `paths-ignore: mobile/**` (mobile pushes don't deploy the server) + inert `eas-build.yml`
  (gated on `EAS_ENABLED` + `EXPO_TOKEN`). _Runtime smoke-test still pending Xcode._
  _Doc: §§ Repository layout, Library choices._
- [x] **Phase 4 — Data layer port** (PR #79) — verbatim `api/{closets,items,tags,version,auth}`
  + `hooks/{useAuth,useClosets,useItems,useTags,useVersion}`; `types` shim → `shared`.
  Variants: `client.ts` (`EXPO_PUBLIC` base + `X-Refreshed-Token` + 401→router + https-only
  guard in release), `public.ts` (env), `store/auth.ts` (`expo-secure-store` token+user
  persistence + `hasHydrated` gate + `setToken`), `useMediaQuery`→`useWindowDimensions`;
  `_layout` = QueryClientProvider + hydration splash. **Deferred `api/export.ts`** (DOM
  download) → Phase 6 w/ `expo-file-system`. _Runtime verify pending Xcode._ _Doc: §§ What
  ports vs. what gets rewritten, Session lifecycle, Mobile auth store._
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
