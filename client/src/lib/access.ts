// CELEBRATE 70 — write-access gate
//
// ⚠️  THIS IS OBFUSCATION ONLY.  Do not treat it as a security control.
//
// The passphrase constant below is inlined into the static bundle. Anyone
// who really wants to write to the Supabase backend can grep for it. The
// point of this gate is merely to stop a casual visitor (who opened the
// Share QR link) from wiping the itinerary, toggling bucket-list items,
// or uploading files *by accident*.
//
// The real protection is a Supabase Row Level Security policy on
// `shared_trips` and the `trip-memories` storage bucket. Add that in the
// Supabase dashboard; this file is a seatbelt, not a lock.

// Shared passphrase — change here or override at runtime by setting
// VITE_CELEBRATE70_PASSPHRASE in the env. Same obfuscation caveat applies.
const DEFAULT_PASSPHRASE = "cawdor70";
const PASSPHRASE =
  (import.meta.env.VITE_CELEBRATE70_PASSPHRASE as string | undefined) ||
  DEFAULT_PASSPHRASE;

const STORAGE_KEY = "celebrate70_write_unlocked_v1";

let unlocked: boolean = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
})();

type Listener = () => void;
const listeners = new Set<Listener>();

export function canWrite(): boolean {
  return unlocked;
}

// Exposed for the cloud-sync RPC. Same obfuscation caveat as above — the
// value is already inlined into the bundle; the real gate is Supabase RLS.
export function getPassphrase(): string {
  return PASSPHRASE;
}

export function unlock(phrase: string): boolean {
  if (phrase.trim().toLowerCase() === PASSPHRASE.toLowerCase()) {
    unlocked = true;
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    listeners.forEach(l => l());
    return true;
  }
  return false;
}

export function lock() {
  unlocked = false;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  listeners.forEach(l => l());
}

export function onAccessChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
