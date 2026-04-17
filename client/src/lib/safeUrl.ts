// Allow-listed URL schemes. Any href derived from user-editable data
// (OSM tags, shared itinerary fields from Supabase) must go through
// this helper to prevent javascript:/data: URL XSS.

const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:', 'geo:', 'sms:']);

export function safeUrl(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
    return SAFE_SCHEMES.has(u.protocol) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Builds the best native-maps deep link for the current platform.
// iOS/Safari handles both https://maps.apple.com and maps://
// equally well for Apple Maps; Android resolves geo: into Google Maps.
export type MapApp = 'apple' | 'google' | 'waze';

export function mapAppLink(app: MapApp, lat: number, lng: number, label?: string): string {
  const q = `${lat},${lng}`;
  const encoded = label ? encodeURIComponent(label) : '';
  switch (app) {
    case 'apple':
      return `https://maps.apple.com/?q=${encoded || q}&ll=${q}`;
    case 'google':
      return `https://maps.google.com/?q=${q}${label ? `(${encoded})` : ''}`;
    case 'waze':
      return `https://waze.com/ul?ll=${q}&navigate=yes`;
  }
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
}
