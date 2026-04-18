// CELEBRATE 70 — Journey Page: Full 8-day timeline
import { useEffect, useState } from "react";
import { MapPin, ChevronRight, ChevronDown } from "lucide-react";
import { useItinerary, getCurrentDayIndex, updateItineraryEvent, addItineraryEvent, deleteItineraryEvent, type TripDay } from "@/lib/itinerary";
import EventCard from "@/components/EventCard";

function DayHeader({ day, isToday, isPast, isOpen, onToggle }: {
  day: TripDay; isToday: boolean; isPast: boolean; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 p-4 text-left transition-all"
      style={{ background: isToday ? 'oklch(0.28 0.07 155)' : isPast ? 'oklch(0.94 0.03 80)' : 'oklch(1 0 0)' }}
      onClick={onToggle}>
      {/* Day number bubble */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 flex flex-col items-center justify-center"
        style={{ background: isToday ? 'oklch(0.72 0.14 68)' : isPast ? 'oklch(0.88 0.03 80)' : 'oklch(0.94 0.03 80)' }}>
        <span className="text-xs font-bold leading-none" style={{ color: isToday ? 'oklch(0.15 0.04 155)' : 'oklch(0.45 0.04 155)' }}>
          Day
        </span>
        <span className="text-base font-bold leading-none" style={{ color: isToday ? 'oklch(0.15 0.04 155)' : 'oklch(0.28 0.07 155)', fontFamily: "'Playfair Display', serif" }}>
          {day.dayNum}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: isToday ? 'oklch(0.72 0.14 68)' : 'oklch(0.55 0.04 155)' }}>
            {day.label}
          </span>
          {isToday && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'oklch(0.72 0.14 68)', color: 'oklch(0.15 0.04 155)' }}>
              TODAY
            </span>
          )}
          {isPast && !isToday && (
            <span className="text-[10px] font-semibold" style={{ color: 'oklch(0.65 0.04 155)' }}>✓</span>
          )}
        </div>
        <div className="font-bold text-sm leading-snug"
          style={{ color: isToday ? 'oklch(0.97 0.02 85)' : 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
          {day.headline}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin size={11} style={{ color: isToday ? 'oklch(0.80 0.05 85)' : 'oklch(0.65 0.04 155)' }} />
          <span className="text-xs truncate" style={{ color: isToday ? 'oklch(0.80 0.05 85)' : 'oklch(0.55 0.04 155)' }}>
            {day.location}
          </span>
        </div>
      </div>

      <div className="flex-shrink-0">
        {isOpen
          ? <ChevronDown size={18} style={{ color: isToday ? 'oklch(0.72 0.14 68)' : 'oklch(0.55 0.04 155)' }} />
          : <ChevronRight size={18} style={{ color: isToday ? 'oklch(0.72 0.14 68)' : 'oklch(0.55 0.04 155)' }} />}
      </div>
    </button>
  );
}

export default function JourneyPage() {
  const tripDays = useItinerary();
  const dayIndex = getCurrentDayIndex();
  const [openDays, setOpenDays] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (dayIndex >= 0 && dayIndex < tripDays.length) s.add(tripDays[dayIndex].id);
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#event-')) {
      const eventId = hash.slice('#event-'.length);
      const day = tripDays.find(d => d.events.some(e => e.id === eventId));
      if (day) s.add(day.id);
    }
    return s;
  });
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [highlightedEvent, setHighlightedEvent] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#event-')) return;
    const eventId = hash.slice('#event-'.length);
    const raf = window.requestAnimationFrame(() => {
      const el = document.getElementById(`event-${eventId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedEvent(eventId);
        window.setTimeout(() => setHighlightedEvent(null), 1800);
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  function toggleDay(id: string) {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleAddEvent(dayId: string) {
    const newId = `ev-${Date.now()}`;
    addItineraryEvent(dayId, {
      id: newId,
      type: 'stay',
      time: '12:00',
      title: 'New Event',
      subtitle: '',
    });
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 pt-6 pb-4" style={{ background: 'oklch(0.28 0.07 155)' }}>
        <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.97 0.02 85)', fontFamily: "'Playfair Display', serif" }}>
          Your Journey
        </h1>
        <p className="text-sm mt-1 mb-2" style={{ color: 'oklch(0.72 0.14 68)' }}>
          17–24 April 2026 · Scotland & Orkney
        </p>

        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
          style={{ 
            background: isEditMode ? 'oklch(0.72 0.14 68)' : 'oklch(0.38 0.08 155)', 
            color: isEditMode ? 'oklch(0.15 0.04 155)' : 'oklch(0.85 0.12 75)' 
          }}>
          {isEditMode ? 'Done Editing' : 'Edit Itinerary'}
        </button>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.38 0.08 155)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(0, Math.min(100, (dayIndex / tripDays.length) * 100))}%`,
              background: 'linear-gradient(to right, oklch(0.72 0.14 68), oklch(0.85 0.12 75))'
            }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px]" style={{ color: 'oklch(0.65 0.05 155)' }}>Sanday</span>
          <span className="text-[10px]" style={{ color: 'oklch(0.65 0.05 155)' }}>Home</span>
        </div>
      </div>

      {/* Days */}
      <div className="divide-y" style={{ borderColor: 'oklch(0.88 0.03 80)' }}>
        {tripDays.map((day, idx) => {
          const isToday = idx === dayIndex;
          const isPast = idx < dayIndex;
          const isOpen = openDays.has(day.id);

          return (
            <div key={day.id}>
              <DayHeader
                day={day}
                isToday={isToday}
                isPast={isPast}
                isOpen={isOpen}
                onToggle={() => toggleDay(day.id)}
              />
              {isOpen && (
                <div className="px-4 py-3 timeline-spine pl-14"
                  style={{ background: isToday ? 'oklch(0.28 0.07 155 / 0.04)' : 'oklch(0.97 0.02 85 / 0.5)' }}>
                  <div className="space-y-3">
                    {day.events.map((event, eIdx) => (
                      <div
                        key={event.id}
                        id={`event-${event.id}`}
                        className="scroll-mt-4 rounded-xl transition-shadow"
                        style={highlightedEvent === event.id
                          ? { boxShadow: '0 0 0 3px oklch(0.72 0.14 68 / 0.6)' }
                          : undefined}
                      >
                        {isEditMode ? (
                          <div className="bg-white p-3 rounded border shadow-sm flex flex-col gap-2">
                            <input 
                              type="text" 
                              value={event.title} 
                              onChange={(e) => updateItineraryEvent(day.id, event.id, { title: e.target.value })}
                              className="text-sm font-bold border rounded px-2 py-1 bg-gray-50"
                              placeholder="Event Title"
                            />
                            <input 
                              type="text" 
                              value={event.subtitle || ''} 
                              onChange={(e) => updateItineraryEvent(day.id, event.id, { subtitle: e.target.value })}
                              className="text-xs border rounded px-2 py-1 bg-gray-50"
                              placeholder="Subtitle"
                            />
                            <div className="flex gap-2 items-center">
                              <input 
                                type="text" 
                                value={event.time || ''} 
                                onChange={(e) => updateItineraryEvent(day.id, event.id, { time: e.target.value })}
                                className="text-xs border rounded px-2 py-1 bg-gray-50 flex-1"
                                placeholder="Time (e.g. 10:30)"
                              />
                              <button 
                                onClick={() => deleteItineraryEvent(day.id, event.id)}
                                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <EventCard
                            event={event}
                            isFirst={eIdx === 0}
                            isLast={eIdx === day.events.length - 1}
                            isExpanded={expandedEvent === event.id}
                            onToggle={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                          />
                        )}
                      </div>
                    ))}
                    {isEditMode && (
                      <button 
                        onClick={() => handleAddEvent(day.id)}
                        className="w-full text-xs font-semibold py-2 rounded border border-dashed text-center mt-2 hover:bg-gray-50"
                        style={{ color: 'oklch(0.28 0.07 155)', borderColor: 'oklch(0.38 0.08 155)' }}>
                        + Add Meal / Attraction
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <p className="text-xs" style={{ color: 'oklch(0.65 0.04 155)' }}>
          Clive & Jane Struver · Vehicle SW16YOP
        </p>
      </div>
    </div>
  );
}
