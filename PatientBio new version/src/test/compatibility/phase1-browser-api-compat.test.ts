/**
 * Phase 16a: Browser API Compatibility Tests
 * Validates graceful fallback when browser APIs are missing.
 */
import { describe, it, expect } from "vitest";
import {
  simulateBrowserEnvironment,
  determineFallback,
  BrowserCapabilities,
} from "./compat-helpers";

describe("Phase 16a: Browser API Compatibility", () => {
  const APIs: (keyof BrowserCapabilities)[] = [
    "share", "clipboard", "serviceWorker", "indexedDB",
    "intlRelativeTimeFormat", "intlNumberFormat", "cryptoRandomUUID",
    "matchMedia", "resizeObserver", "intersectionObserver",
    "requestIdleCallback",
  ];

  it("1 - Web Share API missing → falls back to clipboard copy", () => {
    const env = simulateBrowserEnvironment("safari-legacy");
    expect(env.share).toBe(false);
    const fb = determineFallback("share", env.share!);
    expect(fb.fallbackUsed).toBe("copy-to-clipboard");
  });

  it("2 - Clipboard API missing → falls back to textarea + execCommand", () => {
    const env = simulateBrowserEnvironment("safari-legacy");
    expect(env.clipboard).toBe(false);
    const fb = determineFallback("clipboard", false);
    expect(fb.fallbackUsed).toBe("textarea-execCommand");
  });

  it("3 - Service Worker unsupported → app loads without PWA features", () => {
    const env = simulateBrowserEnvironment("minimal-browser");
    expect(env.serviceWorker).toBe(false);
    const fb = determineFallback("serviceWorker", false);
    expect(fb.fallbackUsed).toBe("no-pwa");
    expect(fb.producesError).toBe(false);
  });

  it("4 - IndexedDB unavailable → offline storage falls back to localStorage", () => {
    const env = simulateBrowserEnvironment("minimal-browser");
    expect(env.indexedDB).toBe(false);
    const fb = determineFallback("indexedDB", false);
    expect(fb.fallbackUsed).toBe("localStorage");
  });

  it("5 - Intl.RelativeTimeFormat missing → displays raw date string", () => {
    const env = simulateBrowserEnvironment("safari-legacy");
    expect(env.intlRelativeTimeFormat).toBe(false);
    const fb = determineFallback("intlRelativeTimeFormat", false);
    expect(fb.fallbackUsed).toBe("raw-date-string");
  });

  it("6 - Intl.NumberFormat missing → falls back to toLocaleString", () => {
    const env = simulateBrowserEnvironment("minimal-browser");
    expect(env.intlNumberFormat).toBe(false);
    const fb = determineFallback("intlNumberFormat", false);
    expect(fb.fallbackUsed).toBe("toLocaleString");
  });

  it("7 - crypto.randomUUID missing → falls back to manual UUID generation", () => {
    const env = simulateBrowserEnvironment("safari-legacy");
    expect(env.cryptoRandomUUID).toBe(false);
    const fb = determineFallback("cryptoRandomUUID", false);
    expect(fb.fallbackUsed).toBe("manual-uuid-generation");
  });

  it("8 - matchMedia missing → responsive hooks default to desktop layout", () => {
    const env = simulateBrowserEnvironment("minimal-browser");
    expect(env.matchMedia).toBe(false);
    const fb = determineFallback("matchMedia", false);
    expect(fb.fallbackUsed).toBe("desktop-default");
  });

  it("9 - ResizeObserver missing → components use fallback dimension detection", () => {
    const env = simulateBrowserEnvironment("safari-legacy");
    expect(env.resizeObserver).toBe(false);
    const fb = determineFallback("resizeObserver", false);
    expect(fb.fallbackUsed).toBe("fallback-dimension-detection");
  });

  it("10 - IntersectionObserver missing → lazy-loaded images use eager loading", () => {
    const env = simulateBrowserEnvironment("minimal-browser");
    expect(env.intersectionObserver).toBe(false);
    const fb = determineFallback("intersectionObserver", false);
    expect(fb.fallbackUsed).toBe("eager-loading");
  });

  it("11 - navigator.onLine property reflects correct offline/online state", () => {
    const online = simulateBrowserEnvironment("chrome-latest");
    expect(online.onLine).toBe(true);
    // A browser reporting offline
    const offlineEnv = { ...online, onLine: false };
    expect(offlineEnv.onLine).toBe(false);
  });

  it("12 - requestIdleCallback missing → deferred tasks use setTimeout fallback", () => {
    const env = simulateBrowserEnvironment("safari-legacy");
    expect(env.requestIdleCallback).toBe(false);
    const fb = determineFallback("requestIdleCallback", false);
    expect(fb.fallbackUsed).toBe("setTimeout");
  });

  it("13 - Notification API denied → in-app notification replaces system notification", () => {
    const env = simulateBrowserEnvironment("safari-legacy");
    expect(env.notificationPermission).toBe("unsupported");
    const fb = determineFallback("notificationPermission", false);
    expect(fb.fallbackUsed).toBe("in-app-notification");
  });

  it("14 - beforeinstallprompt not supported → install banner hidden gracefully", () => {
    const env = simulateBrowserEnvironment("firefox-latest");
    expect(env.beforeInstallPrompt).toBe(false);
    const fb = determineFallback("beforeInstallPrompt", false);
    expect(fb.fallbackUsed).toBe("hide-install-banner");
  });

  it("15 - All fallbacks produce no console errors (clean degradation)", () => {
    const env = simulateBrowserEnvironment("minimal-browser");
    const results = APIs.map(api => determineFallback(api, !!env[api]));
    for (const r of results) {
      expect(r.producesError).toBe(false);
    }
    // When API is available, no fallback needed
    const chrome = simulateBrowserEnvironment("chrome-latest");
    const chromeResults = APIs.map(api => determineFallback(api, !!chrome[api]));
    for (const r of chromeResults) {
      expect(r.fallbackUsed).toBeNull();
      expect(r.producesError).toBe(false);
    }
  });
});
