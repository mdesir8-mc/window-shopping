# Todos

A running list of features and fixes I want to make. Newest ideas can go at the
bottom of each section; check things off as they ship.

## Fixes

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
- [x] **Mobile / responsive layout** — added a matchMedia-driven responsive
  layer with a stacked top sidebar strip, wrapped top bar, stacked page grids,
  denser cards, and mobile-friendly modals/drawers.
- [ ] **(add your next idea here)**

## Ideas / Maybe

- [ ] _Nothing yet — capture rough ideas here before they're scoped._
