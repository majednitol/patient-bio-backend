/**
 * State Management Test Helpers
 * Simulates React Query's core cache mechanics as pure functions.
 */

// --- QueryCache ---

interface CacheEntry<T = unknown> {
  data: T;
  staleTime: number; // ms
  fetchedAt: number; // timestamp
  observerCount: number;
  isInvalidated: boolean;
  enabled: boolean;
}

export class QueryCache {
  private cache = new Map<string, CacheEntry>();

  private serializeKey(key: string | string[]): string {
    return Array.isArray(key) ? JSON.stringify(key) : key;
  }

  set<T>(
    key: string | string[],
    data: T,
    options: { staleTime?: number; observerCount?: number; enabled?: boolean } = {}
  ): void {
    if (options.enabled === false) return;
    const serialized = this.serializeKey(key);
    this.cache.set(serialized, {
      data,
      staleTime: options.staleTime ?? 5 * 60 * 1000,
      fetchedAt: Date.now(),
      observerCount: options.observerCount ?? 0,
      isInvalidated: false,
      enabled: options.enabled ?? true,
    });
  }

  get<T>(key: string | string[]): T | undefined {
    const entry = this.cache.get(this.serializeKey(key));
    return entry ? (entry.data as T) : undefined;
  }

  getRaw(key: string | string[]): CacheEntry | undefined {
    return this.cache.get(this.serializeKey(key));
  }

  isStale(key: string | string[]): boolean {
    const entry = this.cache.get(this.serializeKey(key));
    if (!entry) return true;
    if (entry.isInvalidated) return true;
    return Date.now() - entry.fetchedAt >= entry.staleTime;
  }

  invalidate(key: string | string[]): void {
    const serialized = this.serializeKey(key);
    const entry = this.cache.get(serialized);
    if (entry) {
      entry.isInvalidated = true;
    }
  }

  invalidateMatching(prefix: string | string[]): void {
    const prefixStr = this.serializeKey(prefix);
    for (const [k, entry] of this.cache.entries()) {
      if (k === prefixStr || k.startsWith(prefixStr.slice(0, -1))) {
        entry.isInvalidated = true;
      }
    }
  }

  getAll(): Map<string, CacheEntry> {
    return new Map(this.cache);
  }

  gc(gcTime: number): string[] {
    const removed: string[] = [];
    const now = Date.now();
    for (const [k, entry] of this.cache.entries()) {
      if (entry.observerCount === 0 && now - entry.fetchedAt >= gcTime) {
        this.cache.delete(k);
        removed.push(k);
      }
    }
    return removed;
  }

  setObserverCount(key: string | string[], count: number): void {
    const entry = this.cache.get(this.serializeKey(key));
    if (entry) entry.observerCount = count;
  }

  setFetchedAt(key: string | string[], timestamp: number): void {
    const entry = this.cache.get(this.serializeKey(key));
    if (entry) entry.fetchedAt = timestamp;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  update<T>(key: string | string[], updater: (old: T) => T): void {
    const serialized = this.serializeKey(key);
    const entry = this.cache.get(serialized);
    if (entry) {
      entry.data = updater(entry.data as T);
    }
  }
}

// --- OptimisticMutation ---

export class OptimisticMutation<T> {
  private snapshot: T | undefined;
  private committed = false;
  private cancelled = false;

  constructor(private cache: QueryCache, private key: string | string[]) {}

  takeSnapshot(): T | undefined {
    this.snapshot = structuredClone(this.cache.get<T>(this.key));
    return this.snapshot;
  }

  apply(updater: (old: T) => T, defaultValue?: T): void {
    const current = this.cache.get<T>(this.key) ?? defaultValue;
    if (current !== undefined) {
      this.cache.update<T>(this.key, () => updater(current));
      // If key didn't exist but we have a default, set it
      if (this.cache.get(this.key) === undefined) {
        this.cache.set(this.key, updater(current));
      }
    }
  }

  rollback(): void {
    if (!this.committed && this.snapshot !== undefined) {
      this.cache.set(this.key, structuredClone(this.snapshot));
    }
  }

  commit(): void {
    this.committed = true;
    this.snapshot = undefined;
  }

  cancelQueries(): void {
    this.cancelled = true;
  }

  wasCancelled(): boolean {
    return this.cancelled;
  }
}

// --- StaleTracker ---

export class StaleTracker {
  shouldRefetch(params: {
    staleTime: number;
    lastFetchedAt: number;
    now?: number;
    observerCount?: number;
    trigger?: "mount" | "windowFocus" | "access";
  }): boolean {
    const now = params.now ?? Date.now();
    const elapsed = now - params.lastFetchedAt;
    const isStale = elapsed >= params.staleTime;

    if (params.staleTime === Infinity) return false;
    if (params.staleTime === 0) return true;

    if (params.trigger === "mount" || params.trigger === "windowFocus") {
      return isStale;
    }

    return isStale;
  }

  isFresh(staleTime: number, lastFetchedAt: number, now?: number): boolean {
    if (staleTime === Infinity) return true;
    if (staleTime === 0) return false;
    return (now ?? Date.now()) - lastFetchedAt < staleTime;
  }
}

// --- InvalidationGraph ---

export interface InvalidationRule {
  mutation: string;
  invalidates: (string | string[])[];
}

export class InvalidationGraph {
  private rules: InvalidationRule[] = [];

  addRule(rule: InvalidationRule): void {
    this.rules.push(rule);
  }

  getInvalidations(mutation: string): (string | string[])[] {
    const rule = this.rules.find((r) => r.mutation === mutation);
    return rule?.invalidates ?? [];
  }

  applyInvalidation(mutation: string, cache: QueryCache): number {
    const keys = this.getInvalidations(mutation);
    let count = 0;
    for (const key of keys) {
      const serialized = Array.isArray(key) ? JSON.stringify(key) : key;
      // Prefix match: invalidate all keys that start with this prefix
      const allEntries = cache.getAll();
      for (const [k] of allEntries) {
        if (k === serialized || k.startsWith(serialized.slice(0, -1) + ",") || k.startsWith(serialized.slice(0, -1) + "]")) {
          cache.invalidate(JSON.parse(k) as string[]);
          count++;
        }
      }
      // Also try direct invalidation
      cache.invalidate(key);
      count++;
    }
    return count;
  }
}

// --- Notification helpers (model from useNotifications.ts) ---

export interface MockNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export function createMockNotification(overrides: Partial<MockNotification> = {}): MockNotification {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    user_id: overrides.user_id ?? "user-1",
    type: overrides.type ?? "info",
    title: overrides.title ?? "Test Notification",
    message: overrides.message ?? null,
    is_read: overrides.is_read ?? false,
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

// --- Re-export production staleTime constants for test assertions ---
export { STALE_TIMES } from "@/lib/queryConfig";
