# Todos

A running list of features and fixes I want to make. Newest ideas can go at the
bottom of each section; check things off as they ship.

## Fixes

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
- [ ] **Mobile / responsive layout** — AppShell is a fixed 232px sidebar + 1fr
  grid with no media queries; needs a hamburger/drawer pattern so the app is
  usable on small screens.
- [ ] **Email infrastructure** — pick a transactional email provider (Resend,
  SendGrid, etc.), wire it up, and build on top of it for both price-drop
  notifications and password reset.
- [ ] **Price drop notifications** — email users when a refreshed item drops in
  price or goes out of stock; depends on email infrastructure above.
- [ ] **Password reset** — forgot-password + reset-password flow; new
  `PasswordResetToken` Prisma model, two new routes, two new frontend pages;
  depends on email infrastructure above.

## Ideas / Maybe

- [ ] _Nothing yet — capture rough ideas here before they're scoped._
