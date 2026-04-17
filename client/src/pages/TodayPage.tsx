// =============================================================
// CELEBRATE 70 — Today Page
// Shows current trip status, next event, and day overview
// Design: Scottish Romanticism — forest green, amber gold
// =============================================================

import { useState, useEffect } from "react";
import { MapPin, Clock, ChevronRight, Anchor, Home, Car, CheckCircle2, Star, FileText } from "lucide-react";
import { useItinerary, getCurrentDayIndex, getNextEvent, type TripEvent, type TripDay } from "@/lib/itinerary";
import EventCard from "@/components/EventCard";
import { WeatherStrip } from "@/components/WeatherStrip";

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function TripStatusBanner({ dayIndex, tripDays }: { dayIndex: number, tripDays: TripDay[] }) {
  if (dayIndex < 0) {
    const daysUntil = Math.ceil((new Date(tripDays[0].date).getTime() - Date.now()) / 86400000);
    return (
      <div className="mx-4 mb-4 rounded-2xl p-4 text-center"
        style={{ background: 'linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.38 0.08 155))' }}>
        <div className="text-4xl font-bold mb-1" style={{ color: 'oklch(0.72 0.14 68)', fontFamily: "'Playfair Display', serif" }}>
          {daysUntil}
        </div>
        <div className="text-sm" style={{ color: 'oklch(0.85 0.03 85)' }}>days until departure</div>
        <div className="text-xs mt-1 opacity-70" style={{ color: 'oklch(0.85 0.03 85)' }}>Trip starts {tripDays[0].label}</div>
      </div>
    );
  }
  if (dayIndex >= tripDays.length) {
    return (
      <div className="mx-4 mb-4 rounded-2xl p-4 text-center"
        style={{ background: 'linear-gradient(135deg, oklch(0.28 0.07 155), oklch(0.38 0.08 155))' }}>
        <Star className="mx-auto mb-2" size={28} style={{ color: 'oklch(0.72 0.14 68)' }} />
        <div className="font-bold text-lg" style={{ color: 'oklch(0.85 0.03 85)', fontFamily: "'Playfair Display', serif" }}>
          What a trip!
        </div>
        <div className="text-xs mt-1 opacity-70" style={{ color: 'oklch(0.85 0.03 85)' }}>Safe travels home</div>
      </div>
    );
  }
  return null;
}

export default function TodayPage() {
  const tripDays = useItinerary();
  const [now, setNow] = useState(new Date());
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const dayIndex = getCurrentDayIndex();
  const currentDay: TripDay | null = dayIndex >= 0 && dayIndex < tripDays.length ? tripDays[dayIndex] : null;
  const nextEvent = currentDay ? getNextEvent(dayIndex) : null;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Determine which day to show — today or Day 1 if before trip
  const displayDay = currentDay ?? tripDays[0];
  
  // During Cawdor segment (Days 3-6)
  const isJointCelebration = dayIndex >= 2 && dayIndex <= 5;

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={displayDay.image}
          alt={displayDay.location}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, oklch(0.28 0.07 155 / 0.3) 0%, oklch(0.28 0.07 155 / 0.85) 100%)' }} />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'oklch(0.72 0.14 68)', color: 'oklch(0.15 0.04 155)', fontFamily: "'Source Sans 3', sans-serif" }}>
              {currentDay ? `Day ${currentDay.dayNum} of 8` : 'Coming Up'}
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight" style={{ color: 'oklch(0.97 0.02 85)', fontFamily: "'Playfair Display', serif" }}>
            {isJointCelebration ? "Clive & Pete's 70th" : "Celebrate 70"}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={13} style={{ color: 'oklch(0.72 0.14 68)' }} />
            <span className="text-sm" style={{ color: 'oklch(0.90 0.02 85)' }}>{displayDay.location}</span>
          </div>
        </div>
        {/* Clock */}
        <div className="absolute top-4 right-4 text-right">
          <div className="text-lg font-bold" style={{ color: 'oklch(0.97 0.02 85)', fontFamily: "'Playfair Display', serif" }}>
            {formatTime(now)}
          </div>
          <div className="text-xs" style={{ color: 'oklch(0.80 0.03 85)' }}>
            {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <TripStatusBanner dayIndex={dayIndex} tripDays={tripDays} />

        {/* Next Event Banner */}
        {nextEvent && (
          <div className="mb-4 rounded-2xl p-4"
            style={{ background: 'linear-gradient(135deg, oklch(0.72 0.14 68 / 0.15), oklch(0.72 0.14 68 / 0.05))', border: '1px solid oklch(0.72 0.14 68 / 0.3)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} style={{ color: 'oklch(0.72 0.14 68)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.72 0.14 68)' }}>Next Up</span>
            </div>
            <div className="font-bold text-base" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
              {nextEvent.title}
            </div>
            {nextEvent.time && (
              <div className="text-sm mt-0.5" style={{ color: 'oklch(0.45 0.04 155)' }}>{nextEvent.time}</div>
            )}
          </div>
        )}

        <WeatherStrip lat={displayDay.lat} lng={displayDay.lng} locationLabel={displayDay.location.split('→').pop()?.trim()} />

        {/* Day Headline */}
        <div className="mb-3">
          <h2 className="text-xl font-bold" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
            {displayDay.label}
          </h2>
          <p className="text-sm" style={{ color: 'oklch(0.50 0.04 155)' }}>{displayDay.headline}</p>
        </div>

        {/* Events Timeline */}
        <div className="timeline-spine pl-10 space-y-3">
          {displayDay.events.map((event, idx) => (
            <EventCard
              key={event.id}
              event={event}
              isFirst={idx === 0}
              isLast={idx === displayDay.events.length - 1}
              isExpanded={expandedEvent === event.id}
              onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
            />
          ))}
        </div>

        <TripDocuments />
      </div>
    </div>
  );
}

const TRIP_DOCUMENTS: { label: string; sub: string; href: string }[] = [
  {
    label: 'NorthLink — Stromness → Scrabster',
    sub: 'Ferry booking confirmation',
    href: '/docs/northlink-stromness-scrabster.pdf',
  },
  {
    label: 'Pentland — Gills Bay crossing',
    sub: 'Ferry booking confirmation',
    href: '/docs/pentland-ferries-gills-bay.pdf',
  },
  {
    label: 'NorthLink — Vehicle driver notice',
    sub: 'Pre-boarding instructions',
    href: '/docs/northlink-vehicle-notice.pdf',
  },
];

function TripDocuments() {
  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'oklch(0.55 0.04 155)' }}>
        Documents
      </h3>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.03 80)' }}>
        {TRIP_DOCUMENTS.map((doc, i) => (
          <a
            key={doc.href}
            href={doc.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 hover:bg-gray-50"
            style={{ borderTop: i === 0 ? 'none' : '1px solid oklch(0.94 0.03 80)' }}>
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: 'oklch(0.28 0.07 155 / 0.08)' }}>
              <FileText size={16} style={{ color: 'oklch(0.28 0.07 155)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate"
                style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
                {doc.label}
              </div>
              <div className="text-[11px]" style={{ color: 'oklch(0.55 0.04 155)' }}>{doc.sub}</div>
            </div>
            <ChevronRight size={14} style={{ color: 'oklch(0.55 0.04 155)' }} />
          </a>
        ))}
      </div>
    </div>
  );
}
