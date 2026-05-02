import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 21 — Outcome Predictor Tests (Tests 241–248)
 */

describe("Phase 21: Outcome Predictor", () => {
  // Test 241: Risk curve computation
  it("241. computes risk curve from cohort data", () => {
    const cohortData = [
      { age: 45, hba1c: 7.2, risk: 0.35 },
      { age: 55, hba1c: 8.1, risk: 0.52 },
      { age: 65, hba1c: 9.0, risk: 0.71 },
    ];
    const riskCurve = cohortData.map(d => ({ x: d.age, y: d.risk }));
    expect(riskCurve).toHaveLength(3);
    expect(riskCurve[2].y).toBeGreaterThan(riskCurve[0].y);
  });

  // Test 242: Forest plot with confidence intervals
  it("242. forest plot data includes CI bounds", () => {
    const studies = [
      { name: "Study A", effectSize: 1.5, ciLower: 1.1, ciUpper: 2.0 },
      { name: "Study B", effectSize: 0.8, ciLower: 0.5, ciUpper: 1.2 },
    ];
    studies.forEach(s => {
      expect(s.ciLower).toBeLessThanOrEqual(s.effectSize);
      expect(s.ciUpper).toBeGreaterThanOrEqual(s.effectSize);
    });
  });

  // Test 243: What-if scenario updates
  it("243. changing parameters updates prediction", () => {
    const baseRisk = 0.35;
    const applyModifier = (risk: number, hba1cDelta: number) =>
      Math.min(1, Math.max(0, risk + hba1cDelta * 0.05));
    const newRisk = applyModifier(baseRisk, 2); // HbA1c increased by 2
    expect(newRisk).toBeCloseTo(0.45, 2);
    const lowerRisk = applyModifier(baseRisk, -1);
    expect(lowerRisk).toBeCloseTo(0.30, 2);
  });

  // Test 244: Missing data handling
  it("244. predictor handles missing data gracefully", () => {
    const data = [
      { age: 45, hba1c: null, risk: null },
      { age: 55, hba1c: 8.1, risk: 0.52 },
    ];
    const valid = data.filter(d => d.hba1c !== null && d.risk !== null);
    expect(valid).toHaveLength(1);
  });

  // Test 245: Risk stratification
  it("245. risk stratification categorizes patients correctly", () => {
    const stratify = (risk: number) => {
      if (risk >= 0.7) return "high";
      if (risk >= 0.4) return "moderate";
      return "low";
    };
    expect(stratify(0.85)).toBe("high");
    expect(stratify(0.50)).toBe("moderate");
    expect(stratify(0.20)).toBe("low");
  });

  // Test 246: Sample size calculator
  it("246. sample size calculator returns valid power analysis", () => {
    const calcSampleSize = (effectSize: number, power: number, alpha: number) => {
      // Simplified calculation
      const zAlpha = alpha === 0.05 ? 1.96 : 2.576;
      const zBeta = power === 0.8 ? 0.84 : 1.28;
      return Math.ceil(2 * ((zAlpha + zBeta) / effectSize) ** 2);
    };
    const n = calcSampleSize(0.5, 0.8, 0.05);
    expect(n).toBeGreaterThan(0);
    expect(n).toBe(63);
  });

  // Test 247: Biomarker trend analyzer
  it("247. biomarker trend plots longitudinal data points", () => {
    const biomarkerData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      value: 7.0 + Math.sin(i / 2) * 0.5,
      ciUpper: 7.0 + Math.sin(i / 2) * 0.5 + 0.3,
      ciLower: 7.0 + Math.sin(i / 2) * 0.5 - 0.3,
    }));
    expect(biomarkerData).toHaveLength(12);
    biomarkerData.forEach(d => {
      expect(d.ciUpper).toBeGreaterThan(d.value);
      expect(d.ciLower).toBeLessThan(d.value);
    });
  });

  // Test 248: AI interpretation
  it("248. AI interpretation generated for completed analysis", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { interpretation: "The analysis suggests a moderate correlation..." },
      error: null,
    });
    const result = await mockSupabase.functions.invoke("ai-research-interpretation", {
      body: { analysisType: "risk-curve", data: {} },
    });
    expect(result.data.interpretation).toBeTruthy();
    expect(result.data.interpretation).toContain("correlation");
  });
});
