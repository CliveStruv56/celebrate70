import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";
import TodayPage from "./pages/TodayPage";
import JourneyPage from "./pages/JourneyPage";
import CelebratePage from "./pages/CelebratePage";
import ExplorePage from "./pages/ExplorePage";
import SharePage from "./pages/SharePage";
import { primeNearbyCache } from "./hooks/useNearbyPlaces";
import { TRIP_DAYS } from "./lib/itinerary";

function Router() {
  const [location] = useLocation();
  const showNav = ['/', '/journey', '/celebrate', '/explore', '/share'].includes(location);

  return (
    <div className="flex flex-col min-h-screen max-w-[480px] mx-auto bg-background">
      <div className="flex-1 overflow-y-auto pb-20">
        <Switch>
          <Route path="/" component={TodayPage} />
          <Route path="/journey" component={JourneyPage} />
          <Route path="/celebrate" component={CelebratePage} />
          <Route path="/explore" component={ExplorePage} />
          <Route path="/share" component={SharePage} />
          <Route component={TodayPage} />
        </Switch>
      </div>
      {showNav && <BottomNav />}
      <Toaster />
    </div>
  );
}

// Warm the OSM cache for the unique stay coordinates so Explore is
// instant on first visit. Best-effort, fire-and-forget, no await.
function useTripAnchorPrefetch() {
  useEffect(() => {
    const seen = new Set<string>();
    const anchors = TRIP_DAYS.filter(d => {
      const key = `${d.lat.toFixed(3)},${d.lng.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Small delay to keep the first paint prioritised.
    const t = window.setTimeout(() => {
      anchors.forEach(a => { void primeNearbyCache(a.lat, a.lng, 10); });
    }, 2000);
    return () => window.clearTimeout(t);
  }, []);
}

export default function App() {
  useTripAnchorPrefetch();
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
