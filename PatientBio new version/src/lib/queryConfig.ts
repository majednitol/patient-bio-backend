/**
 * Centralized React Query staleTime constants.
 *
 * Every hook / component MUST import from here instead of
 * using inline numeric literals so cache lifetimes stay
 * consistent and easy to tune from one place.
 *
 * Categories are ordered from shortest → longest TTL.
 */

export const STALE_TIMES = {
  /** 30 s – high-frequency data: notifications, live queues, staff shifts */
  REALTIME: 30 * 1000,

  /** 1 min – moderate-frequency: next-available slots, recent activity */
  FREQUENT: 60 * 1000,

  /** 2 min – user-facing recommendations, saved cohorts, slot recs */
  SHORT: 2 * 60 * 1000,

  /** 5 min – default for most CRUD queries (profiles, lists, settings) */
  STANDARD: 5 * 60 * 1000,

  /** 10 min – slowly changing data: doctor profiles, diagnosis history */
  LONG: 10 * 60 * 1000,

  /** 15 min – analytics / anomaly detection */
  ANALYTICS: 15 * 60 * 1000,

  /** 30 min – reference data: medication prices, templates */
  REFERENCE: 30 * 60 * 1000,

  /** 1 hr – expensive AI assessments, rarely changing configs */
  EXPENSIVE: 60 * 60 * 1000,
} as const;

/** Default gcTime matching App.tsx QueryClient config */
export const GC_TIME = 10 * 60 * 1000;
