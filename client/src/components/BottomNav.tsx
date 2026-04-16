import { useLocation, Link } from "wouter";
import { CalendarDays, Map, Compass, Share2, PartyPopper } from "lucide-react";

const tabs = [
  { path: "/", label: "Today", icon: CalendarDays },
  { path: "/journey", label: "Journey", icon: Map },
  { path: "/celebrate", label: "Celebrate", icon: PartyPopper },
  { path: "/explore", label: "Explore", icon: Compass },
  { path: "/share", label: "Share", icon: Share2 },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bottom-nav z-50"
      style={{ background: 'oklch(0.28 0.07 155)', borderTop: '1px solid oklch(0.38 0.08 155 / 0.6)' }}>
      <div className="flex items-stretch">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location === path || (path === '/' && location === '');
          return (
            <Link key={path} href={path} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all duration-200"
              style={{ color: active ? 'oklch(0.72 0.14 68)' : 'oklch(0.70 0.03 155)' }}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-semibold tracking-wide" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ background: 'oklch(0.72 0.14 68)' }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
