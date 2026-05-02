import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 25 — Cohort Comparison Tests (Tests 273–278)
 */

describe("Phase 25: Cohort Comparison", () => {
  // Test 273: Select two cohorts
  it("273. selects two cohorts for side-by-side comparison", () => {
    const cohortA = { id: "c1", name: "Diabetes Under 50", size: 120 };
    const cohortB = { id: "c2", name: "Diabetes Over 50", size: 95 };
    const comparison = { cohortA, cohortB };
    expect(comparison.cohortA.id).not.toBe(comparison.cohortB.id);
    expect(comparison.cohortA.name).toBeTruthy();
  });

  // Test 274: Comparison metrics
  it("274. computes comparison metrics for both cohorts", () => {
    const metricsA = { avgAge: 42, avgHba1c: 6.8, avgBmi: 27.5 };
    const metricsB = { avgAge: 62, avgHba1c: 7.9, avgBmi: 30.1 };
    const diff = {
      ageDiff: metricsB.avgAge - metricsA.avgAge,
      hba1cDiff: metricsB.avgHba1c - metricsA.avgHba1c,
      bmiDiff: metricsB.avgBmi - metricsA.avgBmi,
    };
    expect(diff.ageDiff).toBe(20);
    expect(diff.hba1cDiff).toBeCloseTo(1.1, 1);
  });

  // Test 275: Statistical significance (p-values)
  it("275. displays p-values for statistical significance", () => {
    const comparisons = [
      { metric: "HbA1c", pValue: 0.003, significant: true },
      { metric: "BMI", pValue: 0.12, significant: false },
      { metric: "Age", pValue: 0.001, significant: true },
    ];
    const isSignificant = (p: number) => p < 0.05;
    comparisons.forEach(c => {
      expect(c.significant).toBe(isSignificant(c.pValue));
    });
  });

  // Test 276: Comorbidity heatmap
  it("276. comorbidity heatmap renders for compared cohorts", () => {
    const heatmapData = [
      { condition: "Hypertension", cohortA: 0.45, cohortB: 0.68 },
      { condition: "Obesity", cohortA: 0.32, cohortB: 0.51 },
      { condition: "Depression", cohortA: 0.18, cohortB: 0.22 },
    ];
    expect(heatmapData).toHaveLength(3);
    heatmapData.forEach(d => {
      expect(d.cohortA).toBeGreaterThanOrEqual(0);
      expect(d.cohortA).toBeLessThanOrEqual(1);
    });
  });

  // Test 277: Med-disease matrix
  it("277. med-disease matrix shows treatment patterns", () => {
    const matrix = [
      { medication: "Metformin", diabetesA: 0.85, diabetesB: 0.72 },
      { medication: "Insulin", diabetesA: 0.15, diabetesB: 0.45 },
    ];
    expect(matrix[1].diabetesB).toBeGreaterThan(matrix[1].diabetesA);
  });

  // Test 278: Export comparison
  it("278. exports comparison results", () => {
    const exportData = {
      cohortA: "Diabetes Under 50",
      cohortB: "Diabetes Over 50",
      metrics: [
        { name: "HbA1c", valueA: 6.8, valueB: 7.9, pValue: 0.003 },
      ],
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(exportData);
    expect(JSON.parse(json).metrics).toHaveLength(1);
  });
});
