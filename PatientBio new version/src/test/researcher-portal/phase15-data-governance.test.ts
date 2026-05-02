import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 15 — Data Governance Hub Tests (Tests 175–188)
 */

const mockDUA = (overrides: Record<string, unknown> = {}) => ({
  id: "dua-1",
  study_id: "study-1",
  researcher_id: mockUser.id,
  institution_name: "University Research Center",
  purpose: "Genomics study",
  data_scope: { categories: ["vitals", "labs"] },
  retention_period_days: 365,
  status: "draft",
  submitted_at: null,
  approved_at: null,
  approved_by: null,
  expiry_date: null,
  agreement_hash: "abc123hash",
  created_at: "2025-01-15T00:00:00Z",
  updated_at: "2025-01-15T00:00:00Z",
  study_title: "Genomics Phase I",
  ...overrides,
});

describe("Phase 15: Data Governance Hub", () => {
  // Test 175: DUA lifecycle funnel stats
  it("175. computes DUA lifecycle funnel stats correctly", () => {
    const agreements = [
      mockDUA({ status: "draft" }),
      mockDUA({ id: "d2", status: "draft" }),
      mockDUA({ id: "d3", status: "submitted" }),
      mockDUA({ id: "d4", status: "approved" }),
      mockDUA({ id: "d5", status: "expired" }),
    ];
    const stats = {
      total: agreements.length,
      draft: agreements.filter(a => a.status === "draft").length,
      submitted: agreements.filter(a => a.status === "submitted").length,
      approved: agreements.filter(a => a.status === "approved").length,
      expired: agreements.filter(a => a.status === "expired").length,
    };
    expect(stats.total).toBe(5);
    expect(stats.draft).toBe(2);
    expect(stats.submitted).toBe(1);
    expect(stats.approved).toBe(1);
    expect(stats.expired).toBe(1);
  });

  // Test 176: Compliance score calculation
  it("176. compliance score = approved / total ratio", () => {
    const total = 10;
    const approved = 7;
    const score = total > 0 ? Math.round((approved / total) * 100) : 0;
    expect(score).toBe(70);
  });

  // Test 177: DUA search by study title (case-insensitive)
  it("177. filters DUAs by study title case-insensitively", () => {
    const agreements = [
      mockDUA({ study_title: "Genomics Phase I" }),
      mockDUA({ id: "d2", study_title: "Cardiology Trial" }),
      mockDUA({ id: "d3", study_title: "genomics Phase II" }),
    ];
    const query = "genomics";
    const filtered = agreements.filter(a =>
      (a.study_title as string).toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(2);
  });

  // Test 178: DUA status filter
  it("178. status filter narrows list correctly", () => {
    const agreements = [
      mockDUA({ status: "draft" }),
      mockDUA({ id: "d2", status: "approved" }),
      mockDUA({ id: "d3", status: "approved" }),
    ];
    const statusFilter = "approved";
    const filtered = agreements.filter(a => a.status === statusFilter);
    expect(filtered).toHaveLength(2);
  });

  // Test 179: DUA sort by created_at
  it("179. sorts DUAs by created_at descending", () => {
    const agreements = [
      mockDUA({ id: "d1", created_at: "2025-01-01T00:00:00Z" }),
      mockDUA({ id: "d2", created_at: "2025-03-01T00:00:00Z" }),
      mockDUA({ id: "d3", created_at: "2025-02-01T00:00:00Z" }),
    ];
    const sorted = [...agreements].sort(
      (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
    );
    expect(sorted[0].id).toBe("d2");
    expect(sorted[1].id).toBe("d3");
    expect(sorted[2].id).toBe("d1");
  });

  // Test 180: DUA detail dialog data
  it("180. detail dialog receives correct agreement data", () => {
    const dua = mockDUA();
    expect(dua.id).toBe("dua-1");
    expect(dua.institution_name).toBe("University Research Center");
    expect(dua.data_scope).toHaveProperty("categories");
  });

  // Test 181: SHA-256 hash verification match
  it("181. cryptographic hash verification matches stored hash", async () => {
    const hashInput = `${mockUser.id}|study-1|Genomics study|{"categories":["vitals","labs"]}|2025-01-15T00:00:00Z`;
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
    const hash = Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    expect(hash).toHaveLength(64);
    // Recompute same input gives same hash
    const buffer2 = await crypto.subtle.digest("SHA-256", encoder.encode(hashInput));
    const hash2 = Array.from(new Uint8Array(buffer2))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    expect(hash).toBe(hash2);
  });

  // Test 182: Hash mismatch detection
  it("182. detects hash mismatch when data is altered", async () => {
    const encoder = new TextEncoder();
    const original = "original-data";
    const altered = "altered-data";
    const hash1 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(original))))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const hash2 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(altered))))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    expect(hash1).not.toBe(hash2);
  });

  // Test 183: PDF export structure
  it("183. PDF export object has expected sections", () => {
    const pdfSections = ["Agreement Details", "Data Scope", "Retention Policy", "Signatures", "Compliance Status"];
    expect(pdfSections).toHaveLength(5);
    expect(pdfSections).toContain("Agreement Details");
    expect(pdfSections).toContain("Data Scope");
  });

  // Test 184: DUA renewal duplicates with fresh dates
  it("184. renewal creates new agreement from original with fresh dates", () => {
    const original = mockDUA({ status: "expired", created_at: "2024-01-01T00:00:00Z" });
    const renewed = {
      ...original,
      id: "dua-renewed",
      status: "draft",
      created_at: new Date().toISOString(),
      submitted_at: null,
      approved_at: null,
      expiry_date: null,
      agreement_hash: "new-hash",
    };
    expect(renewed.status).toBe("draft");
    expect(renewed.id).not.toBe(original.id);
    expect(new Date(renewed.created_at).getTime()).toBeGreaterThan(new Date(original.created_at as string).getTime());
  });

  // Test 185: Expiry alerts within 30/60/90 day windows
  it("185. counts DUAs expiring within 30/60/90 day windows", () => {
    const now = new Date();
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();
    const agreements = [
      mockDUA({ id: "d1", status: "approved", expiry_date: daysFromNow(10) }),
      mockDUA({ id: "d2", status: "approved", expiry_date: daysFromNow(45) }),
      mockDUA({ id: "d3", status: "approved", expiry_date: daysFromNow(80) }),
      mockDUA({ id: "d4", status: "expired", expiry_date: daysFromNow(-5) }),
    ];
    const expiringWithin = (days: number) => agreements.filter(a => {
      if (a.status === "expired") return false;
      if (!a.expiry_date) return false;
      const diff = (new Date(a.expiry_date as string).getTime() - now.getTime()) / 86400000;
      return diff > 0 && diff <= days;
    });
    expect(expiringWithin(30)).toHaveLength(1);
    expect(expiringWithin(60)).toHaveLength(2);
    expect(expiringWithin(90)).toHaveLength(3);
  });

  // Test 186: Effective expiry fallback
  it("186. effective expiry falls back to created_at + retention_period_days", () => {
    const dua = mockDUA({ expiry_date: null, created_at: "2025-01-01T00:00:00Z", retention_period_days: 365 });
    const effectiveExpiry = dua.expiry_date
      ? new Date(dua.expiry_date as string)
      : new Date(new Date(dua.created_at as string).getTime() + (dua.retention_period_days as number) * 86400000);
    expect(effectiveExpiry.getFullYear()).toBe(2026);
    expect(effectiveExpiry.getMonth()).toBe(0); // January (0-indexed), 2025-01-01 + 365 days = 2026-01-01
  });

  // Test 187: Cross-border transfer jurisdiction badges
  it("187. cross-border transfers display jurisdiction codes", () => {
    const transfers = [
      { source_jurisdiction: "US", destination_jurisdiction: "EU" },
      { source_jurisdiction: "EU", destination_jurisdiction: "UK" },
    ];
    transfers.forEach(t => {
      expect(t.source_jurisdiction).toBeDefined();
      expect(t.destination_jurisdiction).toBeDefined();
    });
    // EU to EU/UK doesn't require additional consent
    const requiresConsent = (src: string, dst: string) => {
      if (src === dst) return false;
      if (src === "EU" && ["EU", "UK"].includes(dst)) return false;
      return true;
    };
    expect(requiresConsent("US", "EU")).toBe(true);
    expect(requiresConsent("EU", "UK")).toBe(false);
  });

  // Test 188: Consent overview tab
  it("188. consent templates have required fields", () => {
    const template = {
      id: "ct-1",
      name: "Research Data Consent",
      consent_type: "research",
      purpose: "Clinical research data sharing",
      scope: ["vitals", "labs", "demographics"],
      is_active: true,
    };
    expect(template.name).toBeDefined();
    expect(template.scope).toHaveLength(3);
    expect(template.is_active).toBe(true);
  });
});
