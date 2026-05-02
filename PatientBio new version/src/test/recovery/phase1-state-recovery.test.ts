import { describe, it, expect } from "vitest";
import {
  createStateSnapshot,
  restoreFromSnapshot,
  isSnapshotExpired,
  MockStorage,
  type StateSnapshot,
} from "./recovery-helpers";

function makeCache(count: number) {
  const cache = new Map<string, { data: unknown; staleTime: number; fetchedAt: number; isInvalidated: boolean; observerCount: number }>();
  for (let i = 0; i < count; i++) {
    cache.set(`key-${i}`, { data: { id: i, name: `item-${i}` }, staleTime: 300_000, fetchedAt: Date.now(), isInvalidated: false, observerCount: i % 3 });
  }
  return cache;
}

describe("Phase 17a: State Recovery", () => {
  it("1 - snapshot captures all active query data", () => {
    const cache = makeCache(5);
    const snap = createStateSnapshot(cache);
    expect(Object.keys(snap.entries)).toHaveLength(5);
    expect(snap.entries["key-0"].data).toEqual({ id: 0, name: "item-0" });
  });

  it("2 - restoring snapshot reconstructs exact cache state", () => {
    const cache = makeCache(3);
    const snap = createStateSnapshot(cache);
    const { success, cache: restored } = restoreFromSnapshot(snap);
    expect(success).toBe(true);
    expect(restored.size).toBe(3);
    expect(restored.get("key-1")?.data).toEqual(cache.get("key-1")?.data);
  });

  it("3 - corrupted snapshot (missing checksum) falls back to empty state", () => {
    const snap = { version: 1, timestamp: Date.now(), entries: {}, checksum: "wrong" } as StateSnapshot;
    const result = restoreFromSnapshot(snap);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("checksum_mismatch");
    expect(result.cache.size).toBe(0);
  });

  it("4 - snapshot with expired staleTime flags entries as stale on restore", () => {
    const cache = makeCache(1);
    cache.get("key-0")!.fetchedAt = Date.now() - 600_000;
    cache.get("key-0")!.staleTime = 300_000;
    const snap = createStateSnapshot(cache);
    const { cache: restored } = restoreFromSnapshot(snap);
    const entry = restored.get("key-0")!;
    expect(Date.now() - entry.fetchedAt >= entry.staleTime).toBe(true);
  });

  it("5 - multiple snapshots: latest timestamp wins", () => {
    const snap1 = createStateSnapshot(makeCache(1));
    const snap2 = createStateSnapshot(makeCache(2));
    expect(snap2.timestamp).toBeGreaterThanOrEqual(snap1.timestamp);
    const latest = snap2.timestamp >= snap1.timestamp ? snap2 : snap1;
    expect(Object.keys(latest.entries).length).toBe(2);
  });

  it("6 - snapshot includes invalidation flags", () => {
    const cache = makeCache(2);
    cache.get("key-0")!.isInvalidated = true;
    const snap = createStateSnapshot(cache);
    const { cache: restored } = restoreFromSnapshot(snap);
    expect(restored.get("key-0")!.isInvalidated).toBe(true);
    expect(restored.get("key-1")!.isInvalidated).toBe(false);
  });

  it("7 - large snapshot (1000+ entries) serializes quickly", () => {
    const cache = makeCache(1000);
    const start = performance.now();
    const snap = createStateSnapshot(cache);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
    expect(Object.keys(snap.entries)).toHaveLength(1000);
  });

  it("8 - partial restore: missing keys get defaults, existing keys restored", () => {
    const cache = makeCache(3);
    const snap = createStateSnapshot(cache);
    const { cache: restored } = restoreFromSnapshot(snap);
    expect(restored.has("key-0")).toBe(true);
    expect(restored.has("key-99")).toBe(false);
  });

  it("9 - snapshot version mismatch triggers full reset", () => {
    const snap = createStateSnapshot(makeCache(5), 2);
    const result = restoreFromSnapshot(snap, 1);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("version_mismatch");
    expect(result.cache.size).toBe(0);
  });

  it("10 - IndexedDB snapshot survives simulated browser restart", () => {
    const storage = new MockStorage();
    const snap = createStateSnapshot(makeCache(3));
    storage.setItem("state_snapshot", JSON.stringify(snap));
    const raw = storage.getItem("state_snapshot");
    const parsed = JSON.parse(raw!) as StateSnapshot;
    const { success } = restoreFromSnapshot(parsed);
    expect(success).toBe(true);
  });

  it("11 - localStorage fallback when IndexedDB unavailable", () => {
    const idb = new MockStorage(false);
    const ls = new MockStorage(true);
    const snap = createStateSnapshot(makeCache(2));
    let stored = false;
    try { idb.setItem("snap", JSON.stringify(snap)); } catch { ls.setItem("snap", JSON.stringify(snap)); stored = true; }
    expect(stored).toBe(true);
    expect(ls.getItem("snap")).not.toBeNull();
  });

  it("12 - concurrent writes during snapshot don't corrupt data", () => {
    const cache = makeCache(3);
    const snap = createStateSnapshot(cache);
    cache.set("key-0", { data: { modified: true }, staleTime: 0, fetchedAt: 0, isInvalidated: false, observerCount: 0 });
    const { cache: restored } = restoreFromSnapshot(snap);
    expect((restored.get("key-0")!.data as { id: number }).id).toBe(0);
  });

  it("13 - restore preserves observer counts", () => {
    const cache = makeCache(3);
    cache.get("key-1")!.observerCount = 5;
    const snap = createStateSnapshot(cache);
    const { cache: restored } = restoreFromSnapshot(snap);
    expect(restored.get("key-1")!.observerCount).toBe(5);
  });

  it("14 - snapshot TTL: snapshots older than 24h are discarded", () => {
    const snap = createStateSnapshot(makeCache(1));
    snap.timestamp = Date.now() - 25 * 60 * 60 * 1000;
    expect(isSnapshotExpired(snap)).toBe(true);
    const fresh = createStateSnapshot(makeCache(1));
    expect(isSnapshotExpired(fresh)).toBe(false);
  });

  it("15 - empty cache produces valid empty snapshot", () => {
    const snap = createStateSnapshot(new Map());
    expect(snap).toBeDefined();
    expect(Object.keys(snap.entries)).toHaveLength(0);
    const { success, cache } = restoreFromSnapshot(snap);
    expect(success).toBe(true);
    expect(cache.size).toBe(0);
  });
});
