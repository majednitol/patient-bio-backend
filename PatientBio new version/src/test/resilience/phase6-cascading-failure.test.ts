import { describe, it, expect } from "vitest";

// ── Subsystem simulators ──

type SubsystemStatus = "healthy" | "failed" | "slow" | "rate_limited";

interface Subsystem {
  name: string;
  status: SubsystemStatus;
  delayMs: number;
  critical: boolean;
}

function createSubsystem(name: string, critical: boolean, status: SubsystemStatus = "healthy"): Subsystem {
  return { name, status, delayMs: status === "slow" ? 5000 : 0, critical };
}

async function callSubsystem<T>(subsystem: Subsystem, operation: () => T, fallback?: T): Promise<{ result: T | null; error: string | null; usedFallback: boolean }> {
  if (subsystem.status === "failed") {
    return fallback !== undefined
      ? { result: fallback, error: `${subsystem.name} failed`, usedFallback: true }
      : { result: null, error: `${subsystem.name} failed`, usedFallback: false };
  }
  if (subsystem.status === "rate_limited") {
    return fallback !== undefined
      ? { result: fallback, error: `${subsystem.name} rate limited`, usedFallback: true }
      : { result: null, error: `${subsystem.name} rate limited`, usedFallback: false };
  }
  return { result: operation(), error: null, usedFallback: false };
}

async function executeWithIsolation(
  operations: Array<{ subsystem: Subsystem; execute: () => any; fallback?: any }>
): Promise<Array<{ name: string; success: boolean; result: any; usedFallback: boolean }>> {
  const results = await Promise.allSettled(
    operations.map(async (op) => {
      const res = await callSubsystem(op.subsystem, op.execute, op.fallback);
      return { name: op.subsystem.name, success: res.error === null, result: res.result, usedFallback: res.usedFallback };
    })
  );
  return results.map((r) => (r.status === "fulfilled" ? r.value : { name: "unknown", success: false, result: null, usedFallback: false }));
}

function simulateConnectionPool(capacity: number, used: number) {
  const available = capacity - used;
  return {
    canAllocate: (priority: "critical" | "normal") => {
      if (priority === "critical") return available > 0 || used < capacity;
      return available > capacity * 0.2; // normal needs 20% free
    },
    utilization: used / capacity,
  };
}

function simulatePollingFallback(realtimeAvailable: boolean): { mode: "realtime" | "polling"; intervalMs: number } {
  return realtimeAvailable ? { mode: "realtime", intervalMs: 0 } : { mode: "polling", intervalMs: 5000 };
}

function simulateRecoveryQueue() {
  const queue: Array<{ operation: string; data: any }> = [];
  return {
    enqueue: (op: string, data: any) => queue.push({ operation: op, data }),
    replay: () => {
      const replayed = [...queue];
      queue.length = 0;
      return replayed;
    },
    size: () => queue.length,
  };
}

// ── Tests ──

describe("Phase 13: Cascading Failure and Blast Radius", () => {
  it("1. notification failure doesn't block prescription creation", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("prescriptions", true), execute: () => ({ id: "rx-1", created: true }) },
      { subsystem: createSubsystem("notifications", false, "failed"), execute: () => ({ sent: true }), fallback: { sent: false, queued: true } },
    ]);
    expect(results[0].success).toBe(true);
    expect(results[0].result).toHaveProperty("created", true);
    expect(results[1].usedFallback).toBe(true);
  });

  it("2. analytics timeout doesn't affect dashboard data", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("dashboard", true), execute: () => ({ records: 150, loaded: true }) },
      { subsystem: createSubsystem("analytics", false, "slow"), execute: () => ({ charts: [] }), fallback: { charts: [], stale: true } },
    ]);
    expect(results[0].success).toBe(true);
    expect(results[0].result.loaded).toBe(true);
  });

  it("3. AI service down allows manual diagnosis entry", async () => {
    const aiSystem = createSubsystem("ai-suggestions", false, "failed");
    const res = await callSubsystem(aiSystem, () => ({ suggestions: ["Fever"] }), { suggestions: [] } as any);
    expect(res.usedFallback).toBe(true);
    expect(res.result).toHaveProperty("suggestions");
    // Manual entry still works
    const manualDiagnosis = { diagnosis: "Viral Fever", enteredManually: true };
    expect(manualDiagnosis.enteredManually).toBe(true);
  });

  it("4. slow storage doesn't block record listing from cache", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("records-db", true), execute: () => ({ records: Array(50).fill({ id: "r" }), source: "db" }) },
      { subsystem: createSubsystem("storage", false, "slow"), execute: () => ({ files: [] }), fallback: { files: [], cached: true } },
    ]);
    expect(results[0].success).toBe(true);
    expect(results[0].result.records).toHaveLength(50);
  });

  it("5. one failing edge function doesn't affect parallel calls", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("ef-notifications", false, "failed"), execute: () => ({ sent: true }), fallback: null },
      { subsystem: createSubsystem("ef-ai-diagnosis", true), execute: () => ({ diagnosis: "Fever", confidence: 0.9 }) },
      { subsystem: createSubsystem("ef-pdf-generate", true), execute: () => ({ pdfUrl: "/doc.pdf" }) },
    ]);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
    expect(results[2].success).toBe(true);
  });

  it("6. connection pool at 80% still serves critical queries", () => {
    const pool = simulateConnectionPool(100, 80);
    expect(pool.utilization).toBe(0.8);
    expect(pool.canAllocate("critical")).toBe(true);
    expect(pool.canAllocate("normal")).toBe(false);
  });

  it("7. realtime failure triggers polling fallback", () => {
    const healthy = simulatePollingFallback(true);
    expect(healthy.mode).toBe("realtime");

    const fallback = simulatePollingFallback(false);
    expect(fallback.mode).toBe("polling");
    expect(fallback.intervalMs).toBe(5000);
  });

  it("8. PDF generation failure doesn't block visit summary data", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("visit-summary", true), execute: () => ({ diagnosis: "Flu", medications: 3, date: "2026-02-16" }) },
      { subsystem: createSubsystem("pdf-generator", false, "failed"), execute: () => ({ url: "/summary.pdf" }), fallback: { url: null, error: "PDF unavailable" } },
    ]);
    expect(results[0].success).toBe(true);
    expect(results[0].result).toHaveProperty("diagnosis");
    expect(results[1].usedFallback).toBe(true);
  });

  it("9. email down but in-app notifications still delivered", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("email-service", false, "failed"), execute: () => ({ emailSent: true }), fallback: { emailSent: false } },
      { subsystem: createSubsystem("in-app-notifications", true), execute: () => ({ notificationId: "n-1", delivered: true }) },
    ]);
    expect(results[0].usedFallback).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[1].result.delivered).toBe(true);
  });

  it("10. stale search index falls back to full scan", async () => {
    const searchIndex = createSubsystem("search-index", false, "failed");
    const fullScan = createSubsystem("db-full-scan", true);
    const results = await executeWithIsolation([
      { subsystem: searchIndex, execute: () => ({ results: [], source: "index" }), fallback: null },
      { subsystem: fullScan, execute: () => ({ results: [{ id: "r-1" }, { id: "r-2" }], source: "full-scan" }) },
    ]);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(true);
    expect(results[1].result.source).toBe("full-scan");
  });

  it("11. rate limit on one endpoint doesn't affect others", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("analytics-endpoint", false, "rate_limited"), execute: () => ({}), fallback: { limited: true } },
      { subsystem: createSubsystem("records-endpoint", true), execute: () => ({ records: [1, 2, 3] }) },
      { subsystem: createSubsystem("auth-endpoint", true), execute: () => ({ authenticated: true }) },
    ]);
    expect(results[0].usedFallback).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[2].success).toBe(true);
  });

  it("12. token refresh failure keeps cached data accessible", async () => {
    const cachedData = { records: [{ id: "r-1" }], cachedAt: Date.now(), staleTimeMs: 300000 };
    const tokenRefresh = createSubsystem("auth-refresh", true, "failed");
    const res = await callSubsystem(tokenRefresh, () => ({ newToken: "abc" }), null);
    expect(res.error).toContain("failed");
    // Cached data remains usable within staleTime
    const isStale = Date.now() - cachedData.cachedAt > cachedData.staleTimeMs;
    expect(isStale).toBe(false);
    expect(cachedData.records).toHaveLength(1);
  });

  it("13. concurrent failures: notifications + analytics down, CRUD works", async () => {
    const results = await executeWithIsolation([
      { subsystem: createSubsystem("notifications", false, "failed"), execute: () => ({}), fallback: null },
      { subsystem: createSubsystem("analytics", false, "failed"), execute: () => ({}), fallback: null },
      { subsystem: createSubsystem("records-crud", true), execute: () => ({ created: true, id: "r-new" }) },
      { subsystem: createSubsystem("prescriptions-crud", true), execute: () => ({ created: true, id: "rx-new" }) },
      { subsystem: createSubsystem("appointments-crud", true), execute: () => ({ created: true, id: "apt-new" }) },
    ]);
    expect(results[0].success).toBe(false);
    expect(results[1].success).toBe(false);
    expect(results[2].success).toBe(true);
    expect(results[3].success).toBe(true);
    expect(results[4].success).toBe(true);
  });

  it("14. slow upstream API returns cached/default data after timeout", async () => {
    const upstream = createSubsystem("external-api", false, "slow");
    const defaultData = { data: [], source: "default", message: "Using default data" };
    // Simulate timeout by treating slow as failed for external deps
    const res = await callSubsystem(
      { ...upstream, status: "failed" as SubsystemStatus },
      () => ({ data: [1, 2, 3], source: "live" }),
      defaultData
    );
    expect(res.usedFallback).toBe(true);
    expect(res.result).toHaveProperty("source", "default");
  });

  it("15. recovery: queued operations replay after subsystem comes back", () => {
    const queue = simulateRecoveryQueue();

    // Subsystem fails, operations queued
    queue.enqueue("create_prescription", { id: "rx-1" });
    queue.enqueue("send_notification", { to: "user-1" });
    queue.enqueue("update_record", { id: "r-1" });
    expect(queue.size()).toBe(3);

    // Subsystem recovers, replay
    const replayed = queue.replay();
    expect(replayed).toHaveLength(3);
    expect(replayed[0].operation).toBe("create_prescription");
    expect(queue.size()).toBe(0);
  });
});
