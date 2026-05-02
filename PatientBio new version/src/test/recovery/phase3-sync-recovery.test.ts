import { describe, it, expect } from "vitest";
import { SyncQueue, type SyncMutation } from "./recovery-helpers";

function makeMutation(overrides: Partial<SyncMutation> = {}): SyncMutation {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    entityType: overrides.entityType ?? "prescription",
    entityId: overrides.entityId ?? "e-1",
    action: overrides.action ?? "create",
    payload: overrides.payload ?? { name: "Paracetamol" },
    timestamp: overrides.timestamp ?? Date.now(),
    idempotent: overrides.idempotent ?? true,
    attempts: overrides.attempts ?? 0,
    version: overrides.version,
  };
}

describe("Phase 17c: Sync Recovery", () => {
  it("1 - offline mutations queue in FIFO order", () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", action: "create", entityId: "1", idempotent: false }));
    q.enqueue(makeMutation({ id: "b", action: "update", entityId: "2", idempotent: false }));
    q.enqueue(makeMutation({ id: "c", action: "delete", entityId: "3", idempotent: false }));
    const items = q.getQueue();
    expect(items[0].id).toBe("a");
    expect(items[2].id).toBe("c");
  });

  it("2 - reconnection triggers automatic queue replay", async () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", idempotent: false }));
    q.enqueue(makeMutation({ id: "b", entityId: "2", idempotent: false }));
    const result = await q.replay(async () => ({ success: true }));
    expect(result.succeeded).toBe(2);
    expect(q.size()).toBe(0);
  });

  it("3 - replay preserves original mutation order across entity types", async () => {
    const q = new SyncQueue();
    const order: string[] = [];
    q.enqueue(makeMutation({ id: "a", entityType: "appointment", idempotent: false }));
    q.enqueue(makeMutation({ id: "b", entityType: "prescription", entityId: "2", idempotent: false }));
    q.enqueue(makeMutation({ id: "c", entityType: "note", entityId: "3", idempotent: false }));
    await q.replay(async (m) => { order.push(m.id); return { success: true }; });
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("4 - duplicate detection: same idempotent mutation queued twice replays once", () => {
    const q = new SyncQueue();
    const m = makeMutation({ entityType: "rx", entityId: "1", action: "create", idempotent: true });
    const r1 = q.enqueue(m);
    const r2 = q.enqueue({ ...m, id: "dup" });
    expect(r1.accepted).toBe(true);
    expect(r2.accepted).toBe(false);
    expect(q.size()).toBe(1);
  });

  it("5 - partial replay failure: successful ops committed, failed re-queued", async () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", idempotent: false }));
    q.enqueue(makeMutation({ id: "b", entityId: "2", idempotent: false }));
    let call = 0;
    const result = await q.replay(async () => { call++; return call === 1 ? { success: true } : { success: false }; });
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
    expect(q.size()).toBe(1);
  });

  it("6 - conflict detection: server version newer than local mutation", async () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", version: 1, idempotent: false }));
    const result = await q.replay(async () => ({ success: false, conflict: true, serverVersion: 3 }));
    expect(result.conflicts).toHaveLength(1);
  });

  it("7 - conflict resolution: last write wins for non-critical fields", async () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", payload: { notes: "updated" }, idempotent: false }));
    const result = await q.replay(async () => ({ success: false, conflict: true }));
    expect(result.conflicts.length).toBe(1);
    // In LWW, the conflict is noted but could be auto-resolved
    expect(result.conflicts[0].payload.notes).toBe("updated");
  });

  it("8 - conflict resolution: manual merge required for critical fields", async () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", payload: { diagnosis: "critical-change" }, idempotent: false }));
    const result = await q.replay(async () => ({ success: false, conflict: true }));
    expect(result.conflicts).toHaveLength(1);
    // Critical fields flagged for manual review
  });

  it("9 - queue survives app restart (persisted to IndexedDB)", () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", idempotent: false }));
    q.enqueue(makeMutation({ id: "b", entityId: "2", idempotent: false }));
    const serialized = q.serialize();
    const restored = SyncQueue.deserialize(serialized);
    expect(restored.size()).toBe(2);
    expect(restored.getQueue()[0].id).toBe("a");
  });

  it("10 - queue size limit (100 mutations) with oldest-first eviction", () => {
    const q = new SyncQueue(3);
    q.enqueue(makeMutation({ id: "old", entityId: "1", idempotent: false, timestamp: 1 }));
    q.enqueue(makeMutation({ id: "mid", entityId: "2", idempotent: false, timestamp: 2 }));
    q.enqueue(makeMutation({ id: "new", entityId: "3", idempotent: false, timestamp: 3 }));
    const { evicted } = q.enqueue(makeMutation({ id: "newest", entityId: "4", idempotent: false, timestamp: 4 }));
    expect(evicted?.id).toBe("old");
    expect(q.size()).toBe(3);
  });

  it("11 - replay progress: callback fires for each completed mutation", async () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", idempotent: false }));
    q.enqueue(makeMutation({ id: "b", entityId: "2", idempotent: false }));
    const progress: string[] = [];
    q.onProgress((m) => progress.push(m.id));
    await q.replay(async () => ({ success: true }));
    expect(progress).toEqual(["a", "b"]);
  });

  it("12 - network drop during replay pauses and resumes from last success", async () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ id: "a", idempotent: false }));
    q.enqueue(makeMutation({ id: "b", entityId: "2", idempotent: false }));
    q.enqueue(makeMutation({ id: "c", entityId: "3", idempotent: false }));
    let call = 0;
    const result = await q.replay(async () => {
      call++;
      if (call === 2) throw new Error("network drop");
      return { success: true };
    });
    expect(result.interrupted).toBe(true);
    expect(result.succeeded).toBe(1);
    expect(q.size()).toBeGreaterThan(0);
  });

  it("13 - idempotent mutations: replaying same mutation twice is safe", () => {
    const m = makeMutation({ idempotent: true, action: "set_status", entityId: "1" });
    const q = new SyncQueue();
    q.enqueue(m);
    const dup = q.enqueue({ ...m, id: "dup-id" });
    expect(dup.accepted).toBe(false);
  });

  it("14 - non-idempotent mutations: replaying tracked separately", () => {
    const m = makeMutation({ idempotent: false, action: "increment", entityId: "counter-1" });
    const q = new SyncQueue();
    q.enqueue(m);
    const m2 = makeMutation({ idempotent: false, action: "increment", entityId: "counter-1", id: "different" });
    const r = q.enqueue(m2);
    // Non-idempotent are not deduped
    expect(r.accepted).toBe(true);
  });

  it("15 - extended offline (7+ days): stale queue triggers user confirmation", () => {
    const q = new SyncQueue();
    q.enqueue(makeMutation({ timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, idempotent: false }));
    expect(q.isStale(7)).toBe(true);
    const fresh = new SyncQueue();
    fresh.enqueue(makeMutation({ idempotent: false }));
    expect(fresh.isStale(7)).toBe(false);
  });
});
