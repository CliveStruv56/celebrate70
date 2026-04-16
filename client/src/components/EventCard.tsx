// CELEBRATE 70 — EventCard Component
import { Anchor, Home, Car, Coffee, MapPin, ChevronDown, ChevronUp, ExternalLink, Copy } from "lucide-react";
import type { TripEvent, EventType } from "@/lib/itinerary";
import { toast } from "sonner";

function EventIcon({ type }: { type: EventType }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10";
  switch (type) {
    case 'ferry':
      return <div className={base} style={{ background: 'oklch(0.28 0.07 155)', border: '2px solid oklch(0.72 0.14 68)' }}>
        <Anchor size={14} style={{ color: 'oklch(0.72 0.14 68)' }} />
      </div>;
    case 'checkin':
      return <div className={base} style={{ background: 'oklch(0.38 0.08 155)', border: '2px solid oklch(0.85 0.12 75)' }}>
        <Home size={14} style={{ color: 'oklch(0.85 0.12 75)' }} />
      </div>;
    case 'checkout':
      return <div className={base} style={{ background: 'oklch(0.92 0.02 80)', border: '2px solid oklch(0.88 0.03 80)' }}>
        <Home size={14} style={{ color: 'oklch(0.50 0.04 155)' }} />
      </div>;
    case 'drive':
      return <div className={base} style={{ background: 'oklch(0.94 0.03 80)', border: '2px solid oklch(0.88 0.03 80)' }}>
        <Car size={14} style={{ color: 'oklch(0.45 0.04 155)' }} />
      </div>;
    default:
      return <div className={base} style={{ background: 'oklch(0.94 0.03 80)', border: '2px solid oklch(0.88 0.03 80)' }}>
        <Coffee size={14} style={{ color: 'oklch(0.45 0.04 155)' }} />
      </div>;
  }
}

interface EventCardProps {
  event: TripEvent;
  isFirst?: boolean;
  isLast?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export default function EventCard({ event, isExpanded, onToggle }: EventCardProps) {
  const isFerry = event.type === 'ferry';

  function copyRef(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(label + ' copied'));
  }

  return (
    <div className="relative -ml-10 flex gap-3 slide-in">
      <div className="mt-1 flex-shrink-0">
        <EventIcon type={event.type} />
      </div>
      <div className="flex-1 rounded-xl overflow-hidden mb-1"
        style={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.88 0.03 80)', boxShadow: '0 1px 4px oklch(0.28 0.07 155 / 0.08)' }}>
        <button className="w-full text-left p-3 flex items-start justify-between gap-2" onClick={onToggle}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {event.time && (
                <span className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded"
                  style={{ background: isFerry ? 'oklch(0.72 0.14 68 / 0.15)' : 'oklch(0.94 0.03 80)', color: isFerry ? 'oklch(0.45 0.08 68)' : 'oklch(0.50 0.04 155)' }}>
                  {event.time}
                </span>
              )}
              {isFerry && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: 'oklch(0.28 0.07 155 / 0.1)', color: 'oklch(0.28 0.07 155)' }}>
                  Ferry
                </span>
              )}
            </div>
            <div className="font-semibold text-sm mt-0.5 leading-snug" style={{ color: 'oklch(0.20 0.03 155)', fontFamily: "'Playfair Display', serif" }}>
              {event.title}
            </div>
            {event.subtitle && (
              <div className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.04 155)' }}>{event.subtitle}</div>
            )}
          </div>
          {(event.detail || event.bookingRef || event.address) && (
            <div className="flex-shrink-0 mt-1">
              {isExpanded ? <ChevronUp size={16} style={{ color: 'oklch(0.55 0.04 155)' }} /> : <ChevronDown size={16} style={{ color: 'oklch(0.55 0.04 155)' }} />}
            </div>
          )}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2.5 border-t" style={{ borderColor: 'oklch(0.92 0.02 80)' }}>
            {event.detail && (
              <p className="text-xs leading-relaxed pt-2" style={{ color: 'oklch(0.40 0.03 155)' }}>{event.detail}</p>
            )}
            {event.bookingRef && (
              <div className="flex items-center justify-between rounded-lg p-2.5"
                style={{ background: 'oklch(0.28 0.07 155 / 0.06)' }}>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'oklch(0.55 0.04 155)' }}>
                    {event.operator || 'Booking'} Ref
                  </div>
                  <div className="font-bold text-sm tracking-widest" style={{ color: 'oklch(0.20 0.03 155)' }}>
                    {event.bookingRef}
                  </div>
                </div>
                <button onClick={() => copyRef(event.bookingRef!, 'Booking reference')}
                  className="p-1.5 rounded-lg" style={{ background: 'oklch(0.28 0.07 155 / 0.1)' }}>
                  <Copy size={14} style={{ color: 'oklch(0.28 0.07 155)' }} />
                </button>
              </div>
            )}
            {event.vehicle && (
              <div className="flex items-center gap-2">
                <Car size={13} style={{ color: 'oklch(0.55 0.04 155)' }} />
                <span className="text-xs" style={{ color: 'oklch(0.40 0.03 155)' }}>Vehicle: <strong>{event.vehicle}</strong></span>
              </div>
            )}
            {event.address && (
              <div className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'oklch(0.55 0.04 155)' }} />
                <span className="text-xs" style={{ color: 'oklch(0.40 0.03 155)' }}>{event.address}</span>
              </div>
            )}
            {event.what3words && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: '#e11d48' }}>w3w</span>
                <span className="text-xs font-medium" style={{ color: 'oklch(0.40 0.03 155)' }}>{event.what3words}</span>
              </div>
            )}
            {(event.checkinTime || event.checkoutTime) && (
              <div className="flex gap-3">
                {event.checkinTime && (
                  <div className="text-xs">
                    <span style={{ color: 'oklch(0.55 0.04 155)' }}>Check-in: </span>
                    <strong style={{ color: 'oklch(0.28 0.07 155)' }}>from {event.checkinTime}</strong>
                  </div>
                )}
                {event.checkoutTime && (
                  <div className="text-xs">
                    <span style={{ color: 'oklch(0.55 0.04 155)' }}>Check-out: </span>
                    <strong style={{ color: 'oklch(0.28 0.07 155)' }}>before {event.checkoutTime}</strong>
                  </div>
                )}
              </div>
            )}
            {event.mapUrl && (
              <a href={event.mapUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'oklch(0.28 0.07 155)' }}>
                <ExternalLink size={12} />
                Open in Maps
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
