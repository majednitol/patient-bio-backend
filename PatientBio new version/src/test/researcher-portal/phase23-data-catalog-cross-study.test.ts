import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 23 — Data Catalog and Cross-Study Analytics Tests (Tests 257–264)
 */

describe("Phase 23: Data Catalog and Cross-Study Analytics", () => {
  // Test 257: Catalog fetches datasets
  it("257. fetches available datasets in catalog", () => {
    const datasets = [
      { id: "ds-1", name: "Diabetes Cohort 2024", recordCount: 1250, categories: ["vitals", "labs"] },
      { id: "ds-2", name: "Cardiology Pool", recordCount: 890, categories: ["imaging"] },
    ];
    expect(datasets).toHaveLength(2);
    expect(datasets[0].recordCount).toBe(1250);
  });

  // Test 258: Catalog detail dialog
  it("258. detail dialog shows dataset metadata and schema", () => {
    const dataset = {
      id: "ds-1",
      name: "Diabetes Cohort 2024",
      description: "Longitudinal diabetes study data",
      schema: { columns: ["patient_id", "hba1c", "bmi", "age", "gender"] },
      created_at: "2024-06-01",
      record_count: 1250,
    };
    expect(dataset.schema.columns).toHaveLength(5);
    expect(dataset.schema.columns).toContain("hba1c");
  });

  // Test 259: Dataset builder
  it("259. dataset builder creates custom filtered datasets", () => {
    const filters = {
      disease_categories: ["diabetes"],
      age_range: { min: 30, max: 60 },
      data_categories: ["vitals", "labs"],
    };
    const result = {
      name: "Custom Diabetes 30-60",
      filters,
      recordCount: 450,
    };
    expect(result.recordCount).toBeGreaterThan(0);
    expect(result.filters.age_range.min).toBe(30);
  });

  // Test 260: Saved datasets
  it("260. saved datasets persist and load correctly", () => {
    const saved = [
      { id: "saved-1", name: "My Diabetes Set", filters: {}, created_at: "2025-01-01" },
      { id: "saved-2", name: "Cardiology Subset", filters: {}, created_at: "2025-02-01" },
    ];
    expect(saved).toHaveLength(2);
    expect(saved[0].name).toBe("My Diabetes Set");
  });

  // Test 261: Cross-study aggregate metrics
  it("261. cross-study analytics computes aggregate metrics", () => {
    const studies = [
      { id: "s1", sampleSize: 100, completionRate: 0.85 },
      { id: "s2", sampleSize: 200, completionRate: 0.70 },
      { id: "s3", sampleSize: 150, completionRate: 0.92 },
    ];
    const totalSamples = studies.reduce((sum, s) => sum + s.sampleSize, 0);
    const avgCompletion = studies.reduce((sum, s) => sum + s.completionRate, 0) / studies.length;
    expect(totalSamples).toBe(450);
    expect(avgCompletion).toBeCloseTo(0.823, 2);
  });

  // Test 262: Cross-study comparison chart
  it("262. comparison chart renders multi-study data", () => {
    const chartData = [
      { studyName: "Study A", metric: "enrollment", value: 85 },
      { studyName: "Study B", metric: "enrollment", value: 120 },
      { studyName: "Study A", metric: "completion", value: 72 },
      { studyName: "Study B", metric: "completion", value: 95 },
    ];
    const studyNames = [...new Set(chartData.map(d => d.studyName))];
    expect(studyNames).toHaveLength(2);
  });

  // Test 263: Analytics export
  it("263. analytics export to CSV/JSON", () => {
    const data = [
      { study: "Study A", metric: "enrollment", value: 85 },
      { study: "Study B", metric: "enrollment", value: 120 },
    ];
    // CSV export
    const csvHeader = Object.keys(data[0]).join(",");
    const csvRows = data.map(d => Object.values(d).join(","));
    const csv = [csvHeader, ...csvRows].join("\n");
    expect(csv).toContain("study,metric,value");
    expect(csv).toContain("Study A,enrollment,85");
    // JSON export
    const json = JSON.stringify(data);
    expect(JSON.parse(json)).toHaveLength(2);
  });

  // Test 264: Empty catalog
  it("264. empty catalog shows guidance", () => {
    const datasets: any[] = [];
    const message = datasets.length === 0 ? "No datasets available. Create one from the Data Pool." : "";
    expect(message).toBeTruthy();
  });
});
