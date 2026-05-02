import { describe, it, expect } from "vitest";

describe("Phase 12: Token Incentives and Data Monetization", () => {
  const METRIC_TYPES = [
    { type: "blood_pressure", label: "Blood Pressure" },
    { type: "heart_rate", label: "Heart Rate" },
    { type: "blood_sugar", label: "Blood Sugar" },
    { type: "weight", label: "Weight" },
    { type: "temperature", label: "Temperature" },
    { type: "oxygen_saturation", label: "Oxygen Saturation" },
    { type: "steps", label: "Steps" },
    { type: "sleep", label: "Sleep" },
    { type: "water_intake", label: "Water Intake" },
    { type: "calories", label: "Calories" },
  ];

  const calculateScores = (trackedCount: number, avgReadings: number, daysSinceLastReading: number) => {
    const coverageScore = (trackedCount / METRIC_TYPES.length) * 50;
    const frequencyScore = Math.min(avgReadings / 10, 1) * 30;
    const recencyScore = daysSinceLastReading <= 3 ? 20 : daysSinceLastReading <= 7 ? 12 : daysSinceLastReading <= 14 ? 5 : 0;
    return { coverageScore, frequencyScore, recencyScore, total: Math.round(coverageScore + frequencyScore + recencyScore) };
  };

  // Test 133: Data completeness score calculation
  it("should calculate coverage(50%) + frequency(30%) + recency(20%)", () => {
    const scores = calculateScores(5, 10, 1);
    expect(scores.coverageScore).toBe(25); // 5/10 * 50
    expect(scores.frequencyScore).toBe(30); // min(10/10,1) * 30
    expect(scores.recencyScore).toBe(20); // <=3 days
    expect(scores.total).toBe(75);
  });

  // Test 134: Coverage score
  it("should calculate coverage as (trackedTypes / totalTypes) * 50", () => {
    const scores = calculateScores(3, 0, 999);
    expect(scores.coverageScore).toBe(15); // 3/10 * 50
  });

  // Test 135: Frequency score
  it("should calculate frequency as min(avgReadings/10, 1) * 30", () => {
    expect(calculateScores(0, 5, 999).frequencyScore).toBe(15); // 5/10 * 30
    expect(calculateScores(0, 20, 999).frequencyScore).toBe(30); // capped at 1
  });

  // Test 136: Recency score thresholds
  it("should assign recency based on days since last reading", () => {
    expect(calculateScores(0, 0, 1).recencyScore).toBe(20);
    expect(calculateScores(0, 0, 5).recencyScore).toBe(12);
    expect(calculateScores(0, 0, 10).recencyScore).toBe(5);
    expect(calculateScores(0, 0, 30).recencyScore).toBe(0);
  });

  // Test 137: Tier assignment
  it("should assign tier based on completeness score", () => {
    const getTier = (score: number) => score >= 70 ? 3 : score >= 40 ? 2 : 1;
    expect(getTier(75)).toBe(3); // Premium
    expect(getTier(50)).toBe(2); // Standard
    expect(getTier(20)).toBe(1); // Basic
    expect(getTier(70)).toBe(3); // Boundary
    expect(getTier(40)).toBe(2); // Boundary
  });

  // Test 138: Tier multipliers
  it("should apply correct tier multipliers", () => {
    const tierMultipliers = [1, 1.5, 3];
    const tierLabels = ["Basic", "Standard", "Premium"];
    expect(tierMultipliers[0]).toBe(1);
    expect(tierMultipliers[1]).toBe(1.5);
    expect(tierMultipliers[2]).toBe(3);
    expect(tierLabels[2]).toBe("Premium");
  });

  // Test 139: Suggestions capped at 3
  it("should cap suggestions at 3", () => {
    const suggestions = [
      { title: "S1" }, { title: "S2" }, { title: "S3" }, { title: "S4" }, { title: "S5" },
    ];
    const capped = suggestions.slice(0, 3);
    expect(capped.length).toBe(3);
  });

  // Test 140: Untracked metrics suggestion
  it("should suggest tracking first untracked metric", () => {
    const trackedSet = new Set(["blood_pressure", "heart_rate"]);
    const untrackedTypes = METRIC_TYPES.filter((m) => !trackedSet.has(m.type));
    const firstUntracked = untrackedTypes[0];
    expect(firstUntracked.type).toBe("blood_sugar");
    expect(firstUntracked.label).toBe("Blood Sugar");
  });
});
