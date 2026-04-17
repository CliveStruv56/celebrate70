# Celebrate 70 — Performance / Security / Robustness Review

_Generated 2026-04-17. Pick up from here in the next session._

This review covers the search path end-to-end (OSM Overpass hook, Google Places details, Google Maps rendering, weather hook) plus all security surfaces (XSS, URL handling, RLS, secrets) and robustness (error handling, edge cases, cleanup).

---

## CRITICAL — verify before broader share

### C1 · Supabase RLS must be active
`canWrite()` gates every client write, but the gate is obfuscation — the anon key is in the bundle, the passphrase is in the bundle, so anyone determined can bypass both.

Confirm these RLS policies exist in the Supabase dashboard:
- `shared_trips` · `UPDATE` requires a custom claim / JWT / service role only
- `storage.objects` bucket `trip-memories` · `INSERT` limited to `image/*`, ≤10 MB, write-gated
- `SELECT` on both — allow anon (read is intentional)

Without these, any visitor with the share link can wipe the itinerary or upload arbitrary files.

### C2 · Google Maps API key referrer lock
`VITE_GOOGLE_MAPS_API_KEY` is embedded in every JS bundle.
GCP Console → APIs & Services → Credentials → that key → Application restrictions → HTTP referrers → allow your Vercel prod domain, any preview domains, `localhost/*`. Without this, someone can scrape the key and burn quota.

---

## HIGH — straightforward code fixes

### H1 · `Map.tsx` uses `mapId: "DEMO_MAP_ID"`
`client/src/components/Map.tsx:180` — that's Google's demo placeholder. Works, but logs a deprecation warning and could stop any time. Create a Map ID in GCP Console → Maps → Map Management and replace the string.

### H2 · Google Places error entries block retries in the same session
`client/src/pages/ExplorePage.tsx:518` —
```ts
if (googleDetails[place.id] || isLoadingDetails[place.id]) return;
```
treats `{error: status}` as "already loaded". A single transient failure means the user must reload to ever get details for that place.

Fix:
```ts
if ((googleDetails[place.id] && !googleDetails[place.id].error) || isLoadingDetails[place.id]) return;
```

### H3 · Incoming Supabase data is trusted blindly
`client/src/lib/itinerary.ts:505` accepts any array into `TRIP_DAYS`. A malformed row (missing `events`, wrong types) will crash all five clients on the next sync. Add a shape check before splicing.

Same applies to `bucket_list_state` in `client/src/pages/CelebratePage.tsx:36` — no structure validation before `setBucketList(data.bucket_list_state)`.

Suggested minimal guard:
```ts
function isValidTripDay(d: unknown): d is TripDay {
  return !!d && typeof d === 'object'
    && typeof (d as any).id === 'string'
    && typeof (d as any).lat === 'number'
    && typeof (d as any).lng === 'number'
    && Array.isArray((d as any).events);
}
// before splicing
if (Array.isArray(data.itinerary_state) && data.itinerary_state.every(isValidTripDay)) { ... }
```

### H4 · `localStorage` itinerary read at `itinerary.ts:480` has no shape validation
Compare to the Supabase branch which does `Array.isArray(...)`. A corrupted localStorage entry (tab crashed mid-write, quota weirdness) and the app won't boot. Wrap the same guard as H3 around the localStorage parse.

### H5 · Weather timezone edge case
`client/src/components/WeatherStrip.tsx` `formatDay` builds `new Date(iso + 'T00:00:00')` — no `Z`, so it's interpreted as **local time**. In Scotland that's fine (Europe/London). Flagging only if viewed from a non-UK device.

---

## MEDIUM — polish

### M1 · Overpass dedupe by name drops legitimate duplicates
`client/src/hooks/useNearbyPlaces.ts:200` — `seen.add(name.toLowerCase())` means two hotels named "The Royal Hotel" within the radius collapse to one. For rural Scotland mostly fine.
Fix if it bites: key on `name + rounded-coords`.

### M2 · Distance bands re-fetch unnecessarily
Cache key uses `Math.ceil(maxMiles / 5) * 5`, so switching from 0–10 to 10–20 triggers a new network round-trip even though 0–20 would cover both. Cleaner: always fetch at max-cap (30 mi), filter `minMiles/maxMiles` purely client-side. Halves network.

### M3 · `findPlaceFromQuery` by name can resolve wrong place
`client/src/pages/ExplorePage.tsx:533` — searches by `place.name` with 1 km `locationBias`. For common names ("The Park"), Google can pick a place elsewhere. Fix: include address/city in query, or use `nearbySearch` with distance ranking.

### M4 · `fitBounds` fires on every filter change
`client/src/pages/ExplorePage.tsx:366` — tapping Eat/Drink chips re-frames the map. Disorienting. Only `fitBounds` when the origin changes or when transitioning 0↔n places.

### M5 · No CSP / security headers
Add a `vercel.json` `headers` block with a restrictive CSP. Mitigates any XSS that slipped through.
```
Content-Security-Policy:
  default-src 'self';
  img-src 'self' https: data:;
  script-src 'self' https://maps.googleapis.com https://maps.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self'
    https://api.open-meteo.com
    https://*.supabase.co wss://*.supabase.co
    https://overpass-api.de https://overpass.kumi.systems https://maps.mail.ru;
  frame-ancestors 'none';
```
(Tune once CSP is on — Google Maps may need `'unsafe-eval'` for some features; test thoroughly.)

### M6 · Passphrase grep-visible in bundle
`client/src/lib/access.ts:17` — `const DEFAULT_PASSPHRASE = "cawdor70"` is a plaintext string. At least base64 it so `strings dist/public/assets/*.js | grep cawdor` returns nothing. Still not security, just less obvious.

### M7 · `PhotoLightbox` doesn't trap focus
Tab from the close button can jump behind the overlay. Small a11y polish — `focus-trap-react` or a manual focus guard.

### M8 · `loadMapScript` resolves to `null` on both success and error
`client/src/components/Map.tsx:105` — callers can't distinguish. Low impact because `MapView` checks `window.google?.maps` afterwards, but the API shape is misleading. Return a boolean or throw on error.

---

## LOW — if you've got a spare evening

- **L1** — Module-level Supabase subscription leaks on HMR (`itinerary.ts:501–527`). Only affects dev.
- **L2** — `celebrate70_nearby_v1:*` localStorage entries accumulate, no cap. Irrelevant at current scale (6 anchors).
- **L3** — `useWeather` has no `requestSeq` guard; cleanup handles it in practice. Add a seq for symmetry with the OSM hook.
- **L4** — Optimistic photo upload persists on failure. `CelebratePage.tsx:105` should revert `setPhotos(photos)` on error.

---

## What's already good (do not touch)

- ✅ XSS-safe InfoWindow using DOM nodes + `textContent` (`ExplorePage.tsx:253`)
- ✅ `safeUrl()` covers the three surfaces that matter (event.mapUrl, OSM website, Google website)
- ✅ OSM search: single-shot "all" query, AbortController, 24h localStorage cache, mirror race, auto-narrow fallback
- ✅ Google Places: 7-day localStorage cache, negative-cache skip
- ✅ Map markers diffed imperatively — no full tear-down per filter
- ✅ All external `<a>` tags have `rel="noopener noreferrer"`
- ✅ PWA runtime caching split correctly (NetworkOnly on Overpass, CacheFirst on Maps tiles, SWR on CloudFront)
- ✅ File upload client-side validates MIME + size
- ✅ All `localStorage` writes wrapped in try/catch

---

## Recommended order to tackle on resume

1. **C1 + C2 today** — dashboard work only, ~10 minutes.
2. **H2, H3, H4, H5** — straightforward code edits, ~1 hour total.
3. **M5** (CSP) — one file change in `vercel.json`, but needs careful testing.
4. The rest — polish, not blocking.

## Known-not-done from earlier backlog

Still outstanding from the 16 April enhancement list:
- **Live ferry status** (NorthLink / Pentland feeds) — high value, low effort (may be moot once trip completes)
- **Group live location** (5 dots on a map, Supabase-synced) — high value, medium effort
- **Tide & sunset times** per stay — medium value, medium effort
- **Shared countdown / toast** for the birthday dinner — low value, medium effort
- **Optional**: move `itinerary.ts` module-level side-effects into a React `useEffect` (low value, only matters for SSR/tests)

---

## Files referenced in this review (for quick navigation)

- `client/src/hooks/useNearbyPlaces.ts` — OSM search hook (v5)
- `client/src/hooks/useWeather.ts` — Open-Meteo forecast hook
- `client/src/pages/ExplorePage.tsx` — Map panel, Place details, filters
- `client/src/pages/CelebratePage.tsx` — Bucket list, photo gallery
- `client/src/pages/TodayPage.tsx` — Dashboard, weather strip, documents
- `client/src/pages/SharePage.tsx` — QR, passphrase unlock
- `client/src/components/Map.tsx` — Google Maps loader + `MapView`
- `client/src/components/EventCard.tsx` — Itinerary event render
- `client/src/components/PhotoLightbox.tsx` — Fullscreen photo overlay
- `client/src/components/WeatherStrip.tsx` — 3-day forecast strip
- `client/src/components/MapsPicker.tsx` — Apple/Google/Waze deep-link picker
- `client/src/lib/access.ts` — Write-gate (obfuscation)
- `client/src/lib/safeUrl.ts` — URL sanitiser + native map link builder
- `client/src/lib/itinerary.ts` — Live-synced itinerary store
- `client/src/lib/supabase.ts` — Supabase client
- `vite.config.ts` — PWA runtime caching rules
