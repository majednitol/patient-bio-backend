import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const applySystemTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle("dark", isDark);
};

applySystemTheme(darkModeQuery.matches);
darkModeQuery.addEventListener("change", (event) => applySystemTheme(event.matches));

// Defer i18n initialization — not needed for first paint
const initI18n = () => import("./lib/i18n");
if ("requestIdleCallback" in window) {
  requestIdleCallback(initI18n, { timeout: 1000 });
} else {
  setTimeout(initI18n, 50);
}

createRoot(document.getElementById("root")!).render(<App />);
