# Window Shopping — iOS (Expo)

Native iOS app, reusing the existing API + `shared/` types. Full plan:
[`docs/mobile-build.md`](../docs/mobile-build.md).

## Prerequisites

- **Xcode** installed + opened once (accept license, install the iOS simulator).
- **Node 22** and the repo's `shared/` dir present (this app is a sibling of `server/`).

## First run

```bash
cd mobile
npm install          # hydrate node_modules
npx expo install --fix   # reconcile any version drift against the Expo SDK
cp .env.example .env      # then edit EXPO_PUBLIC_API_BASE_URL if needed
npx expo start --dev-client
```

Press `i` to open the iOS simulator. A **dev build** is required (not Expo Go) because
Phase 5 adds `@react-native-google-signin`, a native module.

## Layout

- `app/` — `expo-router` file-based routes (`_layout.tsx`, `index.tsx`).
- `metro.config.js` — `watchFolders` points at `../shared` so domain types stay
  single-source (no package publish).
- `eas.json` — build profiles; `.github/workflows/eas-build.yml` runs EAS in CI once
  `EAS_ENABLED` + `EXPO_TOKEN` are set (Phase 7).

## Env

`EXPO_PUBLIC_*` vars are inlined into the bundle at build time — see `.env.example`.
Server defaults to `:3000`; the simulator reaches `localhost:3000`, a physical device
needs your Mac's LAN IP.

## Status

Phase 3 (scaffold) — placeholder screen only. Data layer = Phase 4, auth = Phase 5,
UI = Phase 6. See [`docs/todos.md`](../docs/todos.md) "iOS App" section.
