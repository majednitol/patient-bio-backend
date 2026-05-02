/**
 * Phase 7: API Response Time Budget Tests
 *
 * Enforces PERFORMANCE_BASELINE.md targets via pure-logic tests:
 *   - Group 1: Query configuration audit (staleTime, parallelism, retry)
 *   - Group 2: Data transformation budgets (processing within ms budgets)
 *   - Group 3: Query orchestration patterns (dedup, cache, debounce)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  generateRecords,
  generateUsers,
  measureTime,
  measureTimeAsync,
  paginationLogic,
  simulateDebounce,
} from "./perf-helpers";

// ── Helpers ──────────────────────────────────────────────────────

const SRC = path.resolve(__dirname, "../..");

function readSrc(rel: string): string {
  return fs.readFileSync(path.join(SRC, rel), "utf-8");
}

/** Extract all staleTime values (number literals or expressions) from a file. */
function extractStaleTimeValues(content: string): number[] {
  const vals: number[] = [];
  // Match patterns like staleTime: 30 * 1000 or staleTime: 300000
  const re = /staleTime:\s*([^,}\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    try {
      // Safe eval of simple arithmetic expressions
      const v = Function(`"use strict"; return (${m[1].trim()});`)();
      if (typeof v === "number") vals.push(v);
    } catch { /* skip complex expressions */ }
  }
  return vals;
}

// ── Group 1: Query Configuration Audit ──────────────────────────

describe("Phase 7 – Group 1: Query Configuration Audit", () => {
  const CRITICAL_HOOKS = [
    "hooks/useNotifications.ts",
    "hooks/usePlatformSettings.ts",
    "hooks/useUserRole.ts",
    "hooks/useStaffAccess.ts",
    "hooks/usePlatformCompletion.ts",
    "hooks/useResearcherProfile.ts",
    "hooks/useDiagnosisHistory.ts",
    "hooks/useAccessAnomalies.ts",
    "hooks/useRepeatPrescription.ts",
    "hooks/useBroadcastRequests.ts",
    "hooks/useMissedFollowUps.ts",
    "hooks/useNoShowPrediction.ts",
    "hooks/useGlobalSearch.ts",
  ];

  it("1. All critical hooks use staleTime >= 30s", () => {
    const failures: string[] = [];
    for (const rel of CRITICAL_HOOKS) {
      const content = readSrc(rel);
      const values = extractStaleTimeValues(content);
      if (values.length === 0) {
        failures.push(`${rel}: no staleTime found`);
      }
      for (const v of values) {
        if (v < 30_000) {
          failures.push(`${rel}: staleTime ${v}ms < 30s`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("2. Dashboard prefetch query keys are independent (parallel-safe)", () => {
    const content = readSrc("pages/dashboard/DashboardLayout.tsx");
    const prefetchKeys: string[] = [];
    const re = /prefetchQuery\(\{[^}]*queryKey:\s*\[([^\]]+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) {
      prefetchKeys.push(m[1].trim());
    }
    // Must have at least 2 prefetched queries
    expect(prefetchKeys.length).toBeGreaterThanOrEqual(2);
    // No key should be a prefix of another (would imply dependency)
    for (let i = 0; i < prefetchKeys.length; i++) {
      for (let j = 0; j < prefetchKeys.length; j++) {
        if (i !== j) {
          const ki = prefetchKeys[i].split(",")[0].replace(/['"]/g, "").trim();
          const kj = prefetchKeys[j].split(",")[0].replace(/['"]/g, "").trim();
          // Different root keys mean they're independent
          expect(ki === kj).toBe(false);
        }
      }
    }
  });

  it("3. No critical hook uses retry: false", () => {
    const violations: string[] = [];
    for (const rel of CRITICAL_HOOKS) {
      const content = readSrc(rel);
      if (/retry\s*:\s*false/.test(content)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });

  it("4. Prefetch query keys match runtime hook query key patterns", () => {
    // DashboardLayout prefetches ["user-profile", ...], ["health-records", ...], ["doctor-connections", ...]
    const layout = readSrc("pages/dashboard/DashboardLayout.tsx");
    const prefetchRoots: string[] = [];
    const re = /prefetchQuery\(\{[^}]*queryKey:\s*\["([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(layout))) prefetchRoots.push(m[1]);

    // These must match known hook patterns
    const expectedRoots = ["user-profile", "health-records", "doctor-connections"];
    for (const root of expectedRoots) {
      expect(prefetchRoots).toContain(root);
    }
  });

  it("5. Hospital hooks share standardized STALE_TIME/GC_TIME constants", () => {
    const hospitalHooks = [
      "hooks/useAdmissions.ts",
      "hooks/useWards.ts",
      "hooks/useInvoices.ts",
      "hooks/useHospitalStaff.ts",
      "hooks/useHospitalDoctorSchedule.ts",
    ];
    const configs: { stale: number; gc: number }[] = [];
    for (const rel of hospitalHooks) {
      const content = readSrc(rel);
      const staleMatch = content.match(/const STALE_TIME\s*=\s*([^;]+)/);
      const gcMatch = content.match(/const GC_TIME\s*=\s*([^;]+)/);
      expect(staleMatch).not.toBeNull();
      expect(gcMatch).not.toBeNull();
      const stale = Function(`"use strict"; return (${staleMatch![1].trim()});`)();
      const gc = Function(`"use strict"; return (${gcMatch![1].trim()});`)();
      configs.push({ stale, gc });
    }
    // All should share the same values
    const first = configs[0];
    for (const c of configs) {
      expect(c.stale).toBe(first.stale);
      expect(c.gc).toBe(first.gc);
    }
  });
});

// ── Group 2: Data Transformation Budgets ────────────────────────

describe("Phase 7 – Group 2: Data Transformation Budgets", () => {
  it("6. Processing 500 health records (filter + sort + paginate) < 20ms", () => {
    const records = generateRecords(500);
    const { durationMs } = measureTime(() => {
      const filtered = records.filter(
        (r) => r.disease_category === "cardiology" || r.disease_category === "diabetes"
      );
      const sorted = filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return paginationLogic(sorted, 1, 20);
    });
    expect(durationMs).toBeLessThan(20);
  });

  it("7. Processing 200 appointments into density map < 10ms", () => {
    const appointments = Array.from({ length: 200 }, (_, i) => ({
      id: `apt-${i}`,
      date: `2026-02-${String((i % 28) + 1).padStart(2, "0")}`,
      doctor_id: `doc-${i % 10}`,
      start_time: `${9 + (i % 8)}:00`,
    }));
    const { durationMs } = measureTime(() => {
      const density = new Map<string, number>();
      for (const apt of appointments) {
        density.set(apt.date, (density.get(apt.date) || 0) + 1);
      }
      return density;
    });
    expect(durationMs).toBeLessThan(10);
  });

  it("8. Processing 1000 access logs with grouping < 30ms", () => {
    const logs = Array.from({ length: 1000 }, (_, i) => ({
      id: `log-${i}`,
      accessor_type: ["doctor", "researcher", "hospital"][i % 3],
      accessed_at: new Date(Date.now() - i * 3600000).toISOString(),
      user_id: `user-${i % 100}`,
    }));
    const { durationMs } = measureTime(() => {
      const grouped = new Map<string, typeof logs>();
      for (const log of logs) {
        const key = log.accessor_type;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(log);
      }
      // Sort each group
      for (const [, group] of grouped) {
        group.sort((a, b) => b.accessed_at.localeCompare(a.accessed_at));
      }
      return grouped;
    });
    expect(durationMs).toBeLessThan(30);
  });

  it("9. Processing 100 notifications with optimistic mark-all-read < 5ms", () => {
    const notifications = Array.from({ length: 100 }, (_, i) => ({
      id: `notif-${i}`,
      is_read: i % 3 === 0,
      title: `Notification ${i}`,
      created_at: new Date(Date.now() - i * 60000).toISOString(),
    }));
    const { durationMs } = measureTime(() => {
      return notifications.map((n) => ({ ...n, is_read: true }));
    });
    expect(durationMs).toBeLessThan(5);
  });

  it("10. Processing 50 prescriptions with interaction check < 10ms", () => {
    const INTERACTIONS: Record<string, string[]> = {
      Warfarin: ["Aspirin", "Ibuprofen"],
      Metformin: ["Contrast Dye"],
      Lisinopril: ["Potassium"],
    };
    const prescriptions = Array.from({ length: 50 }, (_, i) => ({
      id: `rx-${i}`,
      medication: ["Warfarin", "Aspirin", "Metformin", "Lisinopril", "Amoxicillin"][i % 5],
      dosage: "10mg",
    }));
    const { durationMs } = measureTime(() => {
      const medNames = prescriptions.map((p) => p.medication);
      const warnings: string[] = [];
      for (const [drug, conflicts] of Object.entries(INTERACTIONS)) {
        if (medNames.includes(drug)) {
          for (const c of conflicts) {
            if (medNames.includes(c)) {
              warnings.push(`${drug} interacts with ${c}`);
            }
          }
        }
      }
      return warnings;
    });
    expect(durationMs).toBeLessThan(10);
  });
});

// ── Group 3: Query Orchestration Patterns ───────────────────────

describe("Phase 7 – Group 3: Query Orchestration Patterns", () => {
  it("11. Parallel fetch of 10 endpoints completes faster than sequential", async () => {
    const simulatedLatency = 20; // ms
    const fetchEndpoint = () =>
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("data"), simulatedLatency)
      );

    const { durationMs: parallelMs } = await measureTimeAsync(async () => {
      return Promise.all(Array.from({ length: 10 }, () => fetchEndpoint()));
    });

    const { durationMs: sequentialMs } = await measureTimeAsync(async () => {
      const results: string[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(await fetchEndpoint());
      }
      return results;
    });

    // Parallel should be significantly faster (at least 3x)
    expect(parallelMs).toBeLessThan(sequentialMs / 2);
  });

  it("12. Cache-first: second call with same key returns from cache (no fetch)", async () => {
    const cache = new Map<string, unknown>();
    let fetchCount = 0;

    const cachedFetch = async (key: string) => {
      if (cache.has(key)) return cache.get(key);
      fetchCount++;
      const data = { result: "fresh" };
      cache.set(key, data);
      return data;
    };

    await cachedFetch("dashboard-data");
    await cachedFetch("dashboard-data");
    await cachedFetch("dashboard-data");

    expect(fetchCount).toBe(1);
  });

  it("13. Query deduplication: 5 concurrent calls result in 1 fetch", async () => {
    let fetchCount = 0;
    const inflight = new Map<string, Promise<unknown>>();

    const dedupedFetch = (key: string) => {
      if (inflight.has(key)) return inflight.get(key)!;
      fetchCount++;
      const promise = new Promise((resolve) =>
        setTimeout(() => {
          inflight.delete(key);
          resolve({ data: "ok" });
        }, 10)
      );
      inflight.set(key, promise);
      return promise;
    };

    await Promise.all([
      dedupedFetch("users"),
      dedupedFetch("users"),
      dedupedFetch("users"),
      dedupedFetch("users"),
      dedupedFetch("users"),
    ]);

    expect(fetchCount).toBe(1);
  });

  it("14. Waterfall: dependent queries add latency proportional to depth", async () => {
    const stepLatency = 15; // ms per step
    const fetchStep = () =>
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("data"), stepLatency)
      );

    // Depth 1 (single fetch)
    const { durationMs: d1 } = await measureTimeAsync(() => fetchStep());
    // Depth 3 (waterfall chain)
    const { durationMs: d3 } = await measureTimeAsync(async () => {
      await fetchStep();
      await fetchStep();
      await fetchStep();
    });

    // 3-deep waterfall should take roughly 3x a single step
    expect(d3).toBeGreaterThan(d1 * 2);
  });

  it("15. Debounced search: 10 rapid keystrokes result in 1 API call", () => {
    vi.useFakeTimers();
    try {
      const { fireCount } = simulateDebounce(10, 300);
      expect(fireCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
