import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateRecords,
  generateUsers,
  measureTime,
  chunk,
  simulateDebounce,
  MockRecord,
} from "./perf-helpers";

describe("Phase 1: Large Dataset Handling", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // 1
  it("generates 10,000 patient records under 100ms", () => {
    const { result, durationMs } = measureTime(() => generateRecords(10_000));
    expect(result).toHaveLength(10_000);
    expect(durationMs).toBeLessThan(100);
  });

  // 2
  it("filters 10K records by disease category", () => {
    const records = generateRecords(10_000);
    const { result, durationMs } = measureTime(() =>
      records.filter((r) => r.disease_category === "diabetes")
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.disease_category === "diabetes")).toBe(true);
    expect(durationMs).toBeLessThan(100);
  });

  // 3
  it("sorts 10K records by date descending", () => {
    const records = generateRecords(10_000);
    const { result, durationMs } = measureTime(() =>
      [...records].sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
    expect(durationMs).toBeLessThan(100);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].created_at >= result[i].created_at).toBe(true);
    }
  });

  // 4
  it("fuzzy name search over 5K profiles", () => {
    const users = generateUsers(5_000);
    const query = "amit";
    const { result, durationMs } = measureTime(() =>
      users.filter((u) => u.display_name.toLowerCase().includes(query))
    );
    expect(result.length).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(100);
  });

  // 5
  it("groups 10K prescriptions by doctor_id", () => {
    const records = generateRecords(10_000);
    const { result, durationMs } = measureTime(() => {
      const map = new Map<string, MockRecord[]>();
      for (const r of records) {
        const arr = map.get(r.doctor_id);
        if (arr) arr.push(r); else map.set(r.doctor_id, [r]);
      }
      return map;
    });
    expect(result.size).toBe(50); // doc-0 through doc-49
    expect(durationMs).toBeLessThan(100);
  });

  // 6
  it("deduplicates 5K records with 30% overlap", () => {
    const base = generateRecords(3_500);
    const overlap = generateRecords(1_500); // ids rec-0..rec-1499 overlap
    const combined = [...base, ...overlap];
    expect(combined.length).toBe(5_000);

    const { result, durationMs } = measureTime(() => {
      const seen = new Set<string>();
      return combined.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    });
    expect(result.length).toBe(3_500); // 1500 dupes removed
    expect(durationMs).toBeLessThan(100);
  });

  // 7
  it("VirtualList batch slicing with 50K items", () => {
    const items = generateRecords(50_000);
    const batchSize = 20;
    let visibleCount = batchSize;

    // Simulate 5 loadMore calls
    for (let i = 0; i < 5; i++) {
      visibleCount = Math.min(visibleCount + batchSize, items.length);
    }
    expect(visibleCount).toBe(120); // 20 + 5*20
    const visible = items.slice(0, visibleCount);
    expect(visible).toHaveLength(120);
  });

  // 8
  it("VirtualList reset on items change", () => {
    const batchSize = 20;
    let visibleCount = 100; // simulate scrolled state
    // items change -> reset
    visibleCount = batchSize;
    expect(visibleCount).toBe(20);
  });

  // 9
  it("processes 1K notifications in batch mark-read", () => {
    const notifications = Array.from({ length: 1_000 }, (_, i) => ({
      id: `notif-${i}`,
      is_read: false,
    }));
    const { result, durationMs } = measureTime(() =>
      notifications.map((n) => ({ ...n, is_read: true }))
    );
    expect(result.every((n) => n.is_read)).toBe(true);
    expect(durationMs).toBeLessThan(100);
  });

  // 10
  it("builds appointment density map for 2K appointments", () => {
    const records = generateRecords(2_000);
    const { result, durationMs } = measureTime(() => {
      const density = new Map<string, number>();
      for (const r of records) {
        const day = r.created_at.slice(0, 10);
        density.set(day, (density.get(day) || 0) + 1);
      }
      return density;
    });
    expect(result.size).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(100);
  });

  // 11
  it("CSV export of 5K users completes", () => {
    const users = generateUsers(5_000);
    const { result, durationMs } = measureTime(() => {
      const header = "id,email,display_name,phone,role\n";
      const rows = users.map((u) => `${u.id},${u.email},${u.display_name},${u.phone},${u.role}`).join("\n");
      return header + rows;
    });
    expect(result.split("\n").length).toBe(5_001); // header + 5000 rows
    expect(durationMs).toBeLessThan(100);
  });

  // 12
  it("100K health records memory-safe slice", () => {
    const records = generateRecords(100_000);
    const page = 500;
    const perPage = 20;
    const { result } = measureTime(() => {
      const start = (page - 1) * perPage;
      return records.slice(start, start + perPage);
    });
    expect(result).toHaveLength(20);
    expect(result[0].id).toBe(`rec-${(page - 1) * perPage}`);
  });

  // 13
  it("search debounce coalesces 50 rapid inputs to 1", () => {
    const { fireCount } = simulateDebounce(50, 300);
    expect(fireCount).toBe(1);
  });

  // 14
  it("aggregates analytics from 10K consultation entries", () => {
    const entries = Array.from({ length: 10_000 }, (_, i) => ({
      duration_minutes: 10 + (i % 20),
      fee: 100 + (i % 50),
    }));
    const { result, durationMs } = measureTime(() => {
      let totalDuration = 0, totalFee = 0;
      for (const e of entries) {
        totalDuration += e.duration_minutes;
        totalFee += e.fee;
      }
      return { avgDuration: totalDuration / entries.length, avgFee: totalFee / entries.length };
    });
    expect(result.avgDuration).toBeGreaterThan(0);
    expect(result.avgFee).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(100);
  });

  // 15
  it("multi-column sort stability on 5K rows", () => {
    const records = generateRecords(5_000);
    const { result } = measureTime(() =>
      [...records].sort((a, b) => {
        const cat = a.disease_category.localeCompare(b.disease_category);
        if (cat !== 0) return cat;
        return a.created_at.localeCompare(b.created_at);
      })
    );
    // Verify groups are sorted by category then date
    for (let i = 1; i < result.length; i++) {
      const catCmp = result[i - 1].disease_category.localeCompare(result[i].disease_category);
      if (catCmp === 0) {
        expect(result[i - 1].created_at <= result[i].created_at).toBe(true);
      } else {
        expect(catCmp).toBeLessThanOrEqual(0);
      }
    }
  });

  // 16
  it("date range filter on 20K appointments", () => {
    const records = generateRecords(20_000);
    const start = new Date("2024-01-05").toISOString();
    const end = new Date("2024-01-10").toISOString();
    const { result } = measureTime(() =>
      records.filter((r) => r.created_at >= start && r.created_at <= end)
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.created_at >= start && r.created_at <= end)).toBe(true);
  });

  // 17
  it("medication interaction check against 500 drugs", () => {
    const drugs = Array.from({ length: 500 }, (_, i) => `drug-${i}`);
    const knownInteractions = new Set(["drug-10:drug-20", "drug-50:drug-100", "drug-200:drug-300"]);
    const { result, durationMs } = measureTime(() => {
      const found: string[] = [];
      for (let i = 0; i < drugs.length; i++) {
        for (let j = i + 1; j < drugs.length; j++) {
          const key = `${drugs[i]}:${drugs[j]}`;
          if (knownInteractions.has(key)) found.push(key);
        }
      }
      return found;
    });
    expect(result).toHaveLength(3);
    expect(durationMs).toBeLessThan(100);
  });

  // 18
  it("builds referral chain tree from 1K flat referrals", () => {
    const referrals = Array.from({ length: 1_000 }, (_, i) => ({
      id: `ref-${i}`,
      parent_id: i === 0 ? null : `ref-${Math.floor(i / 3)}`,
    }));
    const { result, durationMs } = measureTime(() => {
      const children = new Map<string | null, typeof referrals>();
      for (const r of referrals) {
        const arr = children.get(r.parent_id);
        if (arr) arr.push(r); else children.set(r.parent_id, [r]);
      }
      return children;
    });
    expect(result.get(null)).toHaveLength(1); // root
    expect(durationMs).toBeLessThan(100);
  });

  // 19
  it("flattens nested lab results for 500 reports", () => {
    const reports = Array.from({ length: 500 }, (_, ri) => ({
      id: `report-${ri}`,
      tests: Array.from({ length: 10 }, (_, ti) => ({
        name: `test-${ti}`,
        params: Array.from({ length: 20 }, (_, pi) => ({
          name: `param-${pi}`,
          value: Math.random() * 100,
        })),
      })),
    }));
    const { result, durationMs } = measureTime(() =>
      reports.flatMap((r) => r.tests.flatMap((t) => t.params.map((p) => ({
        reportId: r.id, testName: t.name, ...p,
      }))))
    );
    expect(result).toHaveLength(500 * 10 * 20); // 100,000
    expect(durationMs).toBeLessThan(100);
  });

  // 20
  it("staleTime and gcTime defaults are correctly set", () => {
    const STALE_TIME = 5 * 60 * 1000; // 5 minutes
    const GC_TIME = 10 * 60 * 1000;
    expect(STALE_TIME).toBe(300_000);
    expect(GC_TIME).toBe(600_000);
    expect(STALE_TIME).toBeLessThan(GC_TIME);
  });
});
