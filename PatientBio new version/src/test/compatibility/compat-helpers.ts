/**
 * Phase 16: Compatibility Testing Helpers
 * Shared simulation utilities for browser API, viewport, data format,
 * dependency contract, and PWA compatibility tests.
 */

// ── Browser Environment Simulation ──

export interface BrowserCapabilities {
  share?: boolean;
  clipboard?: boolean;
  serviceWorker?: boolean;
  indexedDB?: boolean;
  intlRelativeTimeFormat?: boolean;
  intlNumberFormat?: boolean;
  cryptoRandomUUID?: boolean;
  matchMedia?: boolean;
  resizeObserver?: boolean;
  intersectionObserver?: boolean;
  onLine?: boolean;
  requestIdleCallback?: boolean;
  notificationPermission?: NotificationPermission | "unsupported";
  beforeInstallPrompt?: boolean;
}

const BROWSER_PROFILES: Record<string, BrowserCapabilities> = {
  "chrome-latest": {
    share: true, clipboard: true, serviceWorker: true, indexedDB: true,
    intlRelativeTimeFormat: true, intlNumberFormat: true, cryptoRandomUUID: true,
    matchMedia: true, resizeObserver: true, intersectionObserver: true,
    onLine: true, requestIdleCallback: true, notificationPermission: "default",
    beforeInstallPrompt: true,
  },
  "safari-legacy": {
    share: false, clipboard: false, serviceWorker: true, indexedDB: true,
    intlRelativeTimeFormat: false, intlNumberFormat: true, cryptoRandomUUID: false,
    matchMedia: true, resizeObserver: false, intersectionObserver: true,
    onLine: true, requestIdleCallback: false, notificationPermission: "unsupported",
    beforeInstallPrompt: false,
  },
  "firefox-latest": {
    share: false, clipboard: true, serviceWorker: true, indexedDB: true,
    intlRelativeTimeFormat: true, intlNumberFormat: true, cryptoRandomUUID: true,
    matchMedia: true, resizeObserver: true, intersectionObserver: true,
    onLine: true, requestIdleCallback: true, notificationPermission: "default",
    beforeInstallPrompt: false,
  },
  "samsung-internet": {
    share: true, clipboard: false, serviceWorker: true, indexedDB: true,
    intlRelativeTimeFormat: false, intlNumberFormat: true, cryptoRandomUUID: false,
    matchMedia: true, resizeObserver: true, intersectionObserver: true,
    onLine: true, requestIdleCallback: false, notificationPermission: "default",
    beforeInstallPrompt: true,
  },
  "minimal-browser": {
    share: false, clipboard: false, serviceWorker: false, indexedDB: false,
    intlRelativeTimeFormat: false, intlNumberFormat: false, cryptoRandomUUID: false,
    matchMedia: false, resizeObserver: false, intersectionObserver: false,
    onLine: true, requestIdleCallback: false, notificationPermission: "unsupported",
    beforeInstallPrompt: false,
  },
};

export function simulateBrowserEnvironment(browser: string): BrowserCapabilities {
  return BROWSER_PROFILES[browser] ?? BROWSER_PROFILES["chrome-latest"];
}

export interface FallbackResult {
  api: string;
  available: boolean;
  fallbackUsed: string | null;
  producesError: boolean;
}

export function determineFallback(api: string, available: boolean): FallbackResult {
  const fallbacks: Record<string, string> = {
    share: "copy-to-clipboard",
    clipboard: "textarea-execCommand",
    serviceWorker: "no-pwa",
    indexedDB: "localStorage",
    intlRelativeTimeFormat: "raw-date-string",
    intlNumberFormat: "toLocaleString",
    cryptoRandomUUID: "manual-uuid-generation",
    matchMedia: "desktop-default",
    resizeObserver: "fallback-dimension-detection",
    intersectionObserver: "eager-loading",
    requestIdleCallback: "setTimeout",
    notificationPermission: "in-app-notification",
    beforeInstallPrompt: "hide-install-banner",
  };
  return {
    api,
    available,
    fallbackUsed: available ? null : (fallbacks[api] ?? "unknown-fallback"),
    producesError: false, // clean degradation contract
  };
}

// ── Viewport Simulation ──

export type BreakpointTier = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface ViewportContract {
  tier: BreakpointTier;
  sidebarVisible: boolean;
  bottomNavVisible: boolean;
  minTouchTarget: number;
  contentMaxWidth: number | null;
  formInputWidth: "full" | "half";
}

export function getBreakpointTier(width: number): BreakpointTier {
  if (width < 640) return "xs";
  if (width < 768) return "sm";
  if (width < 1024) return "md";
  if (width < 1280) return "lg";
  if (width < 1536) return "xl";
  return "2xl";
}

export function simulateViewport(width: number): ViewportContract {
  const tier = getBreakpointTier(width);
  const isMobile = width < 768;
  const isDesktop = width >= 1024;
  return {
    tier,
    sidebarVisible: !isMobile,
    bottomNavVisible: isMobile,
    minTouchTarget: 44,
    contentMaxWidth: width >= 1920 ? 1440 : null,
    formInputWidth: isDesktop ? "half" : "full",
  };
}

// ── Data Format Helpers ──

export interface DataMigrationResult {
  success: boolean;
  missingFields: string[];
  extraFields: string[];
  defaultsApplied: string[];
}

export function simulateDataMigration(
  data: Record<string, unknown>,
  requiredFields: string[],
  optionalWithDefaults: Record<string, unknown>
): DataMigrationResult {
  const missingFields: string[] = [];
  const extraFields: string[] = [];
  const defaultsApplied: string[] = [];
  const knownFields = new Set([...requiredFields, ...Object.keys(optionalWithDefaults)]);

  for (const field of requiredFields) {
    if (!(field in data) || data[field] === undefined) {
      missingFields.push(field);
    }
  }
  for (const [field, defaultVal] of Object.entries(optionalWithDefaults)) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      defaultsApplied.push(field);
      data[field] = defaultVal;
    }
  }
  for (const key of Object.keys(data)) {
    if (!knownFields.has(key)) extraFields.push(key);
  }
  return {
    success: missingFields.length === 0,
    missingFields,
    extraFields,
    defaultsApplied,
  };
}

export function parseISODate(dateStr: string): Date | null {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

export function distinguishTimestamp(value: number): "seconds" | "milliseconds" {
  // Timestamps after year 2001 in seconds are < 10^10; in ms they are >= 10^12
  return value > 1e11 ? "milliseconds" : "seconds";
}

export function normalizeToMs(value: number): number {
  return distinguishTimestamp(value) === "seconds" ? value * 1000 : value;
}

export function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return Boolean(value);
}

export function normalizeEmptyCollection(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [];
}

export function truncateForDisplay(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

// ── Dependency Contract Helpers ──

export interface ContractViolation {
  library: string;
  rule: string;
  passed: boolean;
  detail?: string;
}

export function validateAPIContract(
  library: string,
  rule: string,
  check: () => boolean
): ContractViolation {
  try {
    const passed = check();
    return { library, rule, passed };
  } catch (e) {
    return { library, rule, passed: false, detail: String(e) };
  }
}

// ── PWA Helpers ──

export interface PWAManifest {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  icons?: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
  theme_color?: string;
  background_color?: string;
}

export interface PWAValidationResult {
  hasName: boolean;
  hasIcons: boolean;
  hasStartUrl: boolean;
  hasDisplay: boolean;
  hasAnyPurposeIcon: boolean;
  hasMaskableIcon: boolean;
  has192Icon: boolean;
  has512Icon: boolean;
  isInstallable: boolean;
}

export function validatePWAManifest(manifest: PWAManifest): PWAValidationResult {
  const icons = manifest.icons ?? [];
  const hasAnyPurposeIcon = icons.some(i => i.purpose?.includes("any"));
  const hasMaskableIcon = icons.some(i => i.purpose?.includes("maskable"));
  const has192Icon = icons.some(i => i.sizes === "192x192");
  const has512Icon = icons.some(i => i.sizes === "512x512");
  const hasName = !!(manifest.name || manifest.short_name);
  const hasIcons = icons.length > 0;
  const hasStartUrl = !!manifest.start_url;
  const hasDisplay = !!manifest.display;

  return {
    hasName, hasIcons, hasStartUrl, hasDisplay,
    hasAnyPurposeIcon, hasMaskableIcon, has192Icon, has512Icon,
    isInstallable: hasName && hasIcons && hasStartUrl && hasDisplay && has192Icon && has512Icon,
  };
}

export interface CacheStrategyConfig {
  urlPattern: string;
  handler: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

export function validateCacheStrategy(
  strategies: CacheStrategyConfig[],
  urlPattern: string,
  expectedHandler: string
): boolean {
  const match = strategies.find(s => urlPattern.includes(s.urlPattern) || s.urlPattern.includes(urlPattern));
  return match?.handler === expectedHandler;
}

// ── Portal Definitions ──

export const PORTALS = [
  "patient", "doctor", "hospital-admin", "pathologist",
  "researcher", "pharma", "admin"
] as const;

export type PortalName = typeof PORTALS[number];
