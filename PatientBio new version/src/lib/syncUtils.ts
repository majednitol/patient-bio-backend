/**
 * Cross-device sync utilities:
 * - BroadcastChannel for same-device tab sync
 * - Toast batching / debouncing
 * - Sync activity event log
 * - Exponential backoff helpers
 */

// ── BroadcastChannel for same-device tab sync ──

const SYNC_CHANNEL_NAME = "patient-bio-sync";

type SyncMessage = {
  type: "cache_updated";
  table: string;
  userId: string;
  timestamp: string;
};

let broadcastChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return broadcastChannel;
}

export function broadcastCacheUpdate(table: string, userId: string) {
  const ch = getChannel();
  if (!ch) return;
  const msg: SyncMessage = { type: "cache_updated", table, userId, timestamp: new Date().toISOString() };
  try { ch.postMessage(msg); } catch { /* ignore */ }
}

export function onTabSyncMessage(handler: (msg: SyncMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const listener = (e: MessageEvent) => {
    if (e.data?.type === "cache_updated") handler(e.data as SyncMessage);
  };
  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}

// ── Toast batching / debouncing ──

let pendingToastTimer: ReturnType<typeof setTimeout> | null = null;
let pendingToastCount = 0;
const TOAST_BATCH_DELAY = 2000; // ms

export function scheduleBatchedSyncToast(
  showToast: (opts: { title: string; description: string }) => void,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  pendingToastCount++;
  if (pendingToastTimer) clearTimeout(pendingToastTimer);
  pendingToastTimer = setTimeout(() => {
    const count = pendingToastCount;
    pendingToastCount = 0;
    pendingToastTimer = null;
    if (count === 1) {
      showToast({
        title: t("pwa.crossDeviceUpdate"),
        description: t("pwa.crossDeviceUpdateDesc"),
      });
    } else {
      showToast({
        title: t("pwa.crossDeviceUpdate"),
        description: t("pwa.crossDeviceBatchDesc", { count }),
      });
    }
  }, TOAST_BATCH_DELAY);
}

// ── Sync activity event log (in-memory, last 50 events) ──

export interface SyncEvent {
  id: string;
  type: "incoming" | "outgoing" | "conflict" | "retry" | "error";
  table: string;
  detail: string;
  timestamp: string;
}

const MAX_EVENTS = 50;
let syncEvents: SyncEvent[] = [];
let syncEventListeners: Set<() => void> = new Set();

export function addSyncEvent(event: Omit<SyncEvent, "id" | "timestamp">) {
  const entry: SyncEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  syncEvents = [entry, ...syncEvents].slice(0, MAX_EVENTS);
  syncEventListeners.forEach((fn) => fn());
}

export function getSyncEvents(): SyncEvent[] {
  return syncEvents;
}

export function subscribeSyncEvents(listener: () => void): () => void {
  syncEventListeners.add(listener);
  return () => { syncEventListeners.delete(listener); };
}

// ── Exponential backoff ──

const MAX_RETRY_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

export function getBackoffDelay(attempt: number): number {
  return Math.min(BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500, 30000);
}

export function shouldRetry(attempts: number): boolean {
  return attempts < MAX_RETRY_ATTEMPTS;
}

export { MAX_RETRY_ATTEMPTS };
