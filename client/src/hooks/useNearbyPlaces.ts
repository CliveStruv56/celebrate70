// =============================================================
// CELEBRATE 70 — Nearby Places Hook (v4)
// Two-pass Overpass strategy:
//   Pass 1: node + way elements (fast, most amenities & pubs)
//   Pass 2: relation elements (castles, estates, large sites)
//   Both passes use `out center tags` which reliably returns
//   a centroid for all geometry types.
//   Results are merged, de-duplicated and sorted by distance.
// =============================================================

import { useState, useCallback } from 'react';

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

// ── Query builders ────────────────────────────────────────────

/** Unified fast query using explicit tags and nwr (node, way, relation) to prevent heavy regex load */
function buildCombinedQuery(lat: number, lng: number, r: number): string {
  const a = `(around:${r},${lat},${lng})`;
  const o = (k: string, v: string) => `nwr["${k}"="${v}"]${a};\n`;
  return `[out:json][timeout:30];
(
  ${['restaurant', 'fast_food', 'food_court', 'pub', 'bar', 'biergarten', 'cafe', 'theatre', 'cinema', 'arts_centre'].map(v => o('amenity', v)).join('')}
  ${['castle', 'fort', 'manor', 'stately_home', 'country_house', 'estate', 'abbey', 'priory', 'cathedral', 'church', 'ruins', 'archaeological_site', 'battlefield', 'tower', 'building'].map(v => o('historic', v)).join('')}
  ${['attraction', 'museum', 'gallery', 'viewpoint', 'theme_park', 'zoo', 'aquarium', 'artwork', 'picnic_site', 'camp_site'].map(v => o('tourism', v)).join('')}
  ${['golf_course', 'sports_centre', 'swimming_pool', 'fitness_centre', 'marina', 'nature_reserve', 'park', 'garden', 'bird_hide', 'fishing', 'horse_riding', 'miniature_golf', 'water_park'].map(v => o('leisure', v)).join('')}
  ${['peak', 'cliff', 'cave_entrance', 'beach', 'hot_spring', 'waterfall', 'bay', 'cape'].map(v => o('natural', v)).join('')}
  ${o('waterway', 'waterfall')}
  ${['distillery', 'winery', 'brewery', 'smokehouse'].map(v => o('craft', v)).join('')}
  ${['outdoor', 'sports', 'gift', 'craft', 'farm', 'deli', 'seafood', 'distillery', 'winery', 'brewery'].map(v => o('shop', v)).join('')}
);
out center tags;`;
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
  if (['monument', 'memorial', 'tower', 'folly', 'building'].includes(historic))
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

// ── Geometry helpers ──────────────────────────────────────────

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

// ── Network helpers ───────────────────────────────────────────

async function fetchJsonWithTimeout(url: string, body: string, timeoutMs: number = 20000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(body)}`,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    clearTimeout(timer);
    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function runQuery(query: string): Promise<unknown[]> {
  const promises = OVERPASS_MIRRORS.map(async (mirror) => {
    const data = await fetchJsonWithTimeout(mirror, query, 20000) as { elements?: unknown[] };
    return data.elements ?? [];
  });

  try {
    return await Promise.any(promises);
  } catch {
    throw new Error('All OpenStreetMap mirrors timed out or failed. Please reduce radius and try again.');
  }
}

// ── Element → NearbyPlace ─────────────────────────────────────

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function parseElements(
  elements: unknown[],
  originLat: number,
  originLng: number,
  seen: Set<string>
): NearbyPlace[] {
  const results: NearbyPlace[] = [];
  for (const el of elements as OsmElement[]) {
    const tags = el.tags || {};
    const name = tags.name;
    if (!name || seen.has(name.toLowerCase())) continue;

    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    if (!elLat || !elLng) continue;

    seen.add(name.toLowerCase());
    const { category, label } = classifyPlace(tags);
    const dist = haversine(originLat, originLng, elLat, elLng);

    const addressParts = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
      tags['addr:postcode'],
    ].filter(Boolean);

    results.push({
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
  return results;
}

// ── Main query function ───────────────────────────────────────

async function queryOverpass(lat: number, lng: number, radiusMetres: number): Promise<NearbyPlace[]> {
  const r = Math.min(radiusMetres, 50000);

  // Run the combined fast query over our network of mirrors
  const elements = await runQuery(buildCombinedQuery(lat, lng, r));

  const seen = new Set<string>();
  const results: NearbyPlace[] = parseElements(elements, lat, lng, seen);

  results.sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
  return results.slice(0, 150);
}

// ── React hook ────────────────────────────────────────────────

export function useNearbyPlaces() {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<{ lat: number; lng: number; radius: number } | null>(null);

  const search = useCallback(async (lat: number, lng: number, radiusMiles: number = 20) => {
    setLoading(true);
    setError(null);
    const radiusMetres = Math.round(Math.min(radiusMiles, 31) * 1609.34);

    try {
      const results = await queryOverpass(lat, lng, radiusMetres);
      setPlaces(results);
      setLastSearch({ lat, lng, radius: radiusMiles });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      if (msg.includes('504') || msg.includes('timeout') || msg.includes('abort')) {
        setError('The map data server timed out. Try a smaller radius or tap Try Again.');
      } else if (msg.includes('429')) {
        setError('Too many requests — please wait a few seconds and try again.');
      } else {
        setError(`Could not load nearby places: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { places, loading, error, search, lastSearch };
}
