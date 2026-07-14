# Window Shopping — Technical Design

**First written:** 2026-07-05
**Last updated:** 2026-07-14

A technical design overview of the full tech stack and system/app architecture behind Window Shopping. Written from the codebase (graphify knowledge graph + source). Update alongside significant architecture changes.

---

## 1. Product summary

Window Shopping is a personal wardrobe/wishlist organizer. A user pastes a product URL from any online store; the backend fetches and parses the page — brand, name, price, images, colors — with AI enrichment for tags and season, then stores the item inside a **closet** (optionally subdivided into ordered **sections**, with a default season and accent color). Items carry seasonal tags, user-defined tags, favorites, and stock/sale status refreshed daily.

---

## 2. High-level architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          Single Railway service                     │
│                                                                     │
│  ┌───────────────────────┐         ┌──────────────────────────────┐│
│  │  React SPA (built)     │  /api   │  Express API (Node + TS)      ││
│  │  served as static      │────────▶│  auth · closets · items ·     ││
│  │  files by Express       │         │  tags · user · public · cron ││
│  └───────────────────────┘         └───────────┬──────────────────┘│
│                                                 │                   │
│                          ┌──────────────────────┼─────────────┐     │
│                          ▼                      ▼             ▼     │
│                  ┌──────────────┐      ┌────────────┐  ┌──────────┐ │
│                  │ Parse pipeline│      │  Prisma    │  │  Resend  │ │
│                  │ Cheerio +     │      │  ORM       │  │  email   │ │
│                  │ Playwright +  │      └─────┬──────┘  └──────────┘ │
│                  │ Claude API +  │            │                     │
│                  │ unblocker     │            ▼                     │
│                  └──────────────┘      ┌────────────┐               │
│                                        │ PostgreSQL │               │
│                                        └────────────┘               │
└────────────────────────────────────────────────────────────────────┘
        ▲                                         ▲
   GitHub Action                            GitHub Action
   (daily cron → POST /api/cron/refresh)    (semantic-release → railway up)
```

Frontend and backend are **one deployable**: Vite builds the SPA into `server/public/`, and the Express server serves those static files plus the `/api` routes. There is no separate CDN or frontend host in production.

---

## 3. Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript, built with Vite 7 |
| Client routing | react-router-dom 6 |
| Server state / data fetching | @tanstack/react-query 5 |
| Client auth/UI state | Zustand 5 |
| HTTP client | axios (with interceptors) |
| Backend runtime | Node ≥20, Express 4, TypeScript |
| ORM / DB | Prisma 6 → PostgreSQL |
| HTML parsing | Cheerio |
| Headless rendering | Playwright (Chromium) |
| AI enrichment | @anthropic-ai/sdk (Claude API) |
| Auth | JWT (jsonwebtoken) + bcrypt + google-auth-library (Google Sign-In) |
| Email | Resend |
| Hardening | helmet, cors, express-rate-limit, custom SSRF proxy |
| Tests | Vitest + supertest (server) |
| Build/deploy | Docker (multi-stage) → Railway |
| Release automation | semantic-release + Conventional Commits + GitHub Actions |

Shared TypeScript types/helpers live in `shared/` (`types.ts`, `price.ts`, `staleness.ts`) and are imported by both client and server so the API contract stays in sync (e.g. `ParsedProduct`).

---

## 4. Frontend architecture (`src/`)

Entry: `src/main.tsx` mounts `<App/>` inside `QueryClientProvider` + `BrowserRouter`. React Query defaults: `staleTime` 30s, no refetch-on-focus.

- **`api/`** — thin axios modules per domain (`auth`, `closets`, `items`, `tags`, `export`, `public`, `version`) over a shared `client.ts`.
  - Request interceptor attaches `Authorization: Bearer <token>` from the Zustand auth store.
  - Response interceptor clears auth and redirects to `/login` on any 401.
- **`hooks/`** — React Query wrappers (`useAuth`, `useClosets`, `useItems`, `useTags`, `useVersion`, `useMediaQuery`). The item hooks form an optimistic CRUD suite (create/patch/delete/move/favorite/tag).
- **`store/auth.ts`** — Zustand store holding the current user + token (bearer token persisted for native/no-cookie clients).
- **`pages/`** — route screens: `Landing`, `Login`/`Register`/`ForgotPassword`/`ResetPassword`, `Home`, `ClosetDetail`, `PublicCloset` (read-only shared link), `NotFound`.
- **`components/`** — grouped by domain: `layout/` (AppShell orchestrates global modals, Sidebar, TopBar), `closets/`, `items/` (AddItemFlow, ItemDrawer, ProductPreviewCard, LandingParseDemo), `tags/`, `account/`, `auth/`, and a primitive `ui/` kit (ProductTile, Modal, Tag, Display, etc.).
- **Routing guards** (`App.tsx`): `AuthBootstrap` hydrates the user, `ProtectedRoute` gates authed screens, `PublicOnlyRoute` bounces logged-in users away from auth pages.

Dev proxy (`vite.config.ts`) forwards `/api` and `/version` to `http://localhost:3000`. Build `outDir` is `server/public` with `emptyOutDir: false` — that directory also holds hand-maintained static prototype `.jsx` files exercised by a server test, so it must never be wiped.

---

## 5. Backend architecture (`server/src/`)

`index.ts` `createApp()` builds the Express app:

1. `trust proxy = 1` — Railway fronts with one reverse proxy, so trusting exactly one hop makes `req.ip` the real client for per-IP rate limiters.
2. **helmet** with a tuned CSP (allows Google Identity Services + Google Fonts), COOP `same-origin-allow-popups`, strict referrer policy.
3. **cors** with credentials; origin locked to `FRONTEND_ORIGIN` in production.
4. `cookie-parser`, `express.json()`.
5. `GET /version` → baked `APP_VERSION`/`GIT_SHA`/`RELEASE_DATE` (or read from root `package.json`).
6. Route mounting, then SPA static serving + `index.html` fallback for non-`/api` paths.

### Route modules (`routes/`)

| Mount | Auth | Purpose |
|-------|------|---------|
| `/api/auth` | public | register, login, logout, Google login, password reset, current user |
| `/api/user` | `requireAuth` | account settings, notifications, sign-out-everywhere |
| `/api/closets` | `requireAuth` | closet + section CRUD, share-link enable/disable |
| `/api/items` | `requireAuth` | item CRUD, move, favorite, tag, parse URL, price history, export |
| `/api/tags` | `requireAuth` | tag CRUD |
| `/api/public` | public | read-only shared closet + demo parse |
| `/api/cron` | bearer secret | daily refresh trigger |

Cross-cutting utilities (`utils/`): `http.ts` (`asyncHandler`, `HttpError`, `errorHandler`), `validation.ts`, `serializers.ts`/`publicSerializers.ts` (DB → API shape), `jwt.ts`, `authCookie.ts`, `passwordReset.ts`, `shareToken.ts`, `itemExport.ts`, `relativeTime.ts`, and the SSRF guards `ssrf.ts`/`safeFetch.ts`.

### Auth model (`middleware/auth.ts`)

- Bearer token (header) **or** `auth_token` cookie — supports both web (cookie) and native (header) clients.
- JWT verified, user loaded via Prisma singleton (`lib/prisma.ts`).
- **Global sign-out:** tokens minted before `user.sessionsValidAfter` are rejected.
- **Sliding sessions:** once a token is older than 7 days it's re-issued; the fresh token is sent back both as an `X-Refreshed-Token` header (native) and a refreshed cookie (web), sliding within the 30-day hard expiry.

---

## 6. Parse pipeline (`services/`)

The core differentiator: turn an arbitrary product URL into structured `ParsedProduct`. `parseProductPage()` (`services/parser.ts`) picks a fetch tier per URL, cheapest-first:

1. **Structured store APIs (no scrape, no AI):** probe Shopify (`/products/<handle>.js`), WooCommerce Store API, and Squarespace (`?format=json`). If one resolves, use its clean JSON directly. Dedicated adapters live in `services/parsers/` (also `amazon.ts`, `carhartt.ts`, `uniqlo.ts`).
2. **Hard-wall hosts** (e.g. therealreal.com, nordstrom.com — PerimeterX/Akamai challenges) route through the **unblocker tier** (`unblocker.ts`, e.g. ScrapingBee), which is env-gated and daily-capped and never used on the unauthenticated demo path (cost/abuse control).
3. **Amazon** prefers a plain header-shaped fetch (headless gets an anti-bot interstitial), falling back to rendered.
4. **Default:** Playwright headless render (`browser.ts`), falling back to a raw fetch on failure.

Extraction then runs Open Graph / JSON-LD / heuristic parsing via Cheerio (brand, name, price, currency, colors, availability, season keywords). Season and tag keyword maps live in-module. When structured data is thin, **`claudeEnrich()`** calls the Claude API to fill tags/season; it swallows its own errors and returns `{}` so parsing degrades gracefully.

**SSRF defense:** Playwright's Chromium is launched behind a localhost pinning proxy (`ssrfProxy.ts`) so connections are pinned to a vetted IP (defeats DNS rebinding); `safeFetch`/`ssrf.ts` validate URLs on the raw-fetch paths, validate every resolved address, and fall back through the vetted address set on connection failures. The browser is a lazily-launched singleton, warmed on boot and torn down on `SIGTERM`/`SIGINT`.

---

## 7. Data model (`server/prisma/schema.prisma`)

PostgreSQL via Prisma. IDs are `cuid()`.

- **User** — email/password (nullable for Google-only), `googleId`, `avatarUrl`, `plan`, `emailNotifications`, `sessionsValidAfter` (global sign-out marker). Owns closets, tags, password-reset tokens, email logs.
- **Closet** — `name`, `subtitle`, `accent`, `season` default, `tags[]`, `shareToken` (unique, powers public links). Has sections + items.
- **Section** — ordered subdivision of a closet (`order`), cascade-deletes with its closet.
- **Item** — `brand`, `name`, price fields (`price`, `targetPrice`, server-only `targetPriceNumeric`, `originalPrice`, `currency`), `source`, `url`, `season`, `tags[]`, `colors[]`, `description`, private `note`, `imageUrl`, `favorited`, `onSale`, `inStock`, `lastCheckedAt` (daily-refresh timestamp), `addedAt`.
- **PriceSnapshot** — observed market history for an item (`price`, nullable comparable `priceNumeric`, `inStock`, `capturedAt`), written on item creation and refresh when price/stock changes, capped per item by `priceHistory.ts`.
- **Tag** — per-user named tag with optional color (`@@unique([userId, name])`).
- **PasswordResetToken** — hashed token + expiry + used-at.
- **EmailLog** — audit of sent emails (type, recipient, provider id, status).

---

## 8. Background jobs & email

- **Daily refresh:** `services/refresh-all.ts` re-parses every user's items to update price/stock/sale and `lastCheckedAt`, records price snapshots, and emails users a summary of price drops, target-price hits, out-of-stock transitions, and back-in-stock transitions via **Resend** (`services/email.ts`, `email-templates.ts`, logged through `email-log.ts`).
- **Two entrypoints, shared logic:**
  - CLI: `jobs/refresh-all.ts` (`npm run job:refresh`) — runs once, owns browser + Prisma teardown.
  - HTTP: `POST /api/cron/refresh` (`routes/cron.ts`) — bearer `CRON_SECRET` (constant-time compare, fail-closed if unset), rate-limited, with a per-process overlap guard returning 409 if a run is still in flight.
- **Trigger:** GitHub Action `refresh-cron.yml` (`cron: 0 12 * * *` UTC) POSTs the endpoint, running the job inside the live service's already-provisioned env (Playwright + DB + Resend). This replaced a removed Railway cron service.

---

## 9. Build, release & deploy

- **Docker** (`Dockerfile`) — 3 stages: (1) build SPA with Vite → `server/public`; (2) build server + `prisma generate`; (3) runtime installs prod deps + `playwright install chromium --with-deps` into a world-readable `/ms-playwright` path, runs as non-root `appuser`, and on start runs `prisma migrate deploy` then `node dist/server/src/index.js`. Root `package.json` is copied in as the source of the version served at `/version`.
- **Release** (`.github/workflows/release.yml`) — on push to `main`: `npm run ci` (typecheck + build + server tests), then **semantic-release** decides the version from Conventional Commits. If a release publishes, it sets Railway release vars (`APP_VERSION`/`GIT_SHA`/`RELEASE_DATE`) and `railway up`. Uses a Railway **project token** scoped to prod (long-lived, no `railway link` needed).
- **PR title check** (`pr-title-check.yml`) enforces Conventional Commit titles so the merged commit drives release automation correctly.
- **Environments:** dev = local Postgres container; test = Neon (via `TEST_DATABASE_URL`); prod = Railway Postgres.

Key env vars: `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `FRONTEND_ORIGIN`, `CRON_SECRET`, Resend + Google + unblocker credentials.

---

## 10. Cross-cutting concerns

- **Security:** helmet CSP, credentialed CORS locked to origin in prod, bcrypt password hashing, JWT with global-signout + sliding sessions, SSRF-pinned Playwright + validated fetches, per-IP rate limits on auth/parse/demo/cron, unauthenticated demo path barred from the paid unblocker tier.
- **Type safety:** end-to-end TypeScript; `shared/` holds the client↔server contract types and helpers.
- **Graceful degradation:** parse pipeline falls back tier-by-tier and never hard-fails on AI enrichment; browser warmup failure doesn't block boot.
- **Observability:** `/version` endpoint (baked build metadata), EmailLog table for delivery audit.

---

*Investigated via the graphify knowledge graph (`graphify-out/`) plus source. Regenerate the graph with `graphify update .` after code changes.*
