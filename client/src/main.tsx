import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// autoUpdate strategy — the SW fetches the new bundle in the background
// and the next navigation picks it up. onNeedRefresh fires when a new
// version is ready; we just reload quietly on the next idle frame.
registerSW({
  immediate: true,
  onNeedRefresh() {
    // eslint-disable-next-line no-console
    console.info("[PWA] new version available — reloading on next idle");
  },
  onOfflineReady() {
    // eslint-disable-next-line no-console
    console.info("[PWA] cached for offline use");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
