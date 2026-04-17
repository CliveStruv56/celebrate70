// CELEBRATE 70 — MapsPicker
// Small popover that offers Apple Maps / Google Maps / Waze for a
// given lat/lng. On iOS, Apple Maps is the default action.

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Navigation, X } from 'lucide-react';
import { mapAppLink, isIos } from '@/lib/safeUrl';

interface MapsPickerProps {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
  compact?: boolean; // render as icon-only button
}

export function MapsPicker({ lat, lng, label, className, compact }: MapsPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const preferApple = isIos();
  const options: { key: 'apple' | 'google' | 'waze'; label: string; emoji: string }[] = preferApple
    ? [
        { key: 'apple', label: 'Apple Maps', emoji: '🧭' },
        { key: 'google', label: 'Google Maps', emoji: '🗺' },
        { key: 'waze', label: 'Waze', emoji: '🚗' },
      ]
    : [
        { key: 'google', label: 'Google Maps', emoji: '🗺' },
        { key: 'apple', label: 'Apple Maps', emoji: '🧭' },
        { key: 'waze', label: 'Waze', emoji: '🚗' },
      ];

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        title="Open in Maps"
        className={compact
          ? 'flex-shrink-0 p-2 rounded-lg hover:bg-gray-200'
          : 'flex items-center gap-1.5 text-xs font-semibold'}
        style={compact
          ? { background: 'oklch(0.28 0.07 155 / 0.08)' }
          : { color: 'oklch(0.28 0.07 155)' }}>
        {compact ? <ExternalLink size={15} style={{ color: 'oklch(0.28 0.07 155)' }} /> : (
          <>
            <Navigation size={12} />
            Open in Maps
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden min-w-[180px]"
          style={{
            background: 'oklch(1 0 0)',
            border: '1px solid oklch(0.88 0.03 80)',
            boxShadow: '0 6px 24px oklch(0.28 0.07 155 / 0.18)',
          }}
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-3 py-2"
            style={{ background: 'oklch(0.94 0.03 80)' }}>
            <span className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'oklch(0.45 0.04 155)' }}>Navigate with</span>
            <button onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100">
              <X size={13} />
            </button>
          </div>
          {options.map(o => (
            <a key={o.key}
              href={mapAppLink(o.key, lat, lng, label)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 border-b last:border-b-0"
              style={{ color: 'oklch(0.20 0.03 155)', borderColor: 'oklch(0.94 0.03 80)' }}>
              <span>{o.emoji}</span>
              <span className="flex-1 font-medium">{o.label}</span>
              <ExternalLink size={12} style={{ color: 'oklch(0.55 0.04 155)' }} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
