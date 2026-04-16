import { useState, useEffect } from "react";
import { GlassWater, Camera, CheckSquare, Square, Wine, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const TRIP_ID = 'cawdor-70';

const DEFAULT_BUCKET_LIST = [
  { id: 'b1', label: 'Taste a Speyside Single Malt', checked: false },
  { id: 'b2', label: 'Spot the Loch Ness Monster', checked: false },
  { id: 'b3', label: 'Group Photo at Cawdor Castle', checked: false },
  { id: 'b4', label: 'Traditional Scottish Pub Dinner', checked: false },
  { id: 'b5', label: 'Walk on Nairn Beach', checked: false },
];

export default function CelebratePage() {
  const [bucketList, setBucketList] = useState(DEFAULT_BUCKET_LIST);
  const [photos, setPhotos] = useState<string[]>([]);
  
  useEffect(() => {
    // 1. Local Fallback Load
    try {
      const stored = localStorage.getItem('celebrate70_bucket');
      if (stored) setBucketList(JSON.parse(stored));
      const storedPhotos = localStorage.getItem('celebrate70_photos');
      if (storedPhotos) setPhotos(JSON.parse(storedPhotos));
    } catch (e) {}

    // 2. Supabase Cloud Sync
    if (supabase) {
      // Fetch initial bucket state
      supabase.from('shared_trips').select('bucket_list_state').eq('trip_id', TRIP_ID).single()
        .then(({ data }) => {
          if (data?.bucket_list_state && data.bucket_list_state.length > 0) {
            setBucketList(data.bucket_list_state);
            localStorage.setItem('celebrate70_bucket', JSON.stringify(data.bucket_list_state));
          }
        });

      // Subscribe to all updates
      const channel = supabase.channel('celebrate_sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shared_trips', filter: `trip_id=eq.${TRIP_ID}` },
          (payload) => {
            if (payload.new.bucket_list_state?.length > 0) {
              setBucketList(payload.new.bucket_list_state);
              localStorage.setItem('celebrate70_bucket', JSON.stringify(payload.new.bucket_list_state));
            }
          })
        .subscribe();

      // Fetch photos from storage bucket
      refreshPhotos();

      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  async function refreshPhotos() {
    if (!supabase) return;
    const { data } = await supabase.storage.from('trip-memories').list('', { sortBy: { column: 'created_at', order: 'desc' } });
    if (data) {
      const urls = data.map(file => supabase.storage.from('trip-memories').getPublicUrl(file.name).data.publicUrl);
      setPhotos(urls);
      localStorage.setItem('celebrate70_photos', JSON.stringify(urls));
    }
  }

  function toggleItem(id: string) {
    const next = bucketList.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    setBucketList(next);
    localStorage.setItem('celebrate70_bucket', JSON.stringify(next));
    if (next.find(i => i.id === id)?.checked) toast.success('Bucket list item completed! 🎉');
    
    // Broadcast to the rest of the group
    if (supabase) {
      supabase.from('shared_trips').update({ bucket_list_state: next }).eq('trip_id', TRIP_ID).then();
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const tempUrl = URL.createObjectURL(file);
      setPhotos([tempUrl, ...photos]); // Optimistic load
      
      if (supabase) {
        toast.message("Uploading to shared group album...");
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const { error } = await supabase.storage.from('trip-memories').upload(filename, file);
        if (error) {
          toast.error("Upload failed: " + error.message);
        } else {
          toast.success("Photo shared to the group!");
          refreshPhotos();
        }
      } else {
        // Local only fallback
        const reader = new FileReader();
        reader.onload = (ev) => {
          const next = [ev.target?.result as string, ...photos.filter(p => !p.startsWith('blob:'))];
          setPhotos(next);
          try { localStorage.setItem('celebrate70_photos', JSON.stringify(next)); } catch {}
        };
        reader.readAsDataURL(file);
      }
    }
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
                <div key={idx} className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-100 border relative shadow-sm" style={{ borderColor: 'oklch(0.88 0.03 80)' }}>
                  <img src={src} className="w-full h-full object-cover transition-opacity duration-300" alt={`Memory ${idx}`} />
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
