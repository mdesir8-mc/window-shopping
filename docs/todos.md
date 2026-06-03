# Todos

A running list of features and fixes I want to make. Newest ideas can go at the
bottom of each section; check things off as they ship.

## Fixes

- [ ] **Refresh-stale button not updating item cards in prod** — clicking "Refresh
  stale" in the sidebar doesn't update the time-indicator on item cards; investigate
  whether the mutation response is invalidating the right query keys or if the
  card's `lastCheckedAt` display isn't re-rendering.

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
- [ ] **Price drop notifications** — email users when a refreshed item drops in
  price or goes out of stock; depends on email infrastructure above.
- [x] **Password reset** — `PasswordResetToken` model (sha256-hashed, single-use,
  1h expiry); `POST /api/auth/forgot-password` (anti-enumeration, always 200) +
  `POST /api/auth/reset-password`; `/forgot-password` + `/reset-password` pages and
  a "Forgot password?" link on Login. Google accounts can set a password without
  breaking either login method. Existing JWTs still survive a reset (noted).
- [ ] **Mobile / responsive layout** — AppShell is a fixed 232px sidebar + 1fr
  grid with no media queries; needs a hamburger/drawer pattern so the app is
  usable on small screens.
- [ ] **(add your next idea here)**

## Ideas / Maybe

- [ ] _Nothing yet — capture rough ideas here before they're scoped._
