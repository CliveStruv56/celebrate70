// CELEBRATE 70 — Explore Page (v3)
// Design: Scottish Romanticism — forest green / amber gold / warm parchment
// Features:
//   - List view + Map view toggle
//   - Google Maps with AdvancedMarkerElement pins colour-coded by category
//   - Info windows on pin tap showing name, category, distance, directions link
//   - "You are here" origin pin
//   - Category filter chips sync with both views
//   - Trip location shortcuts

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin, Navigation, Search, Loader2, AlertCircle,
  ExternalLink, Utensils, Beer, Landmark, Activity,
  Coffee, RefreshCw, List, Map as MapIcon,
} from "lucide-react";
import { MapView, loadMapScript } from "@/components/Map";
import { useNearbyPlaces, type PlaceCategory, type NearbyPlace } from "@/hooks/useNearbyPlaces";
import { TRIP_DAYS, getCurrentDayIndex } from "@/lib/itinerary";

export interface GooglePlaceDetails {
  rating?: number;
  userRatingsTotal?: number;
  photoUrl?: string;
  openNow?: boolean;
  weekdayText?: string[];
  website?: string;
  phone?: string;
  error?: string;
}


// ── Category config ────────────────────────────────────────────────────────────

const CATEGORY_FILTERS: { key: PlaceCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { key: 'all',         label: 'All',   icon: MapPin    },
  { key: 'restaurant',  label: 'Eat',   icon: Utensils  },
  { key: 'pub',         label: 'Drink', icon: Beer      },
  { key: 'attraction',  label: 'See',   icon: Landmark  },
  { key: 'activity',    label: 'Do',    icon: Activity  },
  { key: 'cafe',        label: 'Café',  icon: Coffee    },
];

// Colour per category — used for both list badges and map pin backgrounds
const CATEGORY_COLORS: Record<PlaceCategory | 'all', { bg: string; text: string; pin: string }> = {
  all:           { bg: 'oklch(0.28 0.07 155 / 0.12)', text: 'oklch(0.28 0.07 155)', pin: '#2d6a4f' },
  restaurant:    { bg: 'oklch(0.55 0.15 25  / 0.12)', text: 'oklch(0.45 0.12 25)',  pin: '#c0392b' },
  pub:           { bg: 'oklch(0.55 0.12 50  / 0.12)', text: 'oklch(0.45 0.10 50)',  pin: '#d35400' },
  attraction:    { bg: 'oklch(0.40 0.12 260 / 0.12)', text: 'oklch(0.35 0.10 260)', pin: '#2980b9' },
  activity:      { bg: 'oklch(0.50 0.14 155 / 0.12)', text: 'oklch(0.35 0.10 155)', pin: '#27ae60' },
  cafe:          { bg: 'oklch(0.55 0.10 65  / 0.12)', text: 'oklch(0.45 0.08 65)',  pin: '#8e6b3e' },
  accommodation: { bg: 'oklch(0.50 0.08 290 / 0.12)', text: 'oklch(0.40 0.06 290)', pin: '#7f8c8d' },
};

// ── PlaceCard ──────────────────────────────────────────────────────────────────

function PlaceCard({ place, highlight, onClick, googleDetails, isLoadingDetails }: {
  place: NearbyPlace;
  highlight?: boolean;
  onClick?: () => void;
  googleDetails?: GooglePlaceDetails;
  isLoadingDetails?: boolean;
}) {
  const mapsUrl = `https://maps.google.com/?q=${place.lat},${place.lng}`;
  const iconMap: Record<PlaceCategory, React.ElementType> = {
    restaurant: Utensils, pub: Beer, attraction: Landmark,
    activity: Activity, cafe: Coffee, accommodation: MapPin,
  };
  const Icon = iconMap[place.category] || MapPin;
  const colors = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.all;

  // If no onClick is provided (we are in Map mode or highlight mode), clicking the card opens Maps natively
  const handleCardInteraction = onClick || (() => window.open(mapsUrl, '_blank'));

  return (
    <div
      onClick={handleCardInteraction}
      className="rounded-xl flex flex-col overflow-hidden transition-all cursor-pointer border hover:border-gray-400"
      style={{
        background: highlight ? 'oklch(0.97 0.04 80)' : 'oklch(1 0 0)',
        border: `1px solid ${highlight ? 'oklch(0.72 0.14 68)' : 'oklch(0.88 0.03 80)'}`,
        boxShadow: highlight
          ? '0 0 0 2px oklch(0.72 0.14 68 / 0.3)'
          : '0 1px 3px oklch(0.28 0.07 155 / 0.06)',
      }}>
      {highlight && googleDetails?.photoUrl && (
        <div className="w-full h-40 sm:h-48 relative bg-gray-100">
           <img src={googleDetails.photoUrl} className="w-full h-full object-cover" alt={place.name} />
        </div>
      )}
      <div className="p-3 flex items-start gap-3 flex-1 flex-col sm:flex-row">
        <div className="w-full flex items-start gap-3">
          <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: colors.bg }}>
            <Icon size={16} style={{ color: colors.text }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-snug"
              style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
              {place.name}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: colors.bg, color: colors.text }}>
                {place.categoryLabel}
              </span>
              {place.distanceMiles !== undefined && (
                <span className="text-[10px]" style={{ color: 'oklch(0.55 0.04 155)' }}>
                  {place.distanceMiles} mi
                </span>
              )}
              {highlight && googleDetails?.rating !== undefined && (
                <span className="text-[10px] font-semibold bg-white border px-1.5 py-0.5 rounded flex items-center gap-0.5"
                  style={{ borderColor: 'oklch(0.75 0.14 68)', color: 'oklch(0.45 0.14 68)' }}>
                  ⭐ {googleDetails.rating} ({googleDetails.userRatingsTotal})
                </span>
              )}
              {highlight && googleDetails?.openNow !== undefined && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ 
                    background: googleDetails.openNow ? 'oklch(0.95 0.1 150)' : 'oklch(0.95 0.1 25)', 
                    color: googleDetails.openNow ? 'oklch(0.3 0.1 150)' : 'oklch(0.3 0.1 25)'
                  }}>
                  {googleDetails.openNow ? 'Open Now' : 'Closed'}
                </span>
              )}
              {highlight && (googleDetails as any)?.error && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: 'oklch(0.95 0.1 25)', color: 'oklch(0.3 0.1 25)' }}>
                  Google API Error: {(googleDetails as any).error}
                </span>
              )}
              {highlight && isLoadingDetails && (
                <span className="text-[10px] animate-pulse" style={{ color: 'oklch(0.55 0.04 155)' }}>
                  Loading details...
                </span>
              )}
            </div>
            {place.address && (
              <div className="text-[11px] mt-1 truncate" style={{ color: 'oklch(0.55 0.04 155)' }}>
                {place.address}
              </div>
            )}
            
            {/* Extended Details */}
            {highlight && googleDetails && (
              <div className="mt-3 space-y-1.5" style={{ color: 'oklch(0.35 0.04 155)' }}>
                {googleDetails.phone && (
                  <div className="text-[11px]">📞 {googleDetails.phone}</div>
                )}
                {googleDetails.website && (
                  <div className="text-[11px] truncate">🔗 <a href={googleDetails.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="underline hover:text-blue-600">{googleDetails.website}</a></div>
                )}
                {googleDetails.weekdayText && googleDetails.weekdayText.length > 0 && (
                  <div className="text-[11px] mt-2 bg-white/50 p-2 rounded leading-snug border border-gray-200">
                    <strong className="block mb-1 opacity-70 uppercase tracking-wider text-[9px]">Opening Times:</strong>
                    {googleDetails.weekdayText.map((day, i) => {
                      const [d, t] = day.split(': ');
                      return (
                        <div key={i} className="flex justify-between gap-4">
                          <span className="font-medium opacity-80">{d}</span>
                          <span>{t || 'Closed'}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="Open in Native Google Maps"
            className="flex-shrink-0 p-2 rounded-lg mt-0.5 hover:bg-gray-200"
            style={{ background: 'oklch(0.28 0.07 155 / 0.08)' }}>
            <ExternalLink size={15} style={{ color: 'oklch(0.28 0.07 155)' }} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── MapPanel ───────────────────────────────────────────────────────────────────

interface MapPanelProps {
  places: NearbyPlace[];
  originLat: number | null;
  originLng: number | null;
  selectedId: number | null;
  onSelectPlace: (id: number | null) => void;
}

function MapPanel({ places, originLat, originLng, selectedId, onSelectPlace }: MapPanelProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const originMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Build a custom SVG pin element for AdvancedMarkerElement
  function makePinElement(color: string, emoji: string): HTMLElement {
    const div = document.createElement('div');
    div.style.cssText = `
      display:flex; flex-direction:column; align-items:center; cursor:pointer;
    `;
    div.innerHTML = `
      <div style="
        width:32px; height:32px; border-radius:50% 50% 50% 0;
        transform:rotate(-45deg); background:${color};
        border:2px solid rgba(255,255,255,0.9);
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg); font-size:13px; line-height:1;">${emoji}</span>
      </div>
    `;
    return div;
  }

  function categoryEmoji(cat: PlaceCategory): string {
    const map: Record<PlaceCategory, string> = {
      restaurant: '🍽', pub: '🍺', attraction: '🏛',
      activity: '⛳', cafe: '☕', accommodation: '🏠',
    };
    return map[cat] || '📍';
  }

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    // "You are here" origin marker
    if (originLat && originLng) {
      const originEl = document.createElement('div');
      originEl.style.cssText = `
        width:18px; height:18px; border-radius:50%;
        background:#1a73e8; border:3px solid white;
        box-shadow:0 0 0 3px rgba(26,115,232,0.3);
      `;
      originMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: originLat, lng: originLng },
        title: 'Search origin',
        content: originEl,
      });
    }

    // Place markers
    places.forEach(place => {
      const colors = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.all;
      const pinEl = makePinElement(colors.pin, categoryEmoji(place.category));

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        content: pinEl,
      });

      marker.addListener('click', () => {
        onSelectPlace(place.id);
        const mapsUrl = `https://maps.google.com/?q=${place.lat},${place.lng}`;
        infoWindowRef.current?.setContent(`
          <div style="font-family:'Playfair Display',serif; max-width:200px; padding:4px 2px;">
            <div style="font-weight:700; font-size:13px; color:#1a2e1e; margin-bottom:4px;">${place.name}</div>
            <div style="font-size:11px; color:#4a7c59; margin-bottom:2px;">${place.categoryLabel}${place.distanceMiles !== undefined ? ' · ' + place.distanceMiles + ' mi' : ''}</div>
            ${place.address ? `<div style="font-size:10px; color:#6b7280; margin-bottom:6px;">${place.address}</div>` : ''}
            <a href="${mapsUrl}" target="_blank" style="
              display:inline-flex; align-items:center; gap:4px;
              font-size:11px; font-weight:600; color:#1a73e8;
              text-decoration:none; margin-top:2px;
            ">Open in Maps ↗</a>
          </div>
        `);
        infoWindowRef.current?.open({ map, anchor: marker });
      });

      markersRef.current.push(marker);
    });

    // Fit bounds or pan to selected
    if (selectedId !== null) {
      const selectedPlace = places.find(p => p.id === selectedId);
      if (selectedPlace) {
        map.setCenter({ lat: selectedPlace.lat, lng: selectedPlace.lng });
        map.setZoom(15);
      }
    } else if (places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      if (originLat && originLng) bounds.extend({ lat: originLat, lng: originLng });
      places.slice(0, 50).forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
    } else if (originLat && originLng) {
      map.setCenter({ lat: originLat, lng: originLng });
      map.setZoom(11);
    }
  }, [places, originLat, originLng, onSelectPlace, selectedId]);

  // Pan to selected marker when selectedId changes
  useEffect(() => {
    if (!mapRef.current || selectedId === null) return;
    const place = places.find(p => p.id === selectedId);
    if (place) {
      mapRef.current.panTo({ lat: place.lat, lng: place.lng });
      mapRef.current.setZoom(14);
    }
  }, [selectedId, places]);

  const center = originLat && originLng
    ? { lat: originLat, lng: originLng }
    : { lat: 57.5252, lng: -3.9301 };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid oklch(0.88 0.03 80)' }}>
      <MapView
        key={`map-${originLat}-${originLng}-${places.length}`}
        className="w-full h-[55vh] min-h-[320px]"
        initialCenter={center}
        initialZoom={11}
        onMapReady={handleMapReady}
      />
      {/* Legend */}
      <div className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-1"
        style={{ background: 'oklch(0.98 0.01 80)', borderTop: '1px solid oklch(0.88 0.03 80)' }}>
        {CATEGORY_FILTERS.filter(f => f.key !== 'all').map(({ key, label }) => {
          const colors = CATEGORY_COLORS[key as PlaceCategory];
          return (
            <div key={key} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: colors.pin }} />
              <span className="text-[10px]" style={{ color: 'oklch(0.45 0.04 155)' }}>{label}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#1a73e8' }} />
          <span className="text-[10px]" style={{ color: 'oklch(0.45 0.04 155)' }}>You</span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [radius, setRadius] = useState(20);
  const [activeFilter, setActiveFilter] = useState<PlaceCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [manualLocation, setManualLocation] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const [googleDetails, setGoogleDetails] = useState<Record<number, GooglePlaceDetails>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState<Record<number, boolean>>({});

  const { places, loading, error, search } = useNearbyPlaces();

  const dayIndex = getCurrentDayIndex();
  const currentDay = dayIndex >= 0 && dayIndex < TRIP_DAYS.length ? TRIP_DAYS[dayIndex] : TRIP_DAYS[0];

  const getLocation = useCallback(() => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by this browser');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        if (manualLocation) return;
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocationName('Your current location');
      },
      () => {
        setGpsLoading(false);
        if (manualLocation) return;
        setGpsError('Could not get your location. Using trip location instead.');
        setUserLat(currentDay.lat);
        setUserLng(currentDay.lng);
        setLocationName(currentDay.location);
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true } // Changed to true for improved accuracy
    );
  }, [currentDay]);

  useEffect(() => { 
    loadMapScript();
    getLocation(); 
  }, [getLocation]);

  useEffect(() => {
    if (userLat && userLng) search(userLat, userLng, radius);
  }, [userLat, userLng, radius, search]);

  function handleSearch() {
    if (userLat && userLng) search(userLat, userLng, radius);
  }

  function useTripLocation(day: typeof currentDay) {
    setManualLocation(true);
    const cleanLabel = day.location.split('→').pop()?.trim() || day.location;
    setUserLat(day.lat);
    setUserLng(day.lng);
    setLocationName(cleanLabel);
    // If coords are the same, useEffect won't trigger, so we force a search manually:
    if (userLat === day.lat && userLng === day.lng) {
      search(day.lat, day.lng, radius);
    }
  }

  const filtered = activeFilter === 'all' ? places : places.filter(p => p.category === activeFilter);

  function fetchGoogleDetails(place: NearbyPlace) {
    if (!window.google?.maps?.places || googleDetails[place.id] || isLoadingDetails[place.id]) return;
    
    setIsLoadingDetails(prev => ({ ...prev, [place.id]: true }));
    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
    
    service.findPlaceFromQuery({
      query: place.name,
      fields: ['place_id'],
      locationBias: { radius: 1000, center: { lat: place.lat, lng: place.lng } }
    }, (results, status) => {
       if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].place_id) {
           service.getDetails({
               placeId: results[0].place_id,
               fields: ['rating', 'user_ratings_total', 'photos', 'opening_hours', 'website', 'formatted_phone_number']
           }, (detailRes, detailStatus) => {
               setIsLoadingDetails(prev => ({ ...prev, [place.id]: false }));
               if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && detailRes) {
                   setGoogleDetails(prev => ({
                       ...prev,
                       [place.id]: {
                           rating: detailRes.rating,
                           userRatingsTotal: detailRes.user_ratings_total,
                           photoUrl: detailRes.photos && detailRes.photos.length > 0 ? detailRes.photos[0].getUrl({ maxWidth: 400 }) : undefined,
                           openNow: detailRes.opening_hours?.isOpen ? detailRes.opening_hours.isOpen() : undefined,
                           weekdayText: detailRes.opening_hours?.weekday_text,
                           website: detailRes.website,
                           phone: detailRes.formatted_phone_number
                       }
                   }));
               } else {
                   setGoogleDetails(prev => ({
                       ...prev,
                       [place.id]: { error: detailStatus } as unknown as GooglePlaceDetails
                   }));
               }
           });
       } else {
           setIsLoadingDetails(prev => ({ ...prev, [place.id]: false }));
           console.error("Google Places Find Place failed:", status);
           setGoogleDetails(prev => ({
               ...prev,
               [place.id]: { error: status } as unknown as GooglePlaceDetails
           }));
       }
    });
  }

  // When a pin is selected, scroll the corresponding card into view in list mode
  function handleSelectPlace(id: number | null) {
    setSelectedId(id);
    if (id !== null) {
      const place = places.find(p => p.id === id);
      if (place) fetchGoogleDetails(place);
      
      if (viewMode === 'list') {
        setTimeout(() => {
          const el = document.getElementById(`place-card-${id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }

  // Switch to map view and pan to pin when card is tapped in list mode
  function handleCardClick(place: NearbyPlace) {
    setSelectedId(place.id);
    setViewMode('map');
    fetchGoogleDetails(place);
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4" style={{ background: 'oklch(0.28 0.07 155)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold"
              style={{ color: 'oklch(0.97 0.02 85)', fontFamily: "'Playfair Display', serif" }}>
              Explore Nearby
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'oklch(0.72 0.14 68)' }}>
              Restaurants, pubs, attractions & activities
            </p>
          </div>
          {/* List / Map toggle */}
          <div className="flex rounded-xl overflow-hidden"
            style={{ border: '1px solid oklch(0.97 0.02 85 / 0.25)' }}>
            {(['list', 'map'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all"
                style={{
                  background: viewMode === mode ? 'oklch(0.97 0.02 85 / 0.15)' : 'transparent',
                  color: viewMode === mode ? 'oklch(0.97 0.02 85)' : 'oklch(0.72 0.14 68)',
                }}>
                {mode === 'list' ? <List size={14} /> : <MapIcon size={14} />}
                {mode === 'list' ? 'List' : 'Map'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Location Card */}
        <div className="rounded-2xl p-4" style={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.03 80)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Navigation size={16} className="mt-0.5 flex-shrink-0"
                style={{ color: gpsError ? 'oklch(0.55 0.12 30)' : 'oklch(0.28 0.07 155)' }} />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'oklch(0.55 0.04 155)' }}>
                  Searching near
                </div>
                <div className="text-sm font-semibold truncate" style={{ color: 'oklch(0.20 0.03 155)' }}>
                  {gpsLoading ? 'Getting location…' : locationName || 'Tap to get location'}
                </div>
                {userLat && userLng && (
                  <div className="text-[10px] tabular-nums mt-0.5" style={{ color: 'oklch(0.65 0.04 155)' }}>
                    {userLat.toFixed(4)}°N, {Math.abs(userLng).toFixed(4)}°W
                  </div>
                )}
              </div>
            </div>
            <button onClick={getLocation} disabled={gpsLoading}
              className="flex-shrink-0 p-2 rounded-xl transition-all"
              style={{ background: 'oklch(0.28 0.07 155 / 0.08)' }}>
              {gpsLoading
                ? <Loader2 size={16} className="animate-spin" style={{ color: 'oklch(0.28 0.07 155)' }} />
                : <RefreshCw size={16} style={{ color: 'oklch(0.28 0.07 155)' }} />}
            </button>
          </div>

          {gpsError && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: 'oklch(0.55 0.12 30)' }} />
              <p className="text-[11px]" style={{ color: 'oklch(0.55 0.12 30)' }}>{gpsError}</p>
            </div>
          )}

          {/* Radius + Search */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: 'oklch(0.55 0.04 155)' }}>Radius:</span>
            {[5, 10, 20, 30].map(r => (
              <button key={r} onClick={() => setRadius(r)}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: radius === r ? 'oklch(0.28 0.07 155)' : 'oklch(0.94 0.03 80)',
                  color: radius === r ? 'oklch(0.97 0.02 85)' : 'oklch(0.45 0.04 155)',
                }}>
                {r}mi
              </button>
            ))}
            <button onClick={handleSearch} disabled={loading || !userLat}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: 'oklch(0.72 0.14 68)', color: 'oklch(0.15 0.04 155)' }}>
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              Search
            </button>
          </div>
        </div>

        {/* Trip location shortcuts */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: 'oklch(0.55 0.04 155)' }}>
            Search by trip location
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {TRIP_DAYS
              .filter((d, i, arr) => arr.findIndex(x => x.lat === d.lat && x.lng === d.lng) === i)
              .map(day => {
                const label = day.location.split('→').pop()?.trim() || day.location;
                return (
                  <button key={day.id} onClick={() => useTripLocation(day)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                    style={{
                      background: locationName === label ? 'oklch(0.28 0.07 155)' : 'oklch(0.94 0.03 80)',
                      color: locationName === label ? 'oklch(0.97 0.02 85)' : 'oklch(0.40 0.04 155)',
                    }}>
                    {label}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORY_FILTERS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveFilter(key)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: activeFilter === key ? 'oklch(0.72 0.14 68)' : 'oklch(0.94 0.03 80)',
                color: activeFilter === key ? 'oklch(0.15 0.04 155)' : 'oklch(0.45 0.04 155)',
              }}>
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: 'oklch(0.28 0.07 155)' }} />
            <p className="text-sm" style={{ color: 'oklch(0.55 0.04 155)' }}>Searching OpenStreetMap…</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: 'oklch(0.97 0.02 30 / 0.5)', border: '1px solid oklch(0.88 0.05 30)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'oklch(0.55 0.12 30)' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'oklch(0.35 0.08 30)' }}>Search failed</p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.45 0.06 30)' }}>{error}</p>
              </div>
            </div>
            <button onClick={handleSearch}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'oklch(0.28 0.07 155)', color: 'oklch(0.97 0.02 85)' }}>
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        )}

        {/* Empty filter state */}
        {!loading && !error && filtered.length === 0 && places.length > 0 && (
          <p className="text-center text-sm py-4" style={{ color: 'oklch(0.55 0.04 155)' }}>
            No {activeFilter === 'all' ? 'places' : activeFilter + 's'} found in this category
          </p>
        )}

        {/* Results: Map view */}
        {!loading && !error && filtered.length > 0 && viewMode === 'map' && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'oklch(0.55 0.04 155)' }}>
              {filtered.length} place{filtered.length !== 1 ? 's' : ''} found within {radius} miles
              {selectedId !== null && (
                <button onClick={() => setSelectedId(null)}
                  className="ml-2 underline" style={{ color: 'oklch(0.45 0.08 68)' }}>
                  Clear selection
                </button>
              )}
            </p>
            <MapPanel
              places={filtered}
              originLat={userLat}
              originLng={userLng}
              selectedId={selectedId}
              onSelectPlace={handleSelectPlace}
            />
            {/* Selected place card below map */}
            {selectedId !== null && (() => {
              const p = filtered.find(x => x.id === selectedId);
              return p ? (
                <div className="mt-2">
                  <p className="text-xs mb-1.5 font-semibold" style={{ color: 'oklch(0.55 0.04 155)' }}>
                    Selected
                  </p>
                  <PlaceCard 
                    place={p} 
                    highlight 
                    googleDetails={googleDetails[p.id]}
                    isLoadingDetails={isLoadingDetails[p.id]}
                  />
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Results: List view */}
        {!loading && !error && filtered.length > 0 && viewMode === 'list' && (
          <div className="space-y-2" ref={listRef}>
            <p className="text-xs" style={{ color: 'oklch(0.55 0.04 155)' }}>
              {filtered.length} place{filtered.length !== 1 ? 's' : ''} found within {radius} miles
              <span className="ml-2" style={{ color: 'oklch(0.65 0.08 68)' }}>
                · Tap a card to see it on the map
              </span>
            </p>
            {filtered.map(place => (
              <div key={place.id} id={`place-card-${place.id}`}>
                <PlaceCard
                  place={place}
                  highlight={false}
                  onClick={() => handleCardClick(place)}
                  googleDetails={googleDetails[place.id]}
                  isLoadingDetails={isLoadingDetails[place.id]}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && places.length === 0 && userLat && (
          <div className="text-center py-8">
            <MapPin size={32} className="mx-auto mb-2" style={{ color: 'oklch(0.75 0.04 155)' }} />
            <p className="text-sm" style={{ color: 'oklch(0.55 0.04 155)' }}>
              Tap Search to find nearby places
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
