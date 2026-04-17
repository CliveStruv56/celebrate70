// CELEBRATE 70 — Compact 3-day weather strip for TodayPage hero
// Uses Open-Meteo (free, no key). See useWeather.ts for caching.

import {
  Sun, CloudSun, Cloud, CloudRain, CloudDrizzle,
  CloudSnow, CloudLightning, CloudFog, Droplets, Wind,
} from 'lucide-react';
import { useWeather, weatherKind, weatherLabel, type WeatherKind, type DailyForecast } from '@/hooks/useWeather';

function WeatherIcon({ kind, size = 22 }: { kind: WeatherKind; size?: number }) {
  const color = 'oklch(0.72 0.14 68)';
  switch (kind) {
    case 'clear':   return <Sun size={size} style={{ color }} />;
    case 'partly':  return <CloudSun size={size} style={{ color }} />;
    case 'fog':     return <CloudFog size={size} style={{ color }} />;
    case 'drizzle': return <CloudDrizzle size={size} style={{ color }} />;
    case 'rain':
    case 'showers': return <CloudRain size={size} style={{ color }} />;
    case 'snow':    return <CloudSnow size={size} style={{ color }} />;
    case 'thunder': return <CloudLightning size={size} style={{ color }} />;
    default:        return <Cloud size={size} style={{ color }} />;
  }
}

function formatDay(iso: string, isFirst: boolean): string {
  if (isFirst) return 'Today';
  // Anchor to Scotland's zone so the weekday is correct regardless of
  // the viewer's locale. Noon UTC avoids DST ambiguity around midnight.
  const d = new Date(iso + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    timeZone: 'Europe/London',
  });
}

export function WeatherStrip({ lat, lng, locationLabel }: {
  lat: number | null;
  lng: number | null;
  locationLabel?: string;
}) {
  const { forecast, loading, error } = useWeather(lat, lng, 3);

  if (error || (!loading && !forecast)) return null;

  return (
    <div className="mb-4 rounded-2xl p-3"
      style={{
        background: 'linear-gradient(135deg, oklch(0.97 0.02 85), oklch(0.94 0.03 80))',
        border: '1px solid oklch(0.88 0.03 80)',
      }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'oklch(0.55 0.04 155)' }}>
          Forecast{locationLabel ? ` · ${locationLabel}` : ''}
        </div>
        {loading && !forecast && (
          <div className="text-[10px]" style={{ color: 'oklch(0.55 0.04 155)' }}>loading…</div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(forecast ?? Array.from({ length: 3 }, () => null)).map((day, i) => (
          <WeatherCell key={i} day={day} isFirst={i === 0} />
        ))}
      </div>
    </div>
  );
}

function WeatherCell({ day, isFirst }: { day: DailyForecast | null; isFirst: boolean }) {
  if (!day) {
    return (
      <div className="rounded-xl p-2 flex flex-col items-center gap-1 h-[96px]"
        style={{ background: 'oklch(1 0 0 / 0.5)' }} />
    );
  }
  const kind = weatherKind(day.code);
  return (
    <div className="rounded-xl p-2 flex flex-col items-center gap-0.5"
      style={{ background: 'oklch(1 0 0 / 0.6)' }}>
      <div className="text-[11px] font-semibold" style={{ color: 'oklch(0.40 0.04 155)' }}>
        {formatDay(day.date, isFirst)}
      </div>
      <WeatherIcon kind={kind} size={22} />
      <div className="text-[10px]" style={{ color: 'oklch(0.45 0.04 155)' }}>
        {weatherLabel(day.code)}
      </div>
      <div className="text-[13px] font-bold tabular-nums" style={{ color: 'oklch(0.20 0.03 155)' }}>
        {Math.round(day.tempMax)}° / {Math.round(day.tempMin)}°
      </div>
      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'oklch(0.55 0.04 155)' }}>
        <span className="flex items-center gap-0.5 tabular-nums">
          <Droplets size={9} />{day.precipProb}%
        </span>
        <span className="flex items-center gap-0.5 tabular-nums">
          <Wind size={9} />{Math.round(day.windKph)}
        </span>
      </div>
    </div>
  );
}
