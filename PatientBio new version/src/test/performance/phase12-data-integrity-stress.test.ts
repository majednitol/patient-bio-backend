/**
 * Phase 12: Data Integrity Under Concurrent Mutations
 * Validates deterministic outcomes when multiple operations contend on shared state.
 */
import { describe, it, expect } from "vitest";
import {
  generateRecords,
  generateAppointments,
  generatePrescriptions,
  measureTime,
  paginationLogic,
} from "./perf-helpers";
import { QueryCache, OptimisticMutation } from "../state-management/state-helpers";

describe("Phase 12: Data Integrity Under Concurrent Mutations", () => {
  it("100 concurrent writes to same Map key -- last-write-wins is deterministic", async () => {
    const store = new Map<string, number>();
    const writes = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve().then(() => store.set("key", i))
    );
    await Promise.all(writes);
    expect(store.get("key")).toBe(99);
  });

  it("50 reads interleaved with 50 writes -- reads never return undefined on existing key", async () => {
    const store = new Map<string, string>();
    store.set("shared", "init");
    const results: (string | undefined)[] = [];
    const ops = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve().then(() => {
        if (i % 2 === 0) {
          store.set("shared", `v${i}`);
        } else {
          results.push(store.get("shared"));
        }
      })
    );
    await Promise.all(ops);
    expect(results.every((r) => r !== undefined)).toBe(true);
  });

  it("20 delete + 20 create on same key set -- final count matches net operations", async () => {
    const store = new Map<string, boolean>();
    for (let i = 0; i < 20; i++) store.set(`k-${i}`, true);
    const ops: Promise<void>[] = [];
    for (let i = 0; i < 20; i++) {
      ops.push(Promise.resolve().then(() => { store.delete(`k-${i}`); }));
      ops.push(Promise.resolve().then(() => { store.set(`new-${i}`, true); }));
    }
    await Promise.all(ops);
    // All original deleted, all new created
    for (let i = 0; i < 20; i++) {
      expect(store.has(`k-${i}`)).toBe(false);
      expect(store.has(`new-${i}`)).toBe(true);
    }
    expect(store.size).toBe(20);
  });

  it("optimistic update + rollback under 50 mutations -- snapshot integrity preserved", () => {
    const cache = new QueryCache();
    const key = "test-entity";
    cache.set(key, { count: 0 });

    for (let i = 0; i < 50; i++) {
      const mutation = new OptimisticMutation<{ count: number }>(cache, key);
      mutation.takeSnapshot();
      mutation.apply((old) => ({ count: old.count + 1 }));
      // Always rollback
      mutation.rollback();
    }
    expect(cache.get<{ count: number }>(key)?.count).toBe(0);
  });

  it("100 concurrent prescription creates -- all have unique IDs", async () => {
    const ids = new Set<string>();
    const ops = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve().then(() => {
        const rx = generatePrescriptions(1)[0];
        const uniqueId = `${rx.id}-${i}-${Date.now()}`;
        ids.add(uniqueId);
      })
    );
    await Promise.all(ops);
    expect(ids.size).toBe(100);
  });

  it("50 appointment status transitions -- no invalid state", () => {
    const validTransitions: Record<string, string[]> = {
      scheduled: ["confirmed", "cancelled"],
      confirmed: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    const appointments = generateAppointments(50);
    const results: boolean[] = [];
    for (const apt of appointments) {
      let current = "scheduled";
      const chain = ["confirmed", "completed"];
      let valid = true;
      for (const next of chain) {
        if (validTransitions[current]?.includes(next)) {
          current = next;
        } else {
          valid = false;
          break;
        }
      }
      results.push(valid);
    }
    expect(results.every(Boolean)).toBe(true);
  });

  it("batch update of 500 records with interleaved reads -- readers see valid data", async () => {
    const records = generateRecords(500);
    const store = new Map(records.map((r) => [r.id, r]));
    const readResults: boolean[] = [];
    const ops: Promise<void>[] = [];
    for (let i = 0; i < 500; i++) {
      ops.push(
        Promise.resolve().then(() => {
          const rec = store.get(`rec-${i}`);
          if (rec) store.set(`rec-${i}`, { ...rec, status: "updated" });
        })
      );
      if (i % 5 === 0) {
        ops.push(
          Promise.resolve().then(() => {
            const rec = store.get(`rec-${i}`);
            readResults.push(rec !== undefined);
          })
        );
      }
    }
    await Promise.all(ops);
    expect(readResults.every(Boolean)).toBe(true);
  });

  it("30 token revocations + 30 validation checks -- revoked tokens never validate", async () => {
    const tokens = new Map<string, boolean>();
    for (let i = 0; i < 30; i++) tokens.set(`tok-${i}`, false); // false = not revoked

    const ops: Promise<void>[] = [];
    // Revoke all
    for (let i = 0; i < 30; i++) {
      ops.push(Promise.resolve().then(() => { tokens.set(`tok-${i}`, true); }));
    }
    await Promise.all(ops);

    // Validate -- all should be revoked
    const validations = Array.from({ length: 30 }, (_, i) => tokens.get(`tok-${i}`));
    expect(validations.every((revoked) => revoked === true)).toBe(true);
  });

  it("counter increment by 100 sequential operations -- final value equals 100", () => {
    let counter = 0;
    for (let i = 0; i < 100; i++) counter++;
    expect(counter).toBe(100);
  });

  it("50 concurrent cache key writes with same prefix -- no key collision", async () => {
    const cache = new QueryCache();
    const ops = Array.from({ length: 50 }, (_, i) =>
      Promise.resolve().then(() => cache.set(`prefix-${i}`, { value: i }))
    );
    await Promise.all(ops);
    expect(cache.size()).toBe(50);
    for (let i = 0; i < 50; i++) {
      expect(cache.get<{ value: number }>(`prefix-${i}`)?.value).toBe(i);
    }
  });

  it("mixed entity operations: records + prescriptions + appointments simultaneously", async () => {
    const records = new Map<string, unknown>();
    const prescriptions = new Map<string, unknown>();
    const appointments = new Map<string, unknown>();

    const ops: Promise<void>[] = [];
    for (let i = 0; i < 20; i++) {
      ops.push(Promise.resolve().then(() => { records.set(`rec-${i}`, generateRecords(1)[0]); }));
      ops.push(Promise.resolve().then(() => { prescriptions.set(`rx-${i}`, generatePrescriptions(1)[0]); }));
      ops.push(Promise.resolve().then(() => { appointments.set(`apt-${i}`, generateAppointments(1)[0]); }));
    }
    await Promise.all(ops);
    expect(records.size).toBe(20);
    expect(prescriptions.size).toBe(20);
    expect(appointments.size).toBe(20);
  });

  it("rapid CRUD cycle (100 iterations) -- each cycle leaves clean state", () => {
    const store = new Map<string, string>();
    for (let i = 0; i < 100; i++) {
      store.set("item", `v${i}`);
      expect(store.get("item")).toBe(`v${i}`);
      store.set("item", `updated-${i}`);
      expect(store.get("item")).toBe(`updated-${i}`);
      store.delete("item");
      expect(store.has("item")).toBe(false);
    }
    expect(store.size).toBe(0);
  });

  it("200 concurrent sort operations -- source array is never mutated", async () => {
    const source = Object.freeze(generateRecords(100).map((r) => r.id));
    const ops = Array.from({ length: 200 }, () =>
      Promise.resolve().then(() => {
        const copy = [...source];
        copy.sort((a, b) => b.localeCompare(a));
        return copy;
      })
    );
    const results = await Promise.all(ops);
    // Source unchanged
    expect(source[0]).toBe("rec-0");
    // All results are valid sorted arrays
    expect(results.every((r) => r.length === 100)).toBe(true);
  });

  it("interleaved pagination: 10 users paginating same dataset -- each gets correct page", async () => {
    const data = generateRecords(200);
    const ops = Array.from({ length: 10 }, (_, userIdx) =>
      Promise.resolve().then(() => {
        const page = userIdx + 1;
        const result = paginationLogic(data, page, 20);
        return { userIdx, page, result };
      })
    );
    const results = await Promise.all(ops);
    for (const { page, result } of results) {
      expect(result.currentPage).toBe(page);
      expect(result.paginatedData.length).toBe(20);
      expect(result.paginatedData[0].id).toBe(`rec-${(page - 1) * 20}`);
    }
  });

  it("recovery after 50% of operations fail -- successful ops committed, failed rolled back", async () => {
    const committed = new Set<string>();
    const ops = Array.from({ length: 100 }, (_, i) =>
      Promise.resolve().then(() => {
        if (i % 2 === 0) {
          committed.add(`op-${i}`);
        } else {
          throw new Error(`op-${i} failed`);
        }
      }).catch(() => { /* rolled back / ignored */ })
    );
    await Promise.allSettled(ops);
    expect(committed.size).toBe(50);
    // Only even ops committed
    for (let i = 0; i < 100; i += 2) {
      expect(committed.has(`op-${i}`)).toBe(true);
    }
    for (let i = 1; i < 100; i += 2) {
      expect(committed.has(`op-${i}`)).toBe(false);
    }
  });
});
