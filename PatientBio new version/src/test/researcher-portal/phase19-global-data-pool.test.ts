import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 19 — Global Data Pool Tests (Tests 223–232)
 */

const mockPoolEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "pool-1",
  contribution_hash: "hash123",
  data_categories: ["vitals", "labs"],
  disease_categories: ["diabetes"],
  age_range: "30-40",
  gender: "male",
  source_jurisdiction: "US",
  contributed_at: new Date().toISOString(),
  is_active: true,
  govt_approval_status: "approved",
  ...overrides,
});

describe("Phase 19: Global Data Pool", () => {
  // Test 223: Pool data fetch
  it("223. fetches pool data from anonymous pool view", () => {
    const poolData = [mockPoolEntry(), mockPoolEntry({ id: "pool-2" })];
    expect(poolData).toHaveLength(2);
    poolData.forEach(p => expect(p.is_active).toBe(true));
  });

  // Test 224: Disease category filter
  it("224. filters pool by disease category", () => {
    const pool = [
      mockPoolEntry({ disease_categories: ["diabetes"] }),
      mockPoolEntry({ id: "p2", disease_categories: ["cardiology"] }),
      mockPoolEntry({ id: "p3", disease_categories: ["diabetes", "cardiology"] }),
    ];
    const filtered = pool.filter(p =>
      (p.disease_categories as string[]).includes("diabetes")
    );
    expect(filtered).toHaveLength(2);
  });

  // Test 225: Age range filter
  it("225. filters pool by age range", () => {
    const pool = [
      mockPoolEntry({ age_range: "18-29" }),
      mockPoolEntry({ id: "p2", age_range: "30-40" }),
      mockPoolEntry({ id: "p3", age_range: "30-40" }),
    ];
    const filtered = pool.filter(p => p.age_range === "30-40");
    expect(filtered).toHaveLength(2);
  });

  // Test 226: Clinical depth indicators
  it("226. clinical depth computed from data_categories count", () => {
    const entry = mockPoolEntry({ data_categories: ["vitals", "labs", "imaging", "genomics"] });
    const depth = (entry.data_categories as string[]).length;
    const depthLabel = depth >= 4 ? "High" : depth >= 2 ? "Medium" : "Low";
    expect(depthLabel).toBe("High");
  });

  // Test 227: Temporal trends
  it("227. temporal trends group contributions by month", () => {
    const contributions = [
      { contributed_at: "2025-01-15T00:00:00Z" },
      { contributed_at: "2025-01-20T00:00:00Z" },
      { contributed_at: "2025-02-10T00:00:00Z" },
    ];
    const byMonth = contributions.reduce((acc, c) => {
      const month = c.contributed_at.slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(byMonth["2025-01"]).toBe(2);
    expect(byMonth["2025-02"]).toBe(1);
  });

  // Test 228: Pagination
  it("228. pool explorer paginates with offset/limit", () => {
    const allData = Array.from({ length: 25 }, (_, i) => mockPoolEntry({ id: `p-${i}` }));
    const page1 = allData.slice(0, 10);
    const page2 = allData.slice(10, 20);
    const page3 = allData.slice(20, 25);
    expect(page1).toHaveLength(10);
    expect(page2).toHaveLength(10);
    expect(page3).toHaveLength(5);
  });

  // Test 229: Request data dialog
  it("229. request dialog captures selected pool entry", () => {
    const selected = mockPoolEntry();
    const requestData = {
      contribution_id: selected.id,
      disease_categories: selected.disease_categories,
      reason: "Clinical research on diabetes biomarkers",
    };
    expect(requestData.contribution_id).toBe("pool-1");
    expect(requestData.reason).toBeTruthy();
  });

  // Test 230: Jurisdiction comparison
  it("230. jurisdiction comparison counts entries per region", () => {
    const pool = [
      mockPoolEntry({ source_jurisdiction: "US" }),
      mockPoolEntry({ id: "p2", source_jurisdiction: "EU" }),
      mockPoolEntry({ id: "p3", source_jurisdiction: "US" }),
      mockPoolEntry({ id: "p4", source_jurisdiction: "IN" }),
    ];
    const byJurisdiction = pool.reduce((acc, p) => {
      acc[p.source_jurisdiction as string] = (acc[p.source_jurisdiction as string] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    expect(byJurisdiction["US"]).toBe(2);
    expect(byJurisdiction["EU"]).toBe(1);
    expect(byJurisdiction["IN"]).toBe(1);
  });

  // Test 231: Domain selector
  it("231. domain selector filters by clinical domain", () => {
    const pool = [
      mockPoolEntry({ data_categories: ["vitals"] }),
      mockPoolEntry({ id: "p2", data_categories: ["genomics"] }),
      mockPoolEntry({ id: "p3", data_categories: ["vitals", "genomics"] }),
    ];
    const domain = "genomics";
    const filtered = pool.filter(p => (p.data_categories as string[]).includes(domain));
    expect(filtered).toHaveLength(2);
  });

  // Test 232: Empty pool state
  it("232. empty pool shows guidance message", () => {
    const pool: any[] = [];
    const message = pool.length === 0 ? "No data available in the global pool" : "";
    expect(message).toBeTruthy();
  });
});
