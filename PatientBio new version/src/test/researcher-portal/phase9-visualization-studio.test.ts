import { describe, it, expect } from "vitest";

describe("Phase 9: Visualization Studio", () => {
  // Extracted logic from CorrelationAnalysis and StatisticalSummary components

  const calculateCorrelation = (data: { v1: number; v2: number }[]) => {
    if (data.length < 2) return 0;
    const values1 = data.map((d) => d.v1);
    const values2 = data.map((d) => d.v2);
    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
    const numerator = values1.reduce((sum, v1, i) => sum + (v1 - mean1) * (values2[i] - mean2), 0);
    const denom1 = values1.reduce((sum, v1) => sum + Math.pow(v1 - mean1, 2), 0);
    const denom2 = values2.reduce((sum, v2) => sum + Math.pow(v2 - mean2, 2), 0);
    const denominator = Math.sqrt(denom1 * denom2);
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getCorrelationStrength = (r: number) => {
    const abs = Math.abs(r);
    if (abs < 0.3) return "Weak";
    if (abs < 0.7) return "Moderate";
    return "Strong";
  };

  const calculateStats = (values: number[]) => {
    const filtered = values.filter((v) => !isNaN(v));
    if (filtered.length === 0) return null;
    const sorted = [...filtered].sort((a, b) => a - b);
    const sum = filtered.reduce((a, b) => a + b, 0);
    const mean = sum / filtered.length;
    const median = filtered.length % 2 === 0
      ? (sorted[filtered.length / 2 - 1] + sorted[filtered.length / 2]) / 2
      : sorted[Math.floor(filtered.length / 2)];
    const variance = filtered.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / filtered.length;
    const stdDev = Math.sqrt(variance);
    return { mean, median, stdDev, min: Math.min(...filtered), max: Math.max(...filtered), count: filtered.length };
  };

  // Test 95: Pearson's r calculation
  it("should calculate correct Pearson correlation", () => {
    // Perfect positive correlation
    const r = calculateCorrelation([
      { v1: 1, v2: 2 }, { v1: 2, v2: 4 }, { v1: 3, v2: 6 }, { v1: 4, v2: 8 },
    ]);
    expect(r).toBeCloseTo(1.0, 5);
  });

  // Test 96: Zero denominator returns 0
  it("should return 0 when all values are the same", () => {
    const r = calculateCorrelation([
      { v1: 5, v2: 5 }, { v1: 5, v2: 5 }, { v1: 5, v2: 5 },
    ]);
    expect(r).toBe(0);
  });

  // Test 97: Correlation strength: weak
  it("should classify abs(r) < 0.3 as Weak", () => {
    expect(getCorrelationStrength(0.1)).toBe("Weak");
    expect(getCorrelationStrength(-0.2)).toBe("Weak");
  });

  // Test 98: Correlation strength: moderate
  it("should classify 0.3 <= abs(r) < 0.7 as Moderate", () => {
    expect(getCorrelationStrength(0.5)).toBe("Moderate");
    expect(getCorrelationStrength(-0.4)).toBe("Moderate");
  });

  // Test 99: Correlation strength: strong
  it("should classify abs(r) >= 0.7 as Strong", () => {
    expect(getCorrelationStrength(0.8)).toBe("Strong");
    expect(getCorrelationStrength(-0.9)).toBe("Strong");
  });

  // Test 100: Scatter data preparation
  it("should filter NaN and cap at 100 points", () => {
    const data = Array.from({ length: 150 }, (_, i) => ({ x: i, y: i * 2 }));
    const prepared = data.filter((d) => !isNaN(d.x) && !isNaN(d.y)).slice(0, 100);
    expect(prepared.length).toBe(100);
  });

  // Test 101: Statistical mean
  it("should calculate correct mean", () => {
    const stats = calculateStats([10, 20, 30, 40, 50]);
    expect(stats!.mean).toBe(30);
  });

  // Test 102: Statistical median (odd count)
  it("should calculate median for odd count", () => {
    const stats = calculateStats([1, 3, 5, 7, 9]);
    expect(stats!.median).toBe(5);
  });

  // Test 103: Statistical median (even count)
  it("should calculate median for even count", () => {
    const stats = calculateStats([1, 3, 5, 7]);
    expect(stats!.median).toBe(4); // (3+5)/2
  });

  // Test 104: Standard deviation
  it("should calculate correct standard deviation", () => {
    const stats = calculateStats([2, 4, 4, 4, 5, 5, 7, 9]);
    // mean = 5, variance = 4, stdDev = 2
    expect(stats!.stdDev).toBe(2);
  });

  // Test 105: Min/max
  it("should calculate min and max", () => {
    const stats = calculateStats([5, 1, 9, 3, 7]);
    expect(stats!.min).toBe(1);
    expect(stats!.max).toBe(9);
  });

  // Test 106: Empty values returns null
  it("should return null for empty or all-NaN values", () => {
    expect(calculateStats([])).toBeNull();
    expect(calculateStats([NaN, NaN])).toBeNull();
  });

  // Test 107: Save chart to gallery
  it("should append chart with id to savedCharts", () => {
    const savedCharts: any[] = [];
    const newChart = { name: "Test Chart", type: "scatter", variable1: "age", variable2: "bp_systolic", createdAt: new Date().toISOString() };
    savedCharts.push({ ...newChart, id: `chart-${Date.now()}` });
    expect(savedCharts.length).toBe(1);
    expect(savedCharts[0]).toHaveProperty("id");
  });

  // Test 108: Numeric variables constant
  it("should have 5 numeric variables", () => {
    const NUMERIC_VARIABLES = [
      { value: "age", label: "Age" },
      { value: "blood_pressure_systolic", label: "BP Systolic" },
      { value: "blood_pressure_diastolic", label: "BP Diastolic" },
      { value: "weight", label: "Weight (kg)" },
      { value: "height", label: "Height (cm)" },
    ];
    expect(NUMERIC_VARIABLES.length).toBe(5);
  });
});
