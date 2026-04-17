// =============================================================
// CELEBRATE 70 — Weather Hook (Open-Meteo)
//
// Open-Meteo is free, needs no API key, and has no tight rate
// limits — good fit for a client-only PWA where we can't hide
// credentials anyway. Response is cached in localStorage for
// ~1 hour keyed on rounded coordinates so switching between
// days on Today/Journey re-uses the same fetch.
// =============================================================

import { useEffect, useState } from 'react';

export interface DailyForecast {
  date: string;          // ISO YYYY-MM-DD
  code: number;          // WMO weather code
  tempMax: number;       // °C
  tempMin: number;       // °C
  precipProb: number;    // 0–100
  windKph: number;
}

interface OpenMeteoDailyResponse {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
}

const CACHE_PREFIX = 'celebrate70_weather_v1:';
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry { ts: number; forecast: DailyForecast[] }

function cacheKey(lat: number, lng: number): string {
  const rLat = Math.round(lat * 10) / 10;
  const rLng = Math.round(lng * 10) / 10;
  return `${CACHE_PREFIX}${rLat},${rLng}`;
}

function readCache(key: string): DailyForecast[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.forecast;
  } catch {
    return null;
  }
}

function writeCache(key: string, forecast: DailyForecast[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), forecast } satisfies CacheEntry));
  } catch {
    /* quota exceeded; ignore */
  }
}

async function fetchForecast(lat: number, lng: number, days: number, signal: AbortSignal): Promise<DailyForecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=Europe/London&forecast_days=${days}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as OpenMeteoDailyResponse;
  const d = data.daily;
  if (!d) throw new Error('No daily data in response');
  return d.time.map((date, i) => ({
    date,
    code: d.weather_code[i],
    tempMax: d.temperature_2m_max[i],
    tempMin: d.temperature_2m_min[i],
    precipProb: d.precipitation_probability_max[i] ?? 0,
    windKph: d.wind_speed_10m_max[i] ?? 0,
  }));
}

export function useWeather(lat: number | null, lng: number | null, days: number = 3) {
  const [forecast, setForecast] = useState<DailyForecast[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) return;
    const key = cacheKey(lat, lng);
    const cached = readCache(key);
    if (cached && cached.length >= days) {
      setForecast(cached.slice(0, days));
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchForecast(lat, lng, Math.max(days, 3), controller.signal)
      .then(f => {
        writeCache(key, f);
        setForecast(f.slice(0, days));
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Forecast failed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lat, lng, days]);

  return { forecast, loading, error };
}

// ── WMO weather code → label + severity ──────────────────────
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)

export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
}

export type WeatherKind =
  | 'clear' | 'partly' | 'fog' | 'drizzle' | 'rain'
  | 'snow' | 'showers' | 'thunder' | 'unknown';

export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'unknown';
}
