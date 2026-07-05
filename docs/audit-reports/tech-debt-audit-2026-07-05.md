# Tech Debt Audit — window-shopping
**First written:** 2026-07-05 · **Mode:** repeat-run (prior: [tech-debt-audit-2026-06-27.md](tech-debt-audit-2026-06-27.md))
Branch: claude/mobile-infra · ~13.0k LOC (src + server/src + shared) · Node ≥20.19

Reconciles the 14 findings from 2026-06-27 against the current tree and adds this run's new findings. IDs carry over; new items are prefixed `N`.

## Executive summary

Ranked by impact:

1. **The 2026-06-27 remediation mostly held.** F005/F006/F007 (dup price/staleness logic + threshold constant) are genuinely consolidated into `shared/price.ts` + `shared/staleness.ts`; F013 (email validation) shipped; F009 (esbuild CVE) is gone — `npm audit` is clean on both root and server. **RESOLVED: F005, F006, F007, F009, F013.**
2. **`server/public/` root cause is still unfixed (F001/F002).** The stale bundles were manually removed and only the 2 live assets remain, but `vite.config.ts` still has `emptyOutDir: false`, so the accumulation restarts on the next build. Symptom cleared, mechanism intact.
3. **Every god-file finding is still open and one got worse.** `ClosetDetail.tsx` grew **624 → 789 LOC** since the last audit (F011); `Sidebar.tsx` is effectively unchanged at 709 (F004); `parser.ts` 703, `AddItemFlow.tsx` 566. No extraction happened.
4. **Frontend test coverage is still zero (F008).** The server harness is now strong — 19 test files including `staleness`, `price`, `parser`, `ssrf` — but `src/**` has no `*.test.*` at all, and the highest-churn files remain React components.
5. **NEW: one genuinely dead exported function** — `filterItems` in `src/hooks/useItems.ts:224` has zero call sites (N1).
6. **NEW: a module import cycle** `AppShell.tsx ↔ Sidebar.tsx` (N2) — real but low-risk (React Context, runtime hook call, not a load-time cycle). See "looks bad but is actually fine."
7. **Server logging is still raw `console.*` and grew** 17 → 23 calls (F010). Fine at current scale.
8. **Type discipline is excellent and should be stated plainly:** zero `any`/`as any` across `src`+`server/src`+`shared`, `tsc --noEmit` clean, no raw SQL, no hardcoded secrets, all 22 env vars documented in `.env.example`. This is not a codebase drowning in debt — it's a small, disciplined one with a few concentrated hotspots.

## Architectural mental model

Two-package TypeScript app. Frontend (`src/`) is React 18 + Vite + React Query + Zustand, routed with react-router. Backend (`server/src/`) is Express + Prisma/PostgreSQL, organized cleanly into `routes/ → services/ → utils/`. A `shared/` package holds cross-cutting business logic (price parsing, staleness threshold, shared types) imported by both sides — this is new since the prior audit and is the correct home for the F005–F007 consolidation.

The product's center of gravity is the **URL-parse pipeline**: `services/parser.ts` (703 LOC, highest-churn file in the repo) orchestrates Open Graph / JSON-LD / heuristic extraction with per-retailer parsers in `services/parsers/*` and an AI fallback via `@anthropic-ai/sdk`, fronted by SSRF protection (`utils/ssrf.ts`, `services/ssrfProxy.ts`, `utils/safeFetch.ts`) and a browser-render tier (`services/browser.ts` + Playwright). This subsystem is cohesive and well-tested — its size reflects inherent complexity, not sprawl.

The debt is **entirely on the frontend layout layer**: a handful of oversized components (`ClosetDetail`, `Sidebar`, `AddItemFlow`, `ItemDrawer`) that co-locate data-fetching, layout, and modal state, with no test net. This matches the README's described architecture — no contradiction to flag.

## Findings table

| ID | Category | File:Line | Severity | Effort | Status | Description | Recommendation |
|----|----------|-----------|----------|--------|--------|-------------|----------------|
| F005 | Dup logic | shared/price.ts:5 | — | — | **RESOLVED** | `parsePriceToNumber` now single-sourced in `shared/price.ts`; no server-side duplicate remains. | None. |
| F006 | Consistency | shared/staleness.ts | — | — | **RESOLVED** | `isStaleItem` no longer copy-pasted; hoisted to shared. No component-local defs found. | None. |
| F007 | Dup constant | shared/staleness.ts:5 | — | — | **RESOLVED** | `FRESHNESS_THRESHOLD_MS` single-sourced in shared; imported both sides. | None. |
| F009 | CVE | server/node_modules | — | — | **RESOLVED** | `npm audit` clean on root and server (0 vulns). esbuild advisory gone. | None. |
| F013 | Contract debt | server/src/utils/validation.ts | — | — | **RESOLVED** | Email-format validation shipped. | None. |
| F001 | Architectural decay | vite.config.ts (emptyOutDir) | High | S | **OPEN (root cause)** | Only 2 live bundles committed now (`index-FiGcEacH.js`, `index-C-XHVxOy.css`), matching `index.html` — the manual cleanup worked. But `emptyOutDir: false` means the next build re-accumulates. | Separate build output from the hand-maintained prototype statics, then set `emptyOutDir: true`. Until split, symptom will recur. |
| F002 | Config debt | server/public/* | High | M | **OPEN** | `server/public/` remains a mixed dir (vite output + test-guarded prototype statics), which is why F001 can't just flip `emptyOutDir`. | Point vite `outDir` at a clean `dist/` and serve prototypes from a separate path; unblocks F001. |
| F011 | Large files | src/pages/ClosetDetail.tsx:1-789 | Medium | M | **OPEN (worse)** | Grew 624 → **789 LOC**; mixes 6 query/mutation/state hooks with layout and modal orchestration. `AddItemFlow.tsx` 566, `parser.ts` 703 (cohesive, lower priority). | Extract data hooks (`useClosetDetail`) and modal state from `ClosetDetail`; leave `parser.ts`. |
| F004 | God file | src/components/layout/Sidebar.tsx:1-709 | High | M | **OPEN (unchanged)** | Still 709 LOC doing desktop nav + mobile shelf + search + season/tag filters + refresh trigger. Not extracted. | Split into `MobileShelf`, `LibraryNav`, `TagFilterList`; Sidebar becomes a layout shell. |
| F008 | Test debt | src/** | Medium | M | **OPEN (frontend only)** | Server harness now strong (19 files). Frontend still has **zero** `*.test.*`; highest-churn files are untested components. | Add Vitest + Testing Library; start with `AddItemFlow` happy path and closet filtering. |
| F010 | Observability | server/src/** (23 `console.*`) | Medium | M | **OPEN (grew)** | Raw `console.*` grew 17 → 23; no levels, no request correlation. | Thin `log` module (pino); swap incrementally. |
| N1 | Dead code | src/hooks/useItems.ts:224 | Low | S | **NEW** | `filterItems` exported function has zero call sites (only its own definition). Genuinely dead. | Delete, or wire it into the item-filtering path if it was meant to replace inline filtering. |
| N2 | Architectural decay | src/components/layout/AppShell.tsx:7 ↔ Sidebar.tsx:10 | Low | S | **NEW** | Import cycle: `AppShell` imports `Sidebar`; `Sidebar` imports `useAppShell` from `AppShell`. Works because `useAppShell` is a runtime context hook, not a load-time reference — but madge flags it and it's a refactor hazard. | Move `AppShellContext` + `useAppShell` into `src/components/layout/AppShellContext.tsx`; both files import from there. Breaks the cycle. |
| N3 | Consistency | src/hooks/useAuth.ts:5, src/store/auth.ts:13 | Low | S | **NEW** | `useCurrentUser` and `AUTH_STORAGE_KEY` are `export`ed but used only within their own file. Over-exposed API surface. | Drop `export` unless a test imports them; keep local. |
| F003 / F012 / F014 | (prototypes / api.js) | server/public/*.jsx | — | — | **NOT DEBT** | Confirmed false positives from the prior run: `server/tests/frontend-bootstrap.test.ts` executes `data.jsx`; prototypes are test-guarded standalone statics, not orphans. Left in place, correctly. | None — do not delete. |

## Top 5 — if you fix nothing else, fix these

1. **Break the `server/public/` mixed-dir knot (F001+F002).** These are one problem. Point vite at `outDir: "dist/client"`, serve the prototype statics from their own route, then `emptyOutDir: true` is safe and the bundle-accumulation class of bug dies permanently. Sketch:
   ```ts
   // vite.config.ts
   build: { outDir: "dist/client", emptyOutDir: true }
   // server/src/index.ts — serve prototypes explicitly, build output separately
   app.use("/prototypes", express.static("server/public"))
   app.use(express.static("dist/client"))
   ```
2. **Extract `ClosetDetail.tsx` (F011).** It's the one file actively getting worse (+165 LOC since last audit). Pull the 6 query/mutation/state hooks into `useClosetDetail()` and lift modal state out; the page should render sub-views, not own them.
3. **Add the first frontend tests (F008).** One `AddItemFlow` happy-path test + one closet-filter test would put a net under the two highest-churn components. Vitest is already the server test runner — reuse it.
4. **Delete `filterItems` (N1).** Zero call sites. Either it's dead (remove) or it was meant to replace inline filtering (wire it in). Don't leave it dangling.
5. **Break the `AppShell ↔ Sidebar` cycle (N2)** by relocating the context to its own file. Five-minute change that removes the only import cycle in the repo and de-risks future layout refactors.

## Quick wins — Low effort × Medium+ impact

- [ ] Delete dead `filterItems` export (`src/hooks/useItems.ts:224`) — N1
- [ ] Move `AppShellContext`/`useAppShell` to own file, kill the import cycle — N2
- [ ] Drop unnecessary `export` on `useCurrentUser` / `AUTH_STORAGE_KEY` — N3
- [ ] Once build output is split, flip `emptyOutDir: true` — F001

## Things that look bad but are actually fine

**This section is required.** Calls considered and rejected:

- **The `AppShell ↔ Sidebar` "circular dependency" (N2) is real but nearly harmless.** madge reports it, but `useAppShell` is a React context hook invoked at render time, not a top-level module reference — so there's no initialization-order hazard and nothing actually breaks. Flagged as Low only because it's a refactor tripwire, not a live bug. Don't panic-refactor it as if it were a load-time cycle.
- **The 4 "unused" semantic-release devDeps (`commit-analyzer`, `github`, `npm`, `release-notes-generator`) are NOT removable.** knip flags them, but all four are explicitly listed as plugins in `.releaserc.json`. Removing any would break the release pipeline. Left alone.
- **`parser.ts` at 703 LOC is not a god file.** It's a single cohesive parse pipeline with per-retailer strategies extracted into `services/parsers/*` and thorough tests. Size reflects inherent domain complexity. Leave it unless it starts absorbing unrelated concerns.
- **The prototype `.jsx` files under `server/public/` (F003/F012/F014) are still not dead code.** Re-verified: `frontend-bootstrap.test.ts` executes them. The prior audit's own correction stands — they were false positives and must stay.
- **`FRESHNESS_THRESHOLD_MS` shows as an "unused export" in knip but has 5 real refs.** It's the consolidated shared constant from F007; knip's export analysis misses the cross-package usage. Working as intended.
- **The one swallowed `catch {}` (`AddItemFlow.tsx:106`) is fine** — it's a `new URL()` parse guard falling back to a hostname; there's nothing to handle.

## Open questions for the maintainer

1. **`filterItems` (N1)** — was this meant to replace inline item filtering somewhere and never got wired up, or is it leftover? Determines delete vs. integrate.
2. **`server/public/` split (F001/F002)** — is keeping the prototypes served from production intentional (living reference), or would you rather they move to `docs/design/` so the static root is purely build output? The answer picks the fix shape.
3. **Frontend testing (F008)** — is the absence of `src/**` tests a deliberate "server-tested, UI moves too fast" call, or just not-yet? Changes whether this stays a standing finding.
