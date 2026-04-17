# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Personal PWA for a single, specific trip: Clive & Jane Struver's Scotland & Orkney adventure, 17–24 April 2026 (joint 70th birthday week with Tracey & Pete). The itinerary in `client/src/lib/itinerary.ts` is real data, not fixtures — ferry booking refs, Airbnb addresses, What3Words, vehicle reg, etc. Treat as private; do not exfiltrate.

## Commands

```bash
npm run dev      # vite dev server on :3000 (host 0.0.0.0, will pick next free port)
npm run build    # vite build client → dist/public, esbuild server → dist/index.js (ESM)
npm start        # NODE_ENV=production node dist/index.js
npm run check    # tsc --noEmit (the only type/lint gate — no ESLint configured)
npm run format   # prettier --write .
```

No test runner is wired up despite `vitest` being a dev dep — there are no tests. Don't add a test script claim to PRs.

Install must use `npm install --legacy-peer-deps` (see `.npmrc`) — React 19 vs. Radix peer ranges.

## Architecture

**It's effectively a client-only SPA.** The Express server (`server/index.ts`) only serves `dist/public` static files and the SPA fallback in production. There are no API routes. Vercel deploys the static build directly (`vercel.json` points at `dist/public` with a catch-all rewrite to `index.html`); the Express bundle is not used on Vercel.

**Vite layout is unusual:**
- `root: client/` — so `client/index.html` is the entry and public assets live in `client/public/`.
- `outDir: dist/public` (one level up from root).
- Aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets/*` → `attached_assets/*`.
- `vite.config.ts` defines a custom `vitePluginManusDebugCollector` plugin that accepts POSTs to `/__manus__/logs` and writes browser console/network/session logs to `.manus-logs/*.log` (dev only, auto-trimmed at 1 MB). Leave it alone unless explicitly asked.

**Routing:** `wouter`, five top-level routes mounted in `client/src/App.tsx`: `/` (TodayPage), `/journey`, `/celebrate`, `/explore`, `/share`. Layout is hard-capped to `max-w-[480px]` — this is a mobile-first PWA, not a responsive desktop app. The bottom tab nav is only shown on those five routes.

**Itinerary as a live-synced module-level store** (`client/src/lib/itinerary.ts`): the `TRIP_DAYS` array is mutated in place and exposed via `useSyncExternalStore`. On boot it (a) hydrates from `localStorage['celebrate70_itinerary']` synchronously, then (b) fetches authoritative state from Supabase `shared_trips.itinerary_state` where `trip_id = 'cawdor-70'`, then (c) subscribes to `postgres_changes` on that row so edits made by Jane/Tracey/Pete on other devices propagate live. `updateItineraryEvent` / `addItineraryEvent` / `deleteItineraryEvent` mutate in place, write through to localStorage, notify listeners, then `.update()` to Supabase. Any new mutation helper must follow the same three-step pattern or the UI and the cloud will drift. The Supabase write in `syncItineraryToCloud` is gated by `canWrite()` from `lib/access.ts` — local + localStorage always run; cloud only runs when the user has unlocked editing.

**Maps stack is dual:**
- Google Maps JS API (loaded once via `loadMapScript()` in `client/src/components/Map.tsx`) for the interactive map view. Prefers `VITE_GOOGLE_MAPS_API_KEY`; falls back to a Forge proxy via `VITE_FRONTEND_FORGE_API_KEY` / `VITE_FRONTEND_FORGE_API_URL`.
- Overpass API (OpenStreetMap) via `client/src/hooks/useNearbyPlaces.ts` for nearby-place search. Always queries `all` (category filtering happens in the caller, not on the wire — tapping a filter chip must NOT refetch). Races three Overpass mirrors with `Promise.any` and aborts the losers once the winner resolves. Results are classified into six app categories (restaurant / pub / cafe / attraction / activity / accommodation), sorted by haversine distance, capped at 50 km. A 24h `localStorage` cache is keyed on rounded origin + radius bucket; `primeNearbyCache(lat, lng, miles)` is exported so `App.tsx` can warm the unique trip anchors on boot. An in-flight `AbortController` + request-sequence ref drops stale responses when the user changes origin/radius.

**UI system:** Tailwind v4 (via `@tailwindcss/vite`) + `shadcn/ui` components under `client/src/components/ui/` + Radix primitives + `lucide-react`. The design system is hand-rolled in `oklch()` inline styles, not Tailwind tokens — the chosen palette is "Scottish Romanticism" (forest green `oklch(0.28 0.07 155)`, amber gold `oklch(0.72 0.14 68)`, parchment). See `ideas.md` for the palette rationale. Fonts (Playfair Display + Source Sans 3) are loaded from Google Fonts in `client/index.html`.

**PWA:** `vite-plugin-pwa` in `generateSW` mode owns the service worker and the web manifest (configured inline in `vite.config.ts` — there is no static `manifest.json` any more). Registered in `client/src/main.tsx` with `registerType: 'autoUpdate'`. Precaches the app shell + the ferry PDFs under `client/public/docs/`. Runtime cache rules: CloudFront hero images → `StaleWhileRevalidate`, Google Maps JS + tiles → `CacheFirst` (7d), Google Fonts → `StaleWhileRevalidate`, Overpass API → `NetworkOnly` (the hook already has its own cache). `apple-mobile-web-app-*` meta tags remain in `client/index.html`. The manifest still references `/icon-192.png` and `/icon-512.png`, which don't exist yet — install works but icons are missing.

## Environment

All client env vars must be `VITE_`-prefixed. `.env` is gitignored; copy `.env.example` (at repo root) and fill in locally. Any `VITE_`-prefixed value is **visible in the built bundle** — Maps keys must be restricted by HTTP referrer in GCP; Supabase writes must be gated by RLS (the anon key alone is not a secret).

- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL` (fallback map key proxy)
- Optional: `VITE_CELEBRATE70_PASSPHRASE` overrides the default write-gate passphrase (`cawdor70`). See "Write gate" below.

The Supabase client in `client/src/lib/supabase.ts` returns `null` when either env is missing — the itinerary module is defensive about this, so the app still runs offline-only without Supabase configured.

## Conventions

- Prettier: double quotes, semis, 2-space, trailing commas ES5, 80 cols. Run `npm run format` before committing.
- `wouter@3.7.1` has a pnpm patch in `patches/`; if you switch installers or bump the version, check it still applies.
- Don't introduce a test framework or CI unless asked.

**Write gate (`client/src/lib/access.ts`).** Every Supabase `.update()` / `.upload()` call in this app must be wrapped in `canWrite()` — without it, any visitor opening the share QR link could wipe the itinerary or upload to the group album. The gate is **obfuscation only**: the passphrase (default `cawdor70`) is inlined into the bundle, so the real protection is a Supabase RLS policy on `shared_trips` and the `trip-memories` storage bucket. The unlock UI lives on the Share page; unlock state is persisted in `localStorage['celebrate70_write_unlocked_v1']`. Local and `localStorage` writes are never gated — the gate is purely a cloud-sync boundary.

**URL sanitiser (`client/src/lib/safeUrl.ts`).** Any `href` derived from user-editable data — OSM `name`/`website` tags, itinerary `mapUrl` fields, anything that round-trips through Supabase — must pass through `safeUrl()`. It allows only `http`, `https`, `mailto`, `tel`, `geo`, `sms` schemes and returns `undefined` for anything else (including `javascript:`, `data:`). `MapsPicker` uses `mapAppLink()` from the same module to build native Apple/Google/Waze deep links.

**InfoWindow content.** Google Maps InfoWindows MUST be built from DOM nodes with `textContent`, never template strings. See `makeInfoWindowContent` in `ExplorePage.tsx` for the pattern. OSM tag values are user-editable globally and are not sanitised upstream.
