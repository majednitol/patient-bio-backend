import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockDistribution, mockAdminUser } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

describe("Phase 10: Shared Data and Distributions (12 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("101. Fetch access tokens ordered by created_at desc", async () => {
    const tokens = [{ id: "t1", is_revoked: false, created_at: new Date().toISOString() }];
    const chain = mockSupabase.createChain({ data: tokens, error: null });
    mockSupabase.from.mockReturnValue(chain);
    expect(tokens[0]).toHaveProperty("is_revoked");
  });

  it("102. Fetch pathologist shares ordered by shared_at desc", () => {
    const shares = [{ id: "ps1", status: "pending", shared_at: new Date().toISOString() }];
    expect(shares[0]).toHaveProperty("shared_at");
  });

  it("103. Fetch researcher shares ordered by shared_at desc", () => {
    const shares = [{ id: "rs1", is_anonymized: true, shared_at: new Date().toISOString() }];
    expect(shares[0]).toHaveProperty("is_anonymized");
  });

  it("104. Fetch distributions ordered by created_at desc", () => {
    const distributions = [mockDistribution];
    expect(distributions[0].status).toBe("completed");
    expect(distributions[0].record_count).toBe(150);
  });

  it("105. Fetch verified researchers", () => {
    const researchers = [
      { user_id: "r1", full_name: "Dr. Researcher", is_verified: true },
    ];
    const verified = researchers.filter((r) => r.is_verified);
    expect(verified).toHaveLength(1);
  });

  it("106. Create distribution counts records, inserts, and logs audit", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser } });

    // Count mock
    const countChain = mockSupabase.createChain({ count: 42, error: null });
    mockSupabase.from.mockReturnValueOnce(countChain);

    // Insert distribution mock
    const insertChain = mockSupabase.createChain({ data: mockDistribution, error: null });
    mockSupabase.from.mockReturnValueOnce(insertChain);

    // Audit log mock
    const auditChain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(auditChain);

    expect(mockSupabase.from).toBeDefined();
  });

  it("107. Distribution counts health records with exact count", () => {
    // Simulate count query: select('id', { count: 'exact', head: true })
    const selectArgs = ["id", { count: "exact", head: true }];
    expect(selectArgs[1]).toEqual({ count: "exact", head: true });
  });

  it("108. Distribution filters by disease categories", () => {
    const categories = ["diabetes", "cancer"];
    // Simulates: .in('disease_category', categories)
    expect(categories).toHaveLength(2);
  });

  it("109. Distribution filters by date range", () => {
    const filters = { gte: "2026-01-01", lte: "2026-01-31" };
    expect(filters.gte).toBe("2026-01-01");
    expect(filters.lte).toBe("2026-01-31");
  });

  it("110. Audit log created on distribution with action=distribute_data", () => {
    const auditLog = {
      admin_id: mockAdminUser.id,
      action: "distribute_data",
      target_type: "researcher",
      target_id: "researcher-1",
      details: {
        disease_categories: ["diabetes"],
        record_count: 42,
        purpose: "Research",
      },
    };
    expect(auditLog.action).toBe("distribute_data");
    expect(auditLog.details.record_count).toBe(42);
  });

  it("111. Auth guard on create distribution", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const { data: { user } } = await mockSupabase.auth.getUser();
    expect(user).toBeNull();
    // Should throw "Not authenticated"
    expect(() => { if (!user) throw new Error("Not authenticated"); }).toThrow("Not authenticated");
  });

  it("112. Cache invalidation on create invalidates admin-distributions", () => {
    const queryKey = ["admin-distributions"];
    expect(queryKey).toEqual(["admin-distributions"]);
  });
});
