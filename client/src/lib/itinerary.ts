// =============================================================
// CELEBRATE 70 — Trip Itinerary Data
// Clive & Jane Struver · Scotland & Orkney · 17–24 April 2026
// =============================================================
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { canWrite, getPassphrase } from './access';

export type EventType = 'ferry' | 'checkin' | 'checkout' | 'drive' | 'stay' | 'travel';

export interface TripEvent {
  id: string;
  type: EventType;
  time?: string;       // HH:MM
  title: string;
  subtitle?: string;
  detail?: string;
  address?: string;
  bookingRef?: string;
  operator?: string;
  vehicle?: string;
  checkinTime?: string;
  checkoutTime?: string;
  lat?: number;
  lng?: number;
  mapUrl?: string;
  directionsNote?: string;
  what3words?: string;
  isCurrent?: boolean;
  isPast?: boolean;
}

export interface TripDay {
  id: string;
  date: string;        // ISO date YYYY-MM-DD
  label: string;       // "Friday 17 April"
  dayNum: number;      // 1–8
  headline: string;
  location: string;
  lat: number;
  lng: number;
  events: TripEvent[];
  image?: string;
}

export const TRIP_DAYS: TripDay[] = [
  {
    id: 'day1',
    date: '2026-04-17',
    label: 'Friday 17 April',
    dayNum: 1,
    headline: 'Departure Day',
    location: 'Sanday → Brough, Caithness',
    lat: 58.57,
    lng: -3.51,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/ferry-orkney-4xhdqHdufj8K4CPnucwZBD.webp',
    events: [
      {
        id: 'ev1-1',
        type: 'ferry',
        time: '09:15',
        title: 'Orkney Ferries: Sanday → Kirkwall',
        subtitle: 'Departure from Sanday',
        detail: 'Check in no earlier than 1 hour before departure. Vehicle must be available to board 20 minutes before sailing. Foot passengers 10 minutes before.',
        address: 'Sanday Ferry Terminal, Orkney',
        bookingRef: '354518',
        operator: 'Orkney Ferries',
        vehicle: 'SW16YOP',
        lat: 59.2500,
        lng: -2.5833,
        mapUrl: 'https://maps.google.com/?q=Sanday+Ferry+Terminal+Orkney',
      },
      {
        id: 'ev1-2',
        type: 'drive',
        time: '~10:00',
        title: 'Drive: Kirkwall → Stromness',
        subtitle: 'Across Orkney Mainland',
        detail: 'Approximately 25 minutes. Head west on the A965 through Finstown to Stromness. Check in for NorthLink opens 60 minutes before departure.',
        address: 'Kirkwall, Orkney',
        lat: 58.9833,
        lng: -2.9667,
      },
      {
        id: 'ev1-3',
        type: 'ferry',
        time: '16:45',
        title: 'NorthLink Ferries: Stromness → Scrabster',
        subtitle: 'MV Hamnavoe · 2 Adults + Car',
        detail: 'Check-in opens 60 minutes prior to departure. Car drivers recommended to check in at least 1 hour before. Final boarding 30 minutes before departure. Booking reference is your key — have it ready at check-in.',
        address: 'NorthLink Terminal, Stromness, Orkney',
        bookingRef: '3916217',
        operator: 'NorthLink Ferries',
        vehicle: 'SW16YOP',
        lat: 58.9667,
        lng: -3.3000,
        mapUrl: 'https://maps.google.com/?q=NorthLink+Terminal+Stromness+Orkney',
      },
      {
        id: 'ev1-4',
        type: 'drive',
        time: '~18:00',
        title: 'Drive: Scrabster → Brough Cottage',
        subtitle: 'Approximately 20 minutes',
        detail: 'From Scrabster follow the A9 east towards Thurso. At the traffic light in Thurso turn onto the A836/B855 signposted Castletown. Continue through Castletown to Dunnet. Take a left turn after the Gin Distillery onto the B855. Follow to Brough — at the Brough sign take a left into the village then your first right. Cottage is on the right just after the zigzag in the road.',
        address: 'Scrabster, Caithness',
        lat: 58.6100,
        lng: -3.5300,
      },
      {
        id: 'ev1-5',
        type: 'checkin',
        time: '15:00+',
        title: 'Check-in: Cottage in Brough',
        subtitle: 'Hosted by Julie · Check-in from 15:00',
        detail: 'Whitewashed stone cottage on Main Street, Brough. What3Words: ///unlimited.amazed.matchbox',
        address: 'Main Street, Brough, Scotland KW14 8YE',
        operator: 'Airbnb',
        checkinTime: '15:00',
        checkoutTime: '10:00',
        lat: 58.5700,
        lng: -3.5100,
        what3words: '///unlimited.amazed.matchbox',
        mapUrl: 'https://maps.google.com/?q=Main+Street+Brough+KW14+8YE',
        directionsNote: 'Cottage is on the right just after the zigzag in the road.',
      },
    ],
  },
  {
    id: 'day2',
    date: '2026-04-18',
    label: 'Saturday 18 April',
    dayNum: 2,
    headline: 'Free Day in Caithness',
    location: 'Brough, Caithness',
    lat: 58.5700,
    lng: -3.5100,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/hero-scotland-ammTfMGLeNbrezrDTP6rm9.webp',
    events: [
      {
        id: 'ev2-1',
        type: 'stay',
        title: 'Free Day — Explore Caithness',
        subtitle: 'Based at Brough Cottage',
        detail: 'A wonderful day to explore the far north of Scotland. Nearby highlights include Dunnet Head (the most northerly point of mainland Britain), Castle of Mey, Duncansby Head stacks, and the town of Thurso.',
        address: 'Main Street, Brough, Scotland KW14 8YE',
        lat: 58.5700,
        lng: -3.5100,
      },
    ],
  },
  {
    id: 'day3',
    date: '2026-04-19',
    label: 'Sunday 19 April',
    dayNum: 3,
    headline: 'Travel to Cawdor',
    location: 'Brough → Cawdor, Highlands',
    lat: 57.5252,
    lng: -3.9301,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/cawdor-cottage-JFrL8L4sW66tEQZyMVrvyY.webp',
    events: [
      {
        id: 'ev3-1',
        type: 'checkout',
        time: '10:00',
        title: 'Check-out: Brough Cottage',
        subtitle: 'Check-out before 10:00',
        address: 'Main Street, Brough, Scotland KW14 8YE',
        lat: 58.5700,
        lng: -3.5100,
      },
      {
        id: 'ev3-2',
        type: 'drive',
        time: '~10:30',
        title: 'Drive: Brough → Cawdor',
        subtitle: 'Approximately 2.5 hours via A9',
        detail: 'Head south on the A9 towards Inverness. From Inverness/West take the A96 east towards Aberdeen for approximately 12 miles to the junction signposted Cawdor and Cawdor Castle. Turn right onto the B9090 and continue approximately 4 miles to Cawdor village.',
        address: 'A9 South, Caithness',
        lat: 58.5700,
        lng: -3.5100,
      },
      {
        id: 'ev3-3',
        type: 'checkin',
        time: '16:00+',
        title: 'Check-in: Ivy Cottage, Cawdor',
        subtitle: 'Cawdor Estate Holiday Cottages · Tracey & Pete Arrive!',
        detail: 'Ivy Cottage is the third on the right with "Ivy Cottage" written on the garden gate. Parking is available to the rear of the cottage. From Inverness Airport follow signs to the A96, at the roundabout for A96 turn left heading east towards Aberdeen.',
        address: 'Cawdor, Scotland IV12 5XP',
        operator: 'Airbnb — Cawdor Estate Holiday Cottages',
        checkinTime: '16:00',
        checkoutTime: '10:00',
        lat: 57.5252,
        lng: -3.9301,
        mapUrl: 'https://maps.google.com/?q=Cawdor+IV12+5XP',
        directionsNote: 'Third cottage on right — "Ivy Cottage" on garden gate. Parking at rear.',
      },
      {
        id: 'ev3-4',
        type: 'stay',
        time: '18:00',
        title: 'Welcome Drinks',
        subtitle: 'Ivy Cottage',
        detail: 'Settling in and celebrating the start of the joint 70th birthday week with Tracey and Pete!',
        address: 'Cawdor, Scotland IV12 5XP',
        lat: 57.5252,
        lng: -3.9301,
      },
    ],
  },
  {
    id: 'day4',
    date: '2026-04-20',
    label: 'Monday 20 April',
    dayNum: 4,
    headline: 'Explore the Highlands',
    location: 'Cawdor, near Nairn',
    lat: 57.5252,
    lng: -3.9301,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/cawdor-cottage-JFrL8L4sW66tEQZyMVrvyY.webp',
    events: [
      {
        id: 'ev4-1',
        type: 'stay',
        title: 'Free Day — Highlands & Nairn',
        subtitle: 'Based at Ivy Cottage, Cawdor',
        detail: 'Explore the area around Cawdor. Nearby highlights include Cawdor Castle, Culloden Battlefield, Clava Cairns, Nairn beach, Brodie Castle, and the many whisky distilleries along the Speyside trail.',
        address: 'Cawdor, Scotland IV12 5XP',
        lat: 57.5252,
        lng: -3.9301,
      },
      {
        id: 'ev4-2',
        type: 'stay',
        time: '19:30',
        title: 'Joint 70th Birthday Dinner',
        subtitle: 'Celebration Meal',
        detail: 'A special dinner outing near Nairn or Inverness to formally celebrate Clive (March) and Pete (May) hitting their 70th milestones together!',
        address: 'Nairn context',
      },
    ],
  },
  {
    id: 'day5',
    date: '2026-04-21',
    label: 'Tuesday 21 April',
    dayNum: 5,
    headline: 'Explore the Highlands',
    location: 'Cawdor, near Nairn',
    lat: 57.5252,
    lng: -3.9301,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/cawdor-cottage-JFrL8L4sW66tEQZyMVrvyY.webp',
    events: [
      {
        id: 'ev5-1',
        type: 'stay',
        title: 'Free Day — Inverness & Beyond',
        subtitle: 'Based at Ivy Cottage, Cawdor',
        detail: 'A great day to visit Inverness city centre, Loch Ness and Urquhart Castle, or take a drive along the Black Isle. Fortrose, Cromarty, and the Chanonry Point dolphin-watching spot are all within easy reach.',
        address: 'Cawdor, Scotland IV12 5XP',
        lat: 57.5252,
        lng: -3.9301,
      },
    ],
  },
  {
    id: 'day6',
    date: '2026-04-22',
    label: 'Wednesday 22 April',
    dayNum: 6,
    headline: 'Last Full Day in the Highlands',
    location: 'Cawdor, near Nairn',
    lat: 57.5252,
    lng: -3.9301,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/cawdor-cottage-JFrL8L4sW66tEQZyMVrvyY.webp',
    events: [
      {
        id: 'ev6-1',
        type: 'stay',
        title: 'Free Day — Last Day in the Highlands',
        subtitle: 'Based at Ivy Cottage, Cawdor',
        detail: 'Make the most of the final full day in the Highlands. Consider a visit to the Cairngorms National Park or simply enjoy the beautiful Cawdor Castle grounds and woodland walks.',
        address: 'Cawdor, Scotland IV12 5XP',
        lat: 57.5252,
        lng: -3.9301,
      },
      {
        id: 'ev6-2',
        type: 'stay',
        time: '14:00',
        title: 'Celebration Excursion: Whisky Tasting',
        subtitle: 'Speyside / Highland Distillery',
        detail: 'A formal toast to the 70th milestones with a proper Scottish distillery tour and tasting!',
        lat: 57.5252,
        lng: -3.9301,
      },
    ],
  },
  {
    id: 'day7',
    date: '2026-04-23',
    label: 'Thursday 23 April',
    dayNum: 7,
    headline: 'Return to Brough',
    location: 'Cawdor → Brough, Caithness',
    lat: 58.5700,
    lng: -3.5100,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/hero-scotland-ammTfMGLeNbrezrDTP6rm9.webp',
    events: [
      {
        id: 'ev7-1',
        type: 'checkout',
        time: '10:00',
        title: 'Check-out: Ivy Cottage, Cawdor',
        subtitle: 'Check-out before 10:00',
        address: 'Cawdor, Scotland IV12 5XP',
        lat: 57.5252,
        lng: -3.9301,
      },
      {
        id: 'ev7-2',
        type: 'drive',
        time: '~10:30',
        title: 'Drive: Cawdor → Brough',
        subtitle: 'Approximately 2.5 hours via A9 North',
        detail: 'Head north on the A9 through Inverness and up the east coast of Caithness. Follow the same route back to Brough.',
        address: 'A9 North, Highlands',
        lat: 57.5252,
        lng: -3.9301,
      },
      {
        id: 'ev7-3',
        type: 'checkin',
        time: 'Afternoon',
        title: 'Overnight: Cottage in Brough',
        subtitle: 'Final night at Brough Cottage',
        detail: 'Returning to the cottage in Brough for the final overnight stay before the return ferry journey to Orkney.',
        address: 'Main Street, Brough, Scotland KW14 8YE',
        lat: 58.5700,
        lng: -3.5100,
        what3words: '///unlimited.amazed.matchbox',
      },
    ],
  },
  {
    id: 'day8',
    date: '2026-04-24',
    label: 'Friday 24 April',
    dayNum: 8,
    headline: 'Return to Orkney',
    location: 'Brough → Sanday, Orkney',
    lat: 59.2500,
    lng: -2.5833,
    image: 'https://d2xsxph8kpxj0f.cloudfront.net/97249619/YoPZRhvHbDNGPh6yQgkQmf/ferry-orkney-4xhdqHdufj8K4CPnucwZBD.webp',
    events: [
      {
        id: 'ev8-1',
        type: 'drive',
        time: 'Morning',
        title: 'Drive: Brough → Gills Bay',
        subtitle: 'Approximately 30 minutes',
        detail: 'Head east from Brough towards John o\' Groats, then follow signs to Gills Bay ferry terminal.',
        address: 'Brough, Caithness',
        lat: 58.5700,
        lng: -3.5100,
      },
      {
        id: 'ev8-2',
        type: 'ferry',
        time: '12:30',
        title: 'Check-in: Pentland Ferries',
        subtitle: 'Gills Bay Terminal · Check-in 12:30–13:00',
        detail: 'Check-in window is 12:30–13:00. Vehicle check-in: arrive no earlier than 1 hour before departure. Vehicle must be available to board 20 minutes before sailing.',
        address: 'Gills Bay Ferry Terminal, Caithness',
        bookingRef: '93761100',
        operator: 'Pentland Ferries',
        vehicle: 'SW16YOP',
        lat: 58.6300,
        lng: -3.1200,
        mapUrl: 'https://maps.google.com/?q=Gills+Bay+Ferry+Terminal+Caithness',
      },
      {
        id: 'ev8-3',
        type: 'ferry',
        time: '13:30',
        title: 'Pentland Ferries: Gills Bay → St Margaret\'s Hope',
        subtitle: 'MV Pentalina · Arrives 14:40',
        detail: 'Approximately 1 hour 10 minutes crossing. Arrives at St Margaret\'s Hope, South Ronaldsay, Orkney.',
        address: 'Gills Bay, Caithness',
        bookingRef: '93761100',
        operator: 'Pentland Ferries',
        vehicle: 'SW16YOP',
        lat: 58.6300,
        lng: -3.1200,
      },
      {
        id: 'ev8-4',
        type: 'drive',
        time: '~14:40',
        title: 'Drive: St Margaret\'s Hope → Kirkwall',
        subtitle: 'Approximately 30 minutes',
        detail: 'From St Margaret\'s Hope follow the A961 north through South Ronaldsay and across the Churchill Barriers to Kirkwall.',
        address: 'St Margaret\'s Hope, South Ronaldsay, Orkney',
        lat: 58.8333,
        lng: -2.9500,
      },
      {
        id: 'ev8-5',
        type: 'ferry',
        time: '16:40',
        title: 'Orkney Ferries: Kirkwall → Sanday',
        subtitle: 'Return home to Sanday',
        detail: 'Check in no earlier than 1 hour before departure. Vehicle must be available to board 20 minutes before sailing.',
        address: 'Kirkwall Ferry Terminal, Orkney',
        bookingRef: '354518',
        operator: 'Orkney Ferries',
        vehicle: 'SW16YOP',
        lat: 58.9833,
        lng: -2.9667,
        mapUrl: 'https://maps.google.com/?q=Kirkwall+Ferry+Terminal+Orkney',
      },
      {
        id: 'ev8-6',
        type: 'stay',
        time: 'Evening',
        title: 'Home: Sanday, Orkney',
        subtitle: 'Welcome home!',
        detail: 'Back at Thorwald, Sanday. What a trip!',
        address: 'Thorwald, Sanday, Orkney, KW17 2AY',
        lat: 59.2500,
        lng: -2.5833,
      },
    ],
  },
];

export function getTodayDay(): TripDay | null {
  const today = new Date().toISOString().split('T')[0];
  return TRIP_DAYS.find(d => d.date === today) || null;
}

export function getCurrentDayIndex(): number {
  const today = new Date().toISOString().split('T')[0];
  const idx = TRIP_DAYS.findIndex(d => d.date === today);
  if (idx !== -1) return idx;
  // Before trip
  if (today < TRIP_DAYS[0].date) return -1;
  // After trip
  return TRIP_DAYS.length;
}

export function getNextEvent(dayIndex: number): TripEvent | null {
  if (dayIndex < 0 || dayIndex >= TRIP_DAYS.length) return null;
  const day = TRIP_DAYS[dayIndex];
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  for (const ev of day.events) {
    if (!ev.time) continue;
    if (ev.time.startsWith('~')) {
      const t = ev.time.slice(1);
      if (t > hhmm) return ev;
    } else if (ev.time > hhmm) {
      return ev;
    }
  }
  // Check next day
  if (dayIndex + 1 < TRIP_DAYS.length) {
    return TRIP_DAYS[dayIndex + 1].events[0] || null;
  }
  return null;
}

// ── EDITABLE ITINERARY LOGIC ────────────────────────────────

const TRIP_ID = 'cawdor-70';

function isValidTripDay(d: unknown): d is TripDay {
  if (!d || typeof d !== 'object') return false;
  const day = d as Record<string, unknown>;
  return typeof day.id === 'string'
    && typeof day.date === 'string'
    && typeof day.lat === 'number'
    && typeof day.lng === 'number'
    && Array.isArray(day.events);
}

function isValidTripDays(v: unknown): v is TripDay[] {
  return Array.isArray(v) && v.every(isValidTripDay);
}

// 1. Initial Load: Try Local Storage first for instant display
try {
  const stored = localStorage.getItem('celebrate70_itinerary');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (isValidTripDays(parsed) && parsed.length > 0) {
      TRIP_DAYS.length = 0;
      TRIP_DAYS.push(...parsed);
    }
  }
} catch (e) {
  console.error("Failed to load local itinerary", e);
}

// 2. Setup Listeners
let listeners: (() => void)[] = [];
let tripDaysSnapshot = [...TRIP_DAYS];

export function subscribeItinerary(listener: () => void) {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
}

// 3. Supabase Live Sync Integration
if (supabase) {
  // Fetch authoritative state from cloud on boot
  supabase.from('shared_trips').select('itinerary_state').eq('trip_id', TRIP_ID).single()
    .then(({ data }) => {
      const incoming = data?.itinerary_state;
      if (isValidTripDays(incoming) && incoming.length > 0) {
        TRIP_DAYS.length = 0;
        TRIP_DAYS.push(...incoming);
        localStorage.setItem('celebrate70_itinerary', JSON.stringify(TRIP_DAYS));
        listeners.forEach(l => l());
      } else if (incoming !== undefined && incoming !== null) {
        console.warn('Rejected malformed itinerary_state from Supabase');
      }
    });

  // Subscribe to real-time changes made by Jane, Pete, or Tracey
  supabase.channel('itinerary_channel')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shared_trips', filter: `trip_id=eq.${TRIP_ID}` },
      (payload) => {
        const newState = payload.new.itinerary_state;
        if (isValidTripDays(newState) && newState.length > 0) {
          TRIP_DAYS.length = 0;
          TRIP_DAYS.push(...newState);
          tripDaysSnapshot = [...TRIP_DAYS];
          localStorage.setItem('celebrate70_itinerary', JSON.stringify(TRIP_DAYS));
          listeners.forEach(l => l());
        } else if (newState !== undefined && newState !== null) {
          console.warn('Rejected malformed itinerary_state from Supabase realtime');
        }
      })
    .subscribe();
}

// 4. Update function (Writes locally -> broadcasts to Cloud)
export function updateItineraryEvent(dayId: string, eventId: string, newDetails: Partial<TripEvent>) {
  const day = TRIP_DAYS.find(d => d.id === dayId);
  if (!day) return;
  const evIndex = day.events.findIndex(e => e.id === eventId);
  if (evIndex === -1) return;
  
  day.events[evIndex] = { ...day.events[evIndex], ...newDetails };
  syncItineraryToCloud();
}

export function addItineraryEvent(dayId: string, event: TripEvent) {
  const day = TRIP_DAYS.find(d => d.id === dayId);
  if (!day) return;
  day.events.push(event);
  syncItineraryToCloud();
}

export function deleteItineraryEvent(dayId: string, eventId: string) {
  const day = TRIP_DAYS.find(d => d.id === dayId);
  if (!day) return;
  day.events = day.events.filter(e => e.id !== eventId);
  syncItineraryToCloud();
}

function syncItineraryToCloud() {
  tripDaysSnapshot = [...TRIP_DAYS];
  localStorage.setItem('celebrate70_itinerary', JSON.stringify(TRIP_DAYS));
  listeners.forEach(l => l());
  // Local edits always persist; cloud sync is gated so a casual visitor
  // holding the share link can't overwrite everyone else's view.
  if (supabase && canWrite()) {
    supabase.rpc('update_shared_trip', {
      p_trip_id: TRIP_ID,
      p_passphrase: getPassphrase(),
      p_itinerary_state: TRIP_DAYS,
    }).then(({ error }) => {
      if (error) console.error('Itinerary cloud sync failed:', error.message);
    });
  }
}

export function useItinerary() {
  return useSyncExternalStore(subscribeItinerary, () => tripDaysSnapshot);
}
