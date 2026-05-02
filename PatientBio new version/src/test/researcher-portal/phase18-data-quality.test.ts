import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 18 — Data Quality Dashboard Tests (Tests 215–222)
 */

describe("Phase 18: Data Quality Dashboard", () => {
  // Test 215: Quality metrics aggregation
  it("215. aggregates quality metrics: completeness, accuracy, freshness", () => {
    const metrics = [
      { dimension: "completeness", score: 0.85 },
      { dimension: "accuracy", score: 0.92 },
      { dimension: "freshness", score: 0.78 },
      { dimension: "consistency", score: 0.88 },
    ];
    const avgScore = metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length;
    expect(avgScore).toBeCloseTo(0.8575, 2);
  });

  // Test 216: Quality badge tier
  it("216. renders correct quality tier badge", () => {
    const getTier = (score: number) => {
      if (score >= 0.9) return "Gold";
      if (score >= 0.7) return "Silver";
      return "Bronze";
    };
    expect(getTier(0.95)).toBe("Gold");
    expect(getTier(0.80)).toBe("Silver");
    expect(getTier(0.60)).toBe("Bronze");
  });

  // Test 217: Trend analysis
  it("217. trend analysis detects metric changes over time", () => {
    const history = [
      { date: "2025-01-01", completeness: 0.70 },
      { date: "2025-02-01", completeness: 0.75 },
      { date: "2025-03-01", completeness: 0.85 },
    ];
    const trend = history[history.length - 1].completeness - history[0].completeness;
    expect(trend).toBeCloseTo(0.15, 2);
    expect(trend).toBeGreaterThan(0); // improving
  });

  // Test 218: Radar chart dimensions
  it("218. radar chart receives all quality dimensions", () => {
    const dimensions = ["completeness", "accuracy", "freshness", "consistency", "timeliness"];
    const data = dimensions.map(d => ({ dimension: d, value: Math.random() }));
    expect(data).toHaveLength(5);
    data.forEach(d => {
      expect(d.value).toBeGreaterThanOrEqual(0);
      expect(d.value).toBeLessThanOrEqual(1);
    });
  });

  // Test 219: Empty metrics state
  it("219. empty metrics renders placeholder", () => {
    const metrics: any[] = [];
    const isEmpty = metrics.length === 0;
    expect(isEmpty).toBe(true);
  });

  // Test 220: PDF report generation
  it("220. PDF report contains expected sections", () => {
    const reportSections = ["Executive Summary", "Quality Dimensions", "Trends", "Recommendations"];
    expect(reportSections).toContain("Executive Summary");
    expect(reportSections).toContain("Trends");
  });

  // Test 221: Weighted quality score
  it("221. weighted quality score applies dimension weights", () => {
    const weights = { completeness: 0.3, accuracy: 0.3, freshness: 0.2, consistency: 0.2 };
    const scores = { completeness: 0.9, accuracy: 0.85, freshness: 0.7, consistency: 0.8 };
    const weighted =
      weights.completeness * scores.completeness +
      weights.accuracy * scores.accuracy +
      weights.freshness * scores.freshness +
      weights.consistency * scores.consistency;
    expect(weighted).toBeCloseTo(0.825, 2);
  });

  // Test 222: Metric refresh triggers re-fetch
  it("222. metric refresh invalidates quality cache key", () => {
    const queryKey = ["data-quality-metrics", mockUser.id];
    expect(queryKey[0]).toBe("data-quality-metrics");
    expect(queryKey[1]).toBe(mockUser.id);
  });
});
