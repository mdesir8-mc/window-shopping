# [1.1.0](https://github.com/mdesir8-mc/window-shopping/compare/v1.0.0...v1.1.0) (2026-05-30)


### Features

* sign in with Google ([#31](https://github.com/mdesir8-mc/window-shopping/issues/31)) ([cf3848f](https://github.com/mdesir8-mc/window-shopping/commit/cf3848fde23af3f9715b69a12d7cd9f812d27b18))

# [1.0.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.10.0...v1.0.0) (2026-05-30)


* feat!: promote window-shopping to a stable 1.0 release ([#30](https://github.com/mdesir8-mc/window-shopping/issues/30)) ([fe15d4b](https://github.com/mdesir8-mc/window-shopping/commit/fe15d4b23885ba3438ded95e131205191615e7ce))


### BREAKING CHANGES

* first stable release; establishes the 1.x API surface.

Co-authored-by: Michael <michael@centralcont516256.local>

# [0.10.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.9.0...v0.10.0) (2026-05-30)


### Features

* add bulk refresh of stale items with price-drop toast ([#29](https://github.com/mdesir8-mc/window-shopping/issues/29)) ([145ae2b](https://github.com/mdesir8-mc/window-shopping/commit/145ae2bc280fd9cdd2f7c3ce0d363798735e3288))

# [0.9.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.8.1...v0.9.0) (2026-05-29)


### Features

* complete shell UI features across sidebar, topbar, and modals ([#28](https://github.com/mdesir8-mc/window-shopping/issues/28)) ([3e15dd6](https://github.com/mdesir8-mc/window-shopping/commit/3e15dd6363dd789df58721f26ff007467744d557))

## [0.8.1](https://github.com/mdesir8-mc/window-shopping/compare/v0.8.0...v0.8.1) (2026-05-29)


### Bug Fixes

* allow external https images in CSP to unblock item card thumbnails ([#27](https://github.com/mdesir8-mc/window-shopping/issues/27)) ([1b324f1](https://github.com/mdesir8-mc/window-shopping/commit/1b324f1d800c75abd449bb399779549304041410))

# [0.8.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.7.1...v0.8.0) (2026-05-28)


### Features

* show BETA label on login page instead of DEVELOPMENT ([#25](https://github.com/mdesir8-mc/window-shopping/issues/25)) ([514656b](https://github.com/mdesir8-mc/window-shopping/commit/514656bc511eab5528771e0d7a576efb587c9724))

## [0.7.1](https://github.com/mdesir8-mc/window-shopping/compare/v0.7.0...v0.7.1) (2026-05-28)


### Bug Fixes

* harden server against SSRF, add security headers, rate limit, and non-root Docker user ([#24](https://github.com/mdesir8-mc/window-shopping/issues/24)) ([6309b6e](https://github.com/mdesir8-mc/window-shopping/commit/6309b6e33e120f10e78351e004d90adee6c2e976))

# [0.7.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.6.0...v0.7.0) (2026-05-28)


### Features

* capabilities to update price and stock status ([#23](https://github.com/mdesir8-mc/window-shopping/issues/23)) ([361bf14](https://github.com/mdesir8-mc/window-shopping/commit/361bf14866bbaea55afe3e9fe0bd53c6ab087509))

# [0.6.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.5.1...v0.6.0) (2026-05-28)


### Features

* add manual entry fallback when URL parse fails ([#22](https://github.com/mdesir8-mc/window-shopping/issues/22)) ([07d4dc3](https://github.com/mdesir8-mc/window-shopping/commit/07d4dc36481b1bc7cc97592da1b1c584c39abfca))

## [0.5.1](https://github.com/mdesir8-mc/window-shopping/compare/v0.5.0...v0.5.1) (2026-05-27)


### Bug Fixes

* correct Claude parser fallback ([#20](https://github.com/mdesir8-mc/window-shopping/issues/20)) ([28358a1](https://github.com/mdesir8-mc/window-shopping/commit/28358a13efe3879cc85693f0fdbf90d0ef97092d))

# [0.5.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.4.0...v0.5.0) (2026-05-26)


### Features

* UI polish — hover states, sticky sidebar, card sizing, accent gradients, clickable source link ([#18](https://github.com/mdesir8-mc/window-shopping/issues/18)) ([bf3585f](https://github.com/mdesir8-mc/window-shopping/commit/bf3585f8cf831afa4ad34627bf3682093ed2b06a))

# [0.4.0](https://github.com/mdesir8-mc/window-shopping/compare/v0.3.3...v0.4.0) (2026-05-26)


### Features

* add hover states to all interactive elements and fix sticky sidebar ([#17](https://github.com/mdesir8-mc/window-shopping/issues/17)) ([2f64479](https://github.com/mdesir8-mc/window-shopping/commit/2f64479a07b6fc01dd8ffda6f7b3ebaf61398324))

## [0.3.3](https://github.com/mdesir8-mc/window-shopping/compare/v0.3.2...v0.3.3) (2026-05-25)


### Performance Improvements

* push item search filtering into Prisma WHERE clause ([#16](https://github.com/mdesir8-mc/window-shopping/issues/16)) ([31bc9ec](https://github.com/mdesir8-mc/window-shopping/commit/31bc9ecab71a584f546c47e0f76e82fffaea32af))

## [0.3.2](https://github.com/mdesir8-mc/window-shopping/compare/v0.3.1...v0.3.2) (2026-05-24)


### Bug Fixes

* trigger Claude enrichment when meta tags are empty strings ([#12](https://github.com/mdesir8-mc/window-shopping/issues/12)) ([809384a](https://github.com/mdesir8-mc/window-shopping/commit/809384adc8535a156f3fcf1bfee922f6917c813d))
