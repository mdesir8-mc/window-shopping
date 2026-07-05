# Plan — Shareable public closet link

Read-only, no-auth view of one closet via an unguessable share token.

Source todo (`docs/todos.md`, Features):
> Add a `shareToken String? @unique` to `Closet`; new **public** route
> (`GET /api/public/closets/:token`) that bypasses auth and returns only safe
> fields (no user PII); new unauthenticated frontend page reusing the read-only
> item view. **Security surface:** token unguessable, route rate-limited,
> revoking the token invalidates the link.

## Design decisions

- **Token, not a `public` boolean.** A `shareToken` doubles as the capability
  and the on/off switch: present ⇒ shared, `null` ⇒ private. Revoke = null it.
  Re-share generates a fresh token (old links 404 immediately). No separate flag.
- **256-bit token.** `randomBytes(32).toString("hex")` — same generator family as
  `passwordReset.ts`. Unguessable; enumeration of cuid closet ids buys nothing
  because the public route keys on token, not id.
- **Store the token in the clear** (unlike the sha256 password-reset token). The
  share token IS the URL the owner hands out and must be re-displayable in the
  UI (copy button), so it can't be a one-way hash. It grants read-only, non-PII
  access only, so plaintext-at-rest is an acceptable trade for re-display. `@unique`
  gives an indexed exact-match lookup.
- **Reuse `/api/public` router** (already mounted before the `/api` 404 catch-all
  and outside `requireAuth`, `server/src/index.ts:77`). Add a rate limiter mirroring
  the existing `demoParseLimiter` shape.
- **Safe serialization — new serializer, not the authed one.** `serializeCloset`
  leaks `userId`; items carry `note` (a personal note) and `favorited`. The public
  serializer strips: closet `userId`, item `note`, item `favorited`, and section
  `closetId` is harmless but dropped for tidiness. Everything needed to render
  (brand/name/price/currency/originalPrice/url/imageUrl/colors/onSale/inStock/
  season/tags) stays.
- **Frontend: dedicated read-only view, presentational reuse only.** `ItemCard`
  is coupled to auth hooks (`useRefreshItem`, `useAppShell`, `useNavigate` to
  drawer), so it can't render unauthenticated. Reuse the presentational
  `ProductTile` (only local `useState`) and build a small `PublicItemGrid`/tile.
  New page lives **outside** the `AuthBootstrap`-gated protected block in `App.tsx`.

## Review changes folded in (Sonnet, APPROVE WITH CHANGES)
- Public lookup uses `findUnique` (token is `@unique`), not `findFirst`.
- Public serializer lives in a **new `publicSerializers.ts`** and is an explicit
  field-by-field **allowlist** (like `serializeAuthUser`), never a `delete`-key denylist.
- Validate `:token` (non-empty, max length ~128, hex) before the Prisma call.
- Public page emits `<meta name="robots" content="noindex">` + `X-Robots-Tag: noindex`
  on the API response — keeps a leaked link out of search indexes.
- Tests assert non-owner 404 on **both** `POST /:id/share` and `DELETE /:id/share`.
- Public GET skips the daily-cap pattern (unlike `parse-url`): cheap indexed DB read,
  not a headless-browser launch. Token rotation deferred (revoke + re-enable = 2 calls).
  Closet delete drops the row (and its token) via existing `deleteMany`. CSP already
  allows arbitrary `https:` image hosts.

## Steps

### Backend
1. **Schema + migration** — add `shareToken String? @unique` to `Closet`
   (`server/prisma/schema.prisma`). `npx prisma migrate dev --name add_closet_share_token`.
   → verify: migration file created, `prisma generate` types include `shareToken`.
2. **Token util** — `server/src/utils/shareToken.ts`: `generateShareToken()` →
   `randomBytes(32).toString("hex")`. Tiny; mirrors `passwordReset.ts`.
   → verify: unit-level import compiles.
3. **Owner endpoints** on the authed closets router (`server/src/routes/closets.ts`):
   - `POST /:id/share` — owner-only (`findOwnedCloset`); if no token, generate +
     persist; return `{ shareToken, shareUrl }`. Idempotent-ish: re-POST rotates
     (documented) OR returns existing — **decision: return existing token** so a
     double-click doesn't silently break outstanding links; add
     `POST /:id/share/rotate` only if needed (skip for v1).
   - `DELETE /:id/share` — owner-only; set `shareToken = null`; 204.
   → verify: supertest — enable returns token, second enable returns same token,
     delete nulls it, non-owner gets 404.
4. **Public read endpoint** (`server/src/routes/public.ts`):
   - `GET /closets/:token` behind a new `shareViewLimiter` (e.g. 60/min/IP,
     `skip` in test like the others).
   - Look up `prisma.closet.findFirst({ where: { shareToken: token } })` with
     sections + items included; 404 (generic "Closet not found.") if no match —
     never distinguish "wrong token" from "revoked".
   - Return `serializePublicCloset(closet)` — new serializer in
     `server/src/utils/serializers.ts` (or a `publicSerializers.ts`) stripping PII
     per design above.
   → verify: supertest — valid token returns safe shape (assert **no** `userId`,
     `note`, `favorited` keys); revoked/garbage token → 404.
5. **Shared types** — add `shareToken` to `Closet` in `shared/types.ts` (owner
   view) and add `PublicCloset` / `PublicItem` interfaces for the read-only shape.

### Frontend
6. **API + hooks** — `src/api/closets.ts`: `enableClosetShare(id)`,
   `disableClosetShare(id)`; `src/api/public.ts` (or extend existing public api):
   `fetchPublicCloset(token)` using a **bare axios/apiClient GET** (no auth needed;
   404 must NOT trigger the 401→/login interceptor — it won't, interceptor only
   fires on 401). Hooks in `src/hooks/useClosets.ts` (`useEnableShare`,
   `useDisableShare`) + a `usePublicCloset(token)` query.
7. **Public page** — `src/pages/PublicCloset.tsx`: fetch by token, render closet
   header + read-only grid of `ProductTile`s (link out to `item.url`, no edit/drawer),
   loading + 404 empty states. No sidebar/AppShell.
8. **Route** — in `App.tsx`, add `<Route path="/share/:token" element={<PublicCloset />} />`
   as a **sibling of Landing/Login**, inside `AuthBootstrap` (fine — it renders for
   logged-out) but **outside** the `user ? protected : public` gate so it's reachable
   in both auth states. Confirm a logged-in user hitting a share link still sees the
   public view (acceptable) — or redirect owners to their own closet (skip for v1).
9. **Share UI in `ClosetDetail.tsx`** — a "Share" affordance (button in the header
   actions row near export) opening a small popover/modal: toggle public on/off,
   show + copy the `shareUrl` when on, "Stop sharing" to revoke. Reuse existing
   `Modal`/toast patterns.

### Verify
10. `npm run typecheck` (root + server) and server test suite green.
11. Add tests: `server/tests/publicCloset.test.ts` (enable→fetch→revoke→404, PII
    absence) and owner-endpoint auth (non-owner 404).
12. Manual/preview note: UI is auth-gated for the owner controls; the public page
    is reachable unauthenticated — smoke via supertest + typecheck (per repo's
    preview-auth gotcha).

## Security checklist (maps to the todo's callout)
- [ ] Token unguessable — 256-bit random hex.
- [ ] Route rate-limited — dedicated limiter on the public GET.
- [ ] Revoke invalidates — `DELETE` nulls the token; lookup keys on token ⇒ instant 404.
- [ ] No PII / no owner data — public serializer strips `userId`, `note`, `favorited`;
      404 is opaque (no wrong-vs-revoked distinction).
- [ ] Public route stays outside `requireAuth` and before the `/api` 404 catch-all.
- [ ] Owner enable/disable endpoints enforce ownership via `findOwnedCloset`.

## Out of scope (v1)
- Per-item hiding, share analytics/view counts, OG/social preview meta, password on
  share links, token expiry (revoke-only), owner-redirect on share URL.

## Files touched
- `server/prisma/schema.prisma` (+ migration)
- `server/src/utils/shareToken.ts` (new)
- `server/src/utils/serializers.ts` (+ public serializer)
- `server/src/routes/closets.ts` (share enable/disable)
- `server/src/routes/public.ts` (public GET)
- `shared/types.ts` (shareToken + PublicCloset/PublicItem)
- `src/api/closets.ts`, `src/api/public.ts` (new), `src/hooks/useClosets.ts`
- `src/pages/PublicCloset.tsx` (new), `src/App.tsx`, `src/pages/ClosetDetail.tsx`
- `server/tests/publicCloset.test.ts` (new)
