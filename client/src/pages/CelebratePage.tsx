import { useState, useEffect } from "react";
import { GlassWater, Camera, CheckSquare, Square, Wine, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { canWrite, getPassphrase } from "@/lib/access";
import { PhotoLightbox } from "@/components/PhotoLightbox";

const TRIP_ID = 'cawdor-70';

interface BucketItem { id: string; label: string; checked: boolean }

const DEFAULT_BUCKET_LIST: BucketItem[] = [
  { id: 'b1', label: 'Taste a Speyside Single Malt', checked: false },
  { id: 'b2', label: 'Spot the Loch Ness Monster', checked: false },
  { id: 'b3', label: 'Group Photo at Cawdor Castle', checked: false },
  { id: 'b4', label: 'Traditional Scottish Pub Dinner', checked: false },
  { id: 'b5', label: 'Walk on Nairn Beach', checked: false },
];

function isValidBucketItem(x: unknown): x is BucketItem {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === 'string'
    && typeof o.label === 'string'
    && typeof o.checked === 'boolean';
}

function isValidBucketList(v: unknown): v is BucketItem[] {
  return Array.isArray(v) && v.every(isValidBucketItem);
}

export default function CelebratePage() {
  const [bucketList, setBucketList] = useState(DEFAULT_BUCKET_LIST);
  const [photos, setPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  useEffect(() => {
    // 1. Local Fallback Load
    try {
      const stored = localStorage.getItem('celebrate70_bucket');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidBucketList(parsed)) setBucketList(parsed);
      }
      const storedPhotos = localStorage.getItem('celebrate70_photos');
      if (storedPhotos) {
        const parsed = JSON.parse(storedPhotos);
        if (Array.isArray(parsed) && parsed.every(p => typeof p === 'string')) {
          setPhotos(parsed);
        }
      }
    } catch (e) {}

    // 2. Supabase Cloud Sync
    const sb = supabase;
    if (sb) {
      // Fetch initial bucket state
      sb.from('shared_trips').select('bucket_list_state').eq('trip_id', TRIP_ID).single()
        .then(({ data }) => {
          const incoming = data?.bucket_list_state;
          if (isValidBucketList(incoming) && incoming.length > 0) {
            setBucketList(incoming);
            localStorage.setItem('celebrate70_bucket', JSON.stringify(incoming));
          } else if (incoming !== undefined && incoming !== null) {
            console.warn('Rejected malformed bucket_list_state from Supabase');
          }
        });

      // Subscribe to all updates
      const channel = sb.channel('celebrate_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shared_trips', filter: `trip_id=eq.${TRIP_ID}` },
          (payload) => {
            const next = payload.new.bucket_list_state;
            if (isValidBucketList(next) && next.length > 0) {
              setBucketList(next);
              localStorage.setItem('celebrate70_bucket', JSON.stringify(next));
            }
          })
        .subscribe();

      // Fetch photos from storage bucket
      refreshPhotos();

      return () => { sb.removeChannel(channel); };
    }
  }, []);

  async function refreshPhotos() {
    const sb = supabase;
    if (!sb) return;
    const { data, error } = await sb.storage
      .from('trip-memories')
      .list('', { sortBy: { column: 'created_at', order: 'desc' } });
    if (error) {
      console.error('Photo list failed:', error.message);
      return;
    }
    if (!data) return;
    const cloudUrls = data.map(
      file => sb.storage.from('trip-memories').getPublicUrl(file.name).data.publicUrl
    );
    setPhotos(prev => {
      // Preserve locally-stored photos (data: URLs) that haven't been
      // uploaded to the cloud yet, and keep any already-known cloud URL
      // that the current listing didn't return (e.g. anon RLS blocks list).
      const localOnly = prev.filter(p => p.startsWith('data:'));
      const cloudSet = new Set(cloudUrls);
      const existingCloud = prev.filter(
        p => p.startsWith('http') && !cloudSet.has(p)
      );
      const merged = [...localOnly, ...cloudUrls, ...existingCloud];
      try {
        localStorage.setItem('celebrate70_photos', JSON.stringify(merged));
      } catch {}
      return merged;
    });
  }

  function toggleItem(id: string) {
    const next = bucketList.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    setBucketList(next);
    localStorage.setItem('celebrate70_bucket', JSON.stringify(next));
    if (next.find(i => i.id === id)?.checked) toast.success('Bucket list item completed! 🎉');
    
    // Broadcast to the rest of the group (gated — read-only visitors
    // still see their own optimistic toggle locally).
    if (supabase && canWrite()) {
      supabase.rpc('update_shared_trip', {
        p_trip_id: TRIP_ID,
        p_passphrase: getPassphrase(),
        p_bucket_list_state: next,
      }).then(({ error }) => {
        if (error) console.error('Bucket list cloud sync failed:', error.message);
      });
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Defensive client-side checks: keeps honest users from uploading the
    // wrong file, and keeps the bucket from filling with arbitrary payloads
    // if the input's `accept` attribute is bypassed. Real enforcement must
    // live in the Supabase storage policy.
    const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files can be shared to the album.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('That image is over 10MB. Please resize before uploading.');
      e.target.value = '';
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    setPhotos(prev => [tempUrl, ...prev]); // Optimistic load

    const sb = supabase;
    if (sb && canWrite()) {
      toast.message("Uploading to shared group album...");
      // Preserve the real extension so Supabase serves the right MIME.
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext || 'jpg'}`;
      const { error } = await sb.storage.from('trip-memories').upload(filename, file, {
        contentType: file.type,
      });
      URL.revokeObjectURL(tempUrl);
      if (error) {
        toast.error("Upload failed: " + error.message);
        setPhotos(prev => prev.filter(p => p !== tempUrl));
      } else {
        toast.success("Photo shared to the group!");
        const publicUrl = sb.storage
          .from('trip-memories')
          .getPublicUrl(filename).data.publicUrl;
        // Put the real public URL into state immediately so the photo
        // survives refresh even if bucket listing is restricted by RLS.
        setPhotos(prev => {
          const next = [publicUrl, ...prev.filter(p => p !== tempUrl && p !== publicUrl)];
          try { localStorage.setItem('celebrate70_photos', JSON.stringify(next)); } catch {}
          return next;
        });
        refreshPhotos();
      }
    } else {
      // Local only fallback — keep as a data: URL so it persists across
      // refreshes even when the cloud listing is empty.
      const reader = new FileReader();
      reader.onload = (ev) => {
        URL.revokeObjectURL(tempUrl);
        const dataUrl = ev.target?.result as string;
        setPhotos(prev => {
          const next = [dataUrl, ...prev.filter(p => p !== tempUrl && !p.startsWith('blob:'))];
          try { localStorage.setItem('celebrate70_photos', JSON.stringify(next)); } catch {}
          return next;
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="px-4 pt-6 pb-6" style={{ background: 'oklch(0.28 0.07 155)' }}>
        <div className="flex items-center gap-2 mb-1">
          <PartyPopper size={20} style={{ color: 'oklch(0.72 0.14 68)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.97 0.02 85)', fontFamily: "'Playfair Display', serif" }}>
            The 70th Milestone
          </h1>
        </div>
        <p className="text-sm mt-1" style={{ color: 'oklch(0.72 0.14 68)' }}>
          Clive (March) & Pete (May) — Joint Celebration 2026
        </p>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Toast Board */}
        <div className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, oklch(0.97 0.02 85), oklch(0.94 0.03 80))', border: '1px solid oklch(0.88 0.03 80)' }}>
          <div className="flex justify-center mb-4 gap-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-inner" style={{ background: 'oklch(1 0 0)' }}>
                <span className="text-2xl font-bold" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>C</span>
              </div>
              <span className="font-semibold text-sm" style={{ color: 'oklch(0.20 0.03 155)' }}>Clive</span>
            </div>
            <div className="flex items-center justify-center">
              <Wine size={28} style={{ color: 'oklch(0.72 0.14 68)' }} />
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2 shadow-inner" style={{ background: 'oklch(1 0 0)' }}>
                <span className="text-2xl font-bold" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>P</span>
              </div>
              <span className="font-semibold text-sm" style={{ color: 'oklch(0.20 0.03 155)' }}>Pete</span>
            </div>
          </div>
          <div className="text-center italic text-sm px-4" style={{ color: 'oklch(0.40 0.04 155)', fontFamily: "'Playfair Display', serif" }}>
            "Here's to a combined 140 years of wisdom, friendship, beer, wine, and football!"
          </div>
        </div>

        {/* Bucket List */}
        <div>
          <h2 className="font-bold text-lg mb-3" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
            Highlands Bucket List
          </h2>
          <div className="bg-white rounded-2xl overflow-hidden border" style={{ borderColor: 'oklch(0.88 0.03 80)' }}>
            {bucketList.map((item, idx) => (
              <button key={item.id} onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${idx !== bucketList.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'oklch(0.94 0.03 80)' }}>
                {item.checked ? 
                  <CheckSquare size={20} style={{ color: 'oklch(0.72 0.14 68)' }} /> : 
                  <Square size={20} style={{ color: 'oklch(0.88 0.03 80)' }} />
                }
                <span className={`text-sm font-semibold transition-all ${item.checked ? 'line-through opacity-50' : ''}`}
                  style={{ color: 'oklch(0.20 0.03 155)' }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Memories Gallery */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
              Trip Memories
            </h2>
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors"
              style={{ background: 'oklch(0.28 0.07 155)', color: 'oklch(0.97 0.02 85)' }}>
              <Camera size={14} />
              Add Photo
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          
          {photos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: 'oklch(0.88 0.03 80)' }}>
              <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3" style={{ background: 'oklch(0.94 0.03 80)' }}>
                <Camera size={20} style={{ color: 'oklch(0.55 0.04 155)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'oklch(0.40 0.04 155)' }}>No memories yet</p>
              <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0.04 155)' }}>Upload photos here to track your best moments together.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIndex(idx)}
                  aria-label={`Open memory ${idx + 1}`}
                  className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 border relative shadow-sm cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ borderColor: 'oklch(0.88 0.03 80)' }}>
                  <img src={src} className="w-full h-full object-cover transition-opacity duration-300" alt={`Memory ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      <PhotoLightbox
        photos={photos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
