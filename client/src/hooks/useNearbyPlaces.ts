// =============================================================
// CELEBRATE 70 — Nearby Places Hook (v5)
//
// Strategy:
//   - Always fetch category = "all" for a given origin + radius.
//     Category filtering happens in the component, not on the wire.
//     (Tapping a chip no longer refetches.)
//   - 24h localStorage cache keyed on (rounded lat/lng, radius bucket).
//   - AbortController + request ID: in-flight requests are cancelled
//     when the user changes origin/radius; stale responses are dropped.
//   - On failure, auto-retry once at half the radius before surfacing
//     an error to the user.
//   - Mirror race via Promise.any stays, but the losers' fetches are
//     aborted the moment the first mirror succeeds.
// =============================================================

import { useCallback, useEffect, useRef, useState } from 'react';

export type PlaceCategory = 'restaurant' | 'pub' | 'attraction' | 'activity' | 'cafe' | 'accommodation';

export interface NearbyPlace {
  id: number;
  name: string;
  category: PlaceCategory;
  categoryLabel: string;
  lat: number;
  lng: number;
  distanceMiles?: number;
  address?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  tags: Record<string, string>;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const CACHE_PREFIX = 'celebrate70_nearby_v1:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIRROR_TIMEOUT_MS = 20_000;

// ── Query builder ─────────────────────────────────────────────
// Always queries "all" — categories are applied in-memory later.
// Dropped `historic=building` (previously matched every tagged
// building in the bbox, which was the single largest source of
// noise and query time).
function buildAllQuery(lat: number, lng: number, maxR: number): string {
  const nwr = (k: string, v: string) => `nwr["${k}"="${v}"](around:${maxR},${lat},${lng});`;

  const amenities = ['restaurant', 'fast_food', 'food_court', 'pub', 'bar', 'biergarten', 'cafe', 'theatre', 'cinema', 'arts_centre'];
  const historic = ['castle', 'fort', 'manor', 'stately_home', 'country_house', 'estate', 'abbey', 'priory', 'cathedral', 'church', 'ruins', 'archaeological_site', 'battlefield', 'tower', 'monument', 'memorial', 'folly'];
  const tourism = ['attraction', 'museum', 'gallery', 'viewpoint', 'theme_park', 'zoo', 'aquarium', 'artwork', 'picnic_site', 'camp_site', 'information'];
  const natural = ['peak', 'cliff', 'cave_entrance', 'beach', 'hot_spring', 'waterfall', 'bay', 'cape'];
  const leisure = ['nature_reserve', 'park', 'garden', 'bird_hide', 'golf_course', 'sports_centre', 'swimming_pool', 'fitness_centre', 'marina', 'fishing', 'horse_riding', 'miniature_golf', 'water_park'];
  const craft = ['distillery', 'winery', 'brewery', 'smokehouse'];
  const shop = ['distillery', 'winery', 'brewery', 'farm', 'deli', 'seafood', 'outdoor', 'sports', 'gift', 'craft'];

  const parts: string[] = [
    ...amenities.map(v => nwr('amenity', v)),
    ...historic.map(v => nwr('historic', v)),
    ...tourism.map(v => nwr('tourism', v)),
    ...natural.map(v => nwr('natural', v)),
    nwr('waterway', 'waterfall'),
    ...leisure.map(v => nwr('leisure', v)),
    ...craft.map(v => nwr('craft', v)),
    ...shop.map(v => nwr('shop', v)),
  ];

  return `[out:json][timeout:25];(${parts.join('')});out center tags;`;
}

// ── Classification ────────────────────────────────────────────

function classifyPlace(tags: Record<string, string>): { category: PlaceCategory; label: string } {
  const amenity = tags.amenity || '';
  const tourism = tags.tourism || '';
  const leisure = tags.leisure || '';
  const historic = tags.historic || '';
  const shop = tags.shop || '';
  const craft = tags.craft || '';
  const natural = tags.natural || '';
  const waterway = tags.waterway || '';

  if (['restaurant', 'fast_food', 'food_court'].includes(amenity)) return { category: 'restaurant', label: 'Restaurant' };
  if (['pub', 'bar', 'biergarten'].includes(amenity)) return { category: 'pub', label: 'Pub / Bar' };
  if (amenity === 'cafe') return { category: 'cafe', label: 'Café' };
  if (['theatre', 'cinema', 'arts_centre'].includes(amenity)) return { category: 'activity', label: 'Entertainment' };

  if (['castle', 'fort', 'manor', 'stately_home', 'country_house', 'estate'].includes(historic))
    return { category: 'attraction', label: 'Castle / Estate' };
  if (['abbey', 'priory', 'cathedral', 'church'].includes(historic))
    return { category: 'attraction', label: 'Historic Church' };
  if (['ruins', 'archaeological_site', 'battlefield'].includes(historic))
    return { category: 'attraction', label: 'Historic Site' };
  if (['monument', 'memorial', 'tower', 'folly'].includes(historic))
    return { category: 'attraction', label: 'Monument' };

  if (['museum', 'gallery'].includes(tourism)) return { category: 'attraction', label: 'Museum / Gallery' };
  if (tourism === 'viewpoint') return { category: 'attraction', label: 'Viewpoint' };
  if (['zoo', 'aquarium', 'theme_park'].includes(tourism)) return { category: 'attraction', label: 'Attraction' };
  if (['picnic_site', 'camp_site'].includes(tourism)) return { category: 'activity', label: 'Outdoor' };
  if (tourism === 'attraction') return { category: 'attraction', label: 'Attraction' };
  if (['artwork', 'information'].includes(tourism)) return { category: 'attraction', label: 'Point of Interest' };

  if (['golf_course', 'miniature_golf'].includes(leisure)) return { category: 'activity', label: 'Golf' };
  if (['sports_centre', 'swimming_pool', 'fitness_centre'].includes(leisure)) return { category: 'activity', label: 'Sports' };
  if (leisure === 'marina') return { category: 'activity', label: 'Marina' };
  if (['horse_riding', 'fishing', 'water_park'].includes(leisure)) return { category: 'activity', label: 'Activity' };
  if (['nature_reserve', 'bird_hide'].includes(leisure)) return { category: 'attraction', label: 'Nature Reserve' };
  if (['park', 'garden'].includes(leisure)) return { category: 'attraction', label: 'Park / Garden' };

  if (natural === 'peak') return { category: 'attraction', label: 'Hill / Mountain' };
  if (['cliff', 'cave_entrance'].includes(natural)) return { category: 'attraction', label: 'Natural Feature' };
  if (['beach', 'bay', 'cape'].includes(natural)) return { category: 'attraction', label: 'Beach / Coast' };
  if (['waterfall', 'hot_spring'].includes(natural)) return { category: 'attraction', label: 'Natural Feature' };
  if (waterway === 'waterfall') return { category: 'attraction', label: 'Waterfall' };

  if (['distillery', 'winery', 'brewery', 'smokehouse'].includes(craft))
    return { category: 'activity', label: craft.charAt(0).toUpperCase() + craft.slice(1) };
  if (['distillery', 'winery', 'brewery'].includes(shop))
    return { category: 'activity', label: shop.charAt(0).toUpperCase() + shop.slice(1) };
  if (['outdoor', 'sports'].includes(shop)) return { category: 'activity', label: 'Outdoor Shop' };
  if (['gift', 'craft', 'farm', 'deli', 'seafood'].includes(shop)) return { category: 'activity', label: 'Local Shop' };

  return { category: 'attraction', label: 'Point of Interest' };
}

// ── Geometry ──────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Network ───────────────────────────────────────────────────

async function fetchOverpass(mirror: string, query: string, signal: AbortSignal): Promise<unknown[]> {
  const res = await fetch(mirror, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { elements?: unknown[] };
  return data.elements ?? [];
}

async function runQuery(query: string, parentSignal: AbortSignal): Promise<unknown[]> {
  // Per-mirror AbortController so the winners can cancel the losers.
  const controllers = OVERPASS_MIRRORS.map(() => new AbortController());
  const onParentAbort = () => controllers.forEach(c => c.abort());
  parentSignal.addEventListener('abort', onParentAbort);

  // Overall budget: Promise.any short-circuits on first success.
  const attempts = OVERPASS_MIRRORS.map((mirror, i) => {
    const timer = setTimeout(() => controllers[i].abort(), MIRROR_TIMEOUT_MS);
    return fetchOverpass(mirror, query, controllers[i].signal)
      .finally(() => clearTimeout(timer));
  });

  try {
    const elements = await Promise.any(attempts);
    // Cancel losers
    controllers.forEach(c => c.abort());
    return elements;
  } finally {
    parentSignal.removeEventListener('abort', onParentAbort);
  }
}

// ── Parse ─────────────────────────────────────────────────────

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function parseElements(elements: unknown[], originLat: number, originLng: number): NearbyPlace[] {
  const seen = new Set<string>();
  const out: NearbyPlace[] = [];
  for (const el of elements as OsmElement[]) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name || seen.has(name.toLowerCase())) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (elLat == null || elLng == null) continue;

    seen.add(name.toLowerCase());
    const { category, label } = classifyPlace(tags);
    const dist = haversine(originLat, originLng, elLat, elLng);

    const addressParts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
      tags['addr:postcode'],
    ].filter(Boolean);

    out.push({
      id: el.id,
      name,
      category,
      categoryLabel: label,
      lat: elLat,
      lng: elLng,
      distanceMiles: Math.round(dist * 10) / 10,
      address: addressParts.length > 0 ? addressParts.join(', ') : undefined,
      website: tags.website || tags['contact:website'],
      phone: tags.phone || tags['contact:phone'],
      openingHours: tags.opening_hours,
      tags,
    });
  }
  return out;
}

// ── Cache ─────────────────────────────────────────────────────

function cacheKey(lat: number, lng: number, maxMiles: number): string {
  // Round to ~1km so nearby searches hit the same bucket.
  const rLat = Math.round(lat * 100) / 100;
  const rLng = Math.round(lng * 100) / 100;
  // Bucket radius so e.g. 10/20/30 are distinct entries.
  const rMiles = Math.ceil(maxMiles / 5) * 5;
  return `${CACHE_PREFIX}${rLat},${rLng},${rMiles}`;
}

interface CacheEntry { ts: number; places: NearbyPlace[] }

function readCache(key: string): NearbyPlace[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.places;
  } catch {
    return null;
  }
}

function writeCache(key: string, places: NearbyPlace[]) {
  try {
    const entry: CacheEntry = { ts: Date.now(), places };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    /* quota exceeded; ignore */
  }
}

// ── Fetch with auto-narrow fallback ───────────────────────────

async function fetchPlaces(
  lat: number, lng: number, maxMiles: number, parentSignal: AbortSignal
): Promise<NearbyPlace[]> {
  const radiusMetres = Math.round(Math.min(maxMiles, 40) * 1609.34);
  try {
    const elements = await runQuery(buildAllQuery(lat, lng, radiusMetres), parentSignal);
    return parseElements(elements, lat, lng);
  } catch (err) {
    // Don't retry if the caller cancelled us.
    if (parentSignal.aborted) throw err;
    // Auto-narrow once: half the radius tends to succeed when the
    // full-radius query times out at Overpass.
    const halfR = Math.round(radiusMetres / 2);
    if (halfR < 1000) throw err; // <~0.6 mi is pointless
    const elements = await runQuery(buildAllQuery(lat, lng, halfR), parentSignal);
    return parseElements(elements, lat, lng);
  }
}

// ── Cache priming (used to warm trip anchors on app boot) ────

const inFlightPrime = new Set<string>();

export async function primeNearbyCache(lat: number, lng: number, maxMiles: number = 10): Promise<void> {
  const key = cacheKey(lat, lng, maxMiles);
  if (inFlightPrime.has(key) || readCache(key)) return;
  inFlightPrime.add(key);
  const controller = new AbortController();
  try {
    const raw = await fetchPlaces(lat, lng, maxMiles, controller.signal);
    writeCache(key, raw);
  } catch {
    /* prefetch is best-effort */
  } finally {
    inFlightPrime.delete(key);
  }
}

// ── Hook ──────────────────────────────────────────────────────

export function useNearbyPlaces() {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<{ lat: number; lng: number; minMiles: number; maxMiles: number } | null>(null);

  // Stale-response guard: only the most recent request may set state.
  const requestSeq = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const search = useCallback(async (lat: number, lng: number, minMiles: number = 0, maxMiles: number = 20) => {
    // Cancel any in-flight request
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const seq = ++requestSeq.current;

    setLastSearch({ lat, lng, minMiles, maxMiles });
    setError(null);

    const key = cacheKey(lat, lng, maxMiles);
    const cached = readCache(key);
    if (cached) {
      if (seq !== requestSeq.current) return;
      const filtered = cached.filter(p => (p.distanceMiles ?? 999) >= minMiles && (p.distanceMiles ?? 999) <= maxMiles);
      setPlaces(filtered.slice(0, 200));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const raw = await fetchPlaces(lat, lng, maxMiles, controller.signal);
      if (seq !== requestSeq.current) return; // stale
      writeCache(key, raw);
      const filtered = raw
        .filter(p => (p.distanceMiles ?? 999) >= minMiles && (p.distanceMiles ?? 999) <= maxMiles)
        .sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
      setPlaces(filtered.slice(0, 200));
    } catch (err) {
      if (seq !== requestSeq.current) return; // stale
      if (controller.signal.aborted) return; // user-initiated cancel
      const msg = err instanceof Error ? err.message : 'Search failed';
      if (msg.includes('504') || msg.includes('timeout') || msg.includes('abort')) {
        setError('The map data server timed out. Try a smaller radius or tap Try Again.');
      } else if (msg.includes('429')) {
        setError('Too many requests — please wait a few seconds and try again.');
      } else {
        setError(`Could not load nearby places: ${msg}`);
      }
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  // Abort any in-flight request when the hook unmounts.
  useEffect(() => {
    return () => activeController.current?.abort();
  }, []);

  return { places, loading, error, search, lastSearch };
}
