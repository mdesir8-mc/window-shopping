# Tech Debt Audit — window-shopping
**First written:** 2026-06-22 · **Last updated:** 2026-06-27
Branch: claude/mobile-infra · ~11.3k LOC (src + server/src + shared)
Rerun: 2026-06-27 — re-verified; no code changed since first run. Owner decisions folded in: **keep committing `server/public/`** (fix staleness via `emptyOutDir: true`, not gitignore); F008 narrowed to pure-logic tests in the existing server harness. Remediation underway on `claude/tech-debt-cleanup`.

## Implementation update (2026-06-27, post-remediation)

Shipped on `claude/tech-debt-cleanup`: **F005/F006/F007** consolidated into `shared/staleness.ts` + `shared/price.ts` (with server-harness tests, partial **F008**), **F013** email validation, and the 3 stale bundles removed (part of **F001**).

Corrections — these findings were **wrong** and were NOT actioned:
- **F003 / F012 / F014 (prototypes + `api.js` "dead"):** false. `server/tests/frontend-bootstrap.test.ts` executes `server/public/data.jsx` — the prototypes are test-guarded and served as standalone statics, not orphans. The original check only looked at `src/` imports. Kept all of them.
- **F001 `emptyOutDir: true`:** reverted. `server/public/` is a *mixed* dir (vite build output + the hand-maintained prototype statics), so wiping it on build would delete the prototypes/`api.js`. Left `emptyOutDir: false` (commented). Only the manual stale-bundle removal stands; true auto-clean needs build output separated from the statics — deferred.

Still deferred: **F004, F010, F011, F009**, and the real **F001/F002** fix (separate build output from prototype statics).

## Executive summary

Ranked by impact:

1. **Build output is committed into a git-tracked dir and never cleaned** — `vite.config.ts` sets `outDir: "server/public"` with `emptyOutDir: false`, so every build drops a new hashed bundle and the old ones stay. 3 stale JS/CSS bundles are committed right now; a 4th (`index-L-84Xn9N.js`) is sitting untracked. The live `index.html` only references one. (F001)
2. **The whole `server/public/` build artifact tree shouldn't be in git at all** — the Dockerfile rebuilds it from source in stage 1. Committing it is the *source* of the stale-bundle churn above and of merge noise. (F002)
3. **Six orphaned prototype `.jsx` files at repo root** (`web/mobile/data/primitives/ios-frame/browser-window.jsx`, ~85KB) are tracked but never imported by `src/`. Duplicated again under `server/public/` where they're served publicly. (F003, F012)
4. **`Sidebar.tsx` is a 716-line god component** doing desktop nav + mobile menu + 3-way mobile shelf + search + season filter + tag filter + refresh-stale + account. (F004)
5. **Staleness rule duplicated 4×** — `isStaleItem` predicate copy-pasted in 3 components, and `FRESHNESS_THRESHOLD_MS` defined independently on frontend and server (drift risk on a business rule). (F006, F007)
6. **`parsePriceToNumber` defined twice server-side** (`routes/items.ts` + `services/refresh.ts`), in the same directory tree. (F005)
7. **Zero frontend tests** despite the components being the highest-churn files in the repo. Server has 9 test files. (F008)
8. The backend is genuinely solid: strict TS with **0 `as any`/`@ts-ignore`**, thorough SSRF defense, clean typecheck, near-clean `npm audit`. Most findings below are M/L hygiene, not structural rot.

## Architectural mental model

A React + TS (Vite) SPA in `src/` talks to a Node/Express + TS API in `server/src/` over `/api`, with Prisma/PostgreSQL behind it. `shared/types.ts` is a single source of truth for domain types, consumed by both sides (`src/types/index.ts` re-exports it; the mobile app is intended to as well). The signature feature is URL→product parsing: `services/parser.ts` orchestrates Shopify JSON, site-specific parsers (Uniqlo/Amazon/Carhartt), OG/JSON-LD heuristics, and a Claude fallback enricher, all behind an SSRF-hardened fetch layer (`utils/ssrf.ts` + `utils/safeFetch.ts`). Auth is JWT-in-cookie-or-bearer with sliding re-issue and a `sessionsValidAfter` global-signout. A refresh subsystem (`services/refresh.ts`) re-scrapes stale items for price drops and emails digests. In production a single Express process serves both the API and the built static frontend from `server/public/`.

This model matches the README. The one structural smell the README hides: `server/public/` is simultaneously a build-output target, a git-tracked directory, and the production static root — three roles that conflict (see F001/F002).

## Findings

| ID | Category | File:Line | Severity | Effort | Description | Recommendation |
|----|----------|-----------|----------|--------|-------------|----------------|
| F001 | Architectural decay | vite.config.ts:13-16 | High | S | **[owner: keep committing]** `outDir: server/public` + `emptyOutDir: false` accumulates hashed bundles forever. Committed stale: `index-BV80foti.js`, `index-DZ7U0Zih.js`, `index-umOruc9S.css` (live `index.html` references `index-FiGcEacH.js`/`index-C-XHVxOy.css`). `index-L-84Xn9N.js` is an untracked 4th. | Set `emptyOutDir: true` so each build wipes old output; one-time `git rm` the 3 stale bundles. Keeps repo holding only the current build. |
| F002 | Dependency & config debt | Dockerfile:3-13, server/public/* | High | S | `server/public/` is committed but Docker stage 1 rebuilds from source and `.dockerignore` excludes it, so prod never reads the tracked copy. Resolved by F001's `emptyOutDir: true` (no more accumulation) + F003/F014 (drop dead prototypes/api.js from the dir). | No gitignore (owner keeps it tracked); rely on `emptyOutDir: true` to keep it current. |
| F003 | Architectural decay (dead code) | web.jsx, mobile.jsx, data.jsx, primitives.jsx, ios-frame.jsx, browser-window.jsx | High | S | ~85KB of root prototype `.jsx` tracked in git; `src/` imports none of them (verified — no `from "...mobile"` etc. in `src/`). Pure design scaffolding left in the build root. | Delete, or move to `/docs/design/` if kept as reference. They are not part of the app. |
| F004 | Architectural decay (god file) | src/components/layout/Sidebar.tsx:1-716 | High | M | 716 LOC handling desktop nav, mobile menu, mobile shelf (closets/seasons/tags), search box, season filter, tag filter, refresh-stale trigger, and account entry in one component. | Extract `MobileShelf`, `LibraryNav`, `TagFilterList`, and the search controller into siblings; Sidebar becomes a layout shell. |
| F005 | Architectural decay (dup logic) | server/src/routes/items.ts:61, server/src/services/refresh.ts:12 | Medium | S | `parsePriceToNumber` defined twice server-side (items.ts treats invalid as 0; refresh.ts adds `>0`). items.ts already imports from refresh.ts. | Export one canonical version from `refresh.ts` (or a `utils/price.ts`) and import it in items.ts. |
| F006 | Consistency rot (dup logic) | src/components/layout/Sidebar.tsx:13-18, src/components/items/ItemCard.tsx:~17-19, src/components/items/ItemDrawer.tsx:~27-29 | Medium | S | Identical `isStaleItem` predicate (`http(s)` URL + lastCheckedAt vs threshold) copy-pasted in 3 components. | Hoist to `src/lib/format.ts` (or `lib/staleness.ts`) and import. |
| F007 | Consistency rot (dup constant) | src/constants.ts:3, server/src/services/refresh.ts:9 | Medium | S | `FRESHNESS_THRESHOLD_MS = 24h` defined independently on web and server — same business rule, two homes, silent drift if one changes. | Move to `shared/` and import on both sides. |
| F008 | Test debt | src/** (no `*.test.*`) | Medium | M | Zero frontend tests; the highest-churn files in the last 6 months are all React components (Sidebar, ItemDrawer, AddItemFlow). No safety net on the most-edited code. | Add Vitest + Testing Library; start with `isStaleItem`, price sort, and AddItemFlow happy path. |
| F009 | Dependency debt (CVE) | server/node_modules/esbuild | Low | S | 1 low-severity advisory (GHSA-g7r4-m6w7-qqqr, dev-server arbitrary file read on Windows). Dev-only, transitive via vitest/tsx. | `npm audit fix` in `server/` at next dep bump. |
| F010 | Error handling & observability | server/src/** (17 `console.*`) | Medium | M | All server logging is raw `console.*` — no levels, no request correlation, no structured fields. Fine at current scale, weak once multi-user traffic needs triage. | Introduce a thin logger (pino) behind a `log` module; swap calls incrementally. |
| F011 | Architectural decay (large files) | src/pages/ClosetDetail.tsx:624, src/components/items/AddItemFlow.tsx:592, server/src/services/parser.ts:648 | Medium | M | Three more >500 LOC files. parser.ts is cohesive (one pipeline) so lower priority; the two components mix data-fetching, layout, and modal state. | Extract sub-views/hooks from the two components; leave parser.ts unless it grows further. |
| F012 | Security hygiene | server/public/*.jsx | Low | S | Prototype jsx is committed under the production static root, so `/data.jsx`, `/mobile.jsx`, etc. are publicly fetchable. Low impact (no secrets), but it's unintended source exposure. | Removed automatically once F002/F003 are addressed. |
| F013 | Type & contract debt | server/src/routes/auth.ts:35 | Low | S | `register` validates email is non-empty (`requireString`) but never checks it's email-shaped; bad addresses become permanent rows. | Add a minimal email-format check in `utils/validation.ts`. |
| F014 | Dead code | server/public/api.js | Low | S | 46-line hand-written vanilla-JS `apiFetch` wrapper, part of the old jsx prototypes. The real app uses axios in `src/api/client.ts`. Dead, and publicly served. | Delete (folds into F002/F003). |

## Top 5 — if you fix nothing else, fix these

1. **F001 + F002 — get build output out of git.** One change kills three findings (stale bundles, merge noise, public jsx exposure):
   ```gitignore
   # .gitignore
   server/public/assets/
   server/public/index.html
   ```
   ```bash
   git rm -r --cached server/public/assets server/public/index.html
   ```
   Docker stage 1 already regenerates these. Verify a clean `npm run build` + container boot still serves the SPA.

2. **F003 — delete the orphan prototypes.** Confirmed no `src/` import references them. `git rm web.jsx mobile.jsx data.jsx primitives.jsx ios-frame.jsx browser-window.jsx` (and the `server/public/` copies via #1). If they're design reference, `git mv` them into `docs/design/` instead — but they don't belong in the build root.

3. **F004 — decompose `Sidebar.tsx`.** Outline:
   - `MobileShelf.tsx` — the `mobileShelf` state machine + the closets/seasons/tags panels.
   - `LibraryNav.tsx` — the `libraryEntries` list (lines ~57+).
   - `useSidebarSearch()` — search box + searchParams sync.
   Sidebar keeps only the layout frame and wires children. Target <250 LOC.

4. **F006 + F007 — one staleness rule.** Add to `shared/`:
   ```ts
   export const FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000;
   export const isStale = (lastCheckedAt: string | Date | null, url?: string | null) =>
     /^https?:\/\//i.test(url ?? "") &&
     (!lastCheckedAt || Date.now() - new Date(lastCheckedAt).getTime() > FRESHNESS_THRESHOLD_MS);
   ```
   Import in Sidebar/ItemCard/ItemDrawer and `refresh.ts`. Removes 4 copies + drift risk.

5. **F008 — a thin frontend test floor.** Vitest + Testing Library, three tests: `isStale` (post-#4), the price-asc/desc sort in `items.ts` GET handler logic, and AddItemFlow's parse→confirm happy path. Wire into the existing `npm run ci`.

## Quick wins (Low effort × Medium+ severity)

- [ ] F001/F002: gitignore + `git rm --cached server/public/assets server/public/index.html`
- [ ] F003: delete 6 orphan root `.jsx` prototypes
- [ ] F005: dedupe server `parsePriceToNumber` (items.ts imports refresh.ts's)
- [ ] F006: hoist `isStaleItem` into one helper
- [ ] F007: move `FRESHNESS_THRESHOLD_MS` into `shared/`
- [ ] F009: `cd server && npm audit fix`
- [ ] F013: email-format check in `register`

## Things that look bad but are actually fine

- **Three type files** (`shared/types.ts`, `src/types/index.ts`, `server/src/types/index.ts`) look like duplication. They aren't: `src/types/index.ts` is a one-line re-export of `shared`, and the server file is *only* Express request augmentation + JWT claims. This is the correct shape for a shared-types setup — leave it.
- **`parser.ts` Amazon retry loop** (8 attempts, linear backoff, lines 390-424) looks like a hack. It's load-bearing and well-documented: Amazon A/B-serves an anti-bot interstitial and a price-hydrated-client-side variant at random per request. Retrying to a PDP-with-price is the right call. Don't "simplify" it away.
- **SSRF layer** (`ssrf.ts` + `safeFetch.ts`) is not debt — it's a strength. Per-hop re-validation + pinning the connection to the exact vetted IP correctly closes the DNS-rebinding window. The `safeFetch` redirect-following design is sound.
- **`parsePriceToNumber` in `src/lib/format.ts`** is *not* part of the F005 duplicate. Frontend and backend can't share a runtime module here, so a parallel copy on the web side is acceptable; only the two *server* copies are real duplication.
- **Rate-limiter `skip: () => NODE_ENV === "test"`** in items.ts/auth.ts looks like a test backdoor. It's intentional and documented (shared per-IP budget makes test order matter); the limiters are still active in prod.
- **`forgot-password` always returns `{ok:true}`** regardless of account existence — looks like a swallowed error, but it's a deliberate account-enumeration defense (commented as such).

## Open questions for the maintainer

- **Is `server/public/` committed on purpose?** I'm treating it as accidental (Docker rebuilds it). If some deploy path reads the *tracked* `server/public/` instead of rebuilding, F001/F002 change — tell me and I'll re-scope.
- **Are the root `.jsx` prototypes kept intentionally** as design reference? If yes, they should move to `docs/`; if no, delete. They're currently in the build root and shipped to `server/public/`.
- **Is the frontend test gap intentional** (early-stage, manual QA) or just unaddressed? That decides whether F008 is M or High.
- ~~`server/public/api.js`~~ — resolved during audit: it's a dead vanilla-JS fetch wrapper from the prototype era (the app uses axios). Captured as F014; delete with the rest.
</content>
