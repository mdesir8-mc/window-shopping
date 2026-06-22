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
