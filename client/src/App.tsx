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

export default function App() {
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
