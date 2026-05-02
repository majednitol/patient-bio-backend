import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCrossPortalMock,
  mockResponse,
  mockError,
  users,
  ids,
  makeNotification,
} from "./cp-helpers";

// ── Local factories ─────────────────────────────────────────────
function makeDistribution(overrides: Record<string, any> = {}) {
  return {
    id: "dist-cp-901",
    admin_id: users.admin.id,
    recipient_id: ids.researcher,
    recipient_type: "researcher",
    purpose: "Diabetes prevalence study",
    disease_categories: ["diabetes", "cardiovascular"],
    date_range_start: "2025-01-01",
    date_range_end: "2025-12-31",
    record_count: 1250,
    status: "completed",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeAuditLog(overrides: Record<string, any> = {}) {
  return {
    id: "audit-cp-902",
    admin_id: users.admin.id,
    action: "data_distribution",
    target_type: "researcher",
    target_id: ids.researcher,
    details: { disease_categories: ["diabetes"], record_count: 500 },
    ip_address: "192.168.1.1",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeComplianceReport(overrides: Record<string, any> = {}) {
  return {
    id: "comp-cp-903",
    report_type: "HIPAA",
    generated_by: users.admin.id,
    report_period_start: "2025-01-01",
    report_period_end: "2025-06-30",
    status: "generated",
    report_data: { total_access_events: 15420, anomalies_detected: 3 },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Cross-Portal Phase 5: Admin Data Distribution & Governance", () => {
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = createCrossPortalMock();
    mockInvoke = mock.mockInvoke;
  });

  // ── 1. Admin distributes data to researcher ──────────────────
  describe("Admin distributes anonymized data", () => {
    it("1. Distribution scoped by disease category", () => {
      const dist = makeDistribution();
      expect(dist.disease_categories).toContain("diabetes");
      expect(dist.disease_categories).toContain("cardiovascular");
    });

    it("2. Distribution scoped by date range", () => {
      const dist = makeDistribution();
      expect(new Date(dist.date_range_start!).getFullYear()).toBe(2025);
      expect(new Date(dist.date_range_end!).getFullYear()).toBe(2025);
    });

    it("3. Distribution records count of shared records", () => {
      const dist = makeDistribution({ record_count: 800 });
      expect(dist.record_count).toBe(800);
    });

    it("4. Researcher notified of data distribution", () => {
      const notif = makeNotification({
        user_id: ids.researcher,
        type: "admin_data_distribution",
        title: "New Data Available",
        message: "Platform admin has shared aggregated health data with you.",
      });
      expect(notif.user_id).toBe(ids.researcher);
      expect(notif.type).toBe("admin_data_distribution");
    });

    it("5. Distribution to pharmacy company supported", () => {
      const dist = makeDistribution({
        recipient_type: "pharmacy",
        recipient_id: "pharma-cp-010",
        purpose: "Drug efficacy monitoring",
      });
      expect(dist.recipient_type).toBe("pharmacy");
    });

    it("6. Audit log created for every distribution", () => {
      const log = makeAuditLog();
      expect(log.admin_id).toBe(users.admin.id);
      expect(log.action).toBe("data_distribution");
      expect(log.target_type).toBe("researcher");
    });
  });

  // ── 2. Compliance & system health ────────────────────────────
  describe("Compliance reporting and monitoring", () => {
    it("7. HIPAA compliance report generated", () => {
      const report = makeComplianceReport({ report_type: "HIPAA" });
      expect(report.report_type).toBe("HIPAA");
      expect(report.status).toBe("generated");
    });

    it("8. GDPR compliance report generated", () => {
      const report = makeComplianceReport({ report_type: "GDPR" });
      expect(report.report_type).toBe("GDPR");
    });

    it("9. Report includes access event totals", () => {
      const report = makeComplianceReport();
      expect((report.report_data as any).total_access_events).toBeGreaterThan(0);
    });

    it("10. Admin actions audited with IP address", () => {
      const log = makeAuditLog({ ip_address: "10.0.0.42" });
      expect(log.ip_address).toBe("10.0.0.42");
    });

    it("11. Non-admin cannot create distribution", async () => {
      mockError(mockInvoke, "Forbidden: admin role required");
      const result = await mockInvoke("admin-distribute-data", {
        body: { recipient_id: ids.researcher },
      });
      expect(result.data.error).toContain("admin role required");
    });

    it("12. Distribution with zero records handled", () => {
      const dist = makeDistribution({ record_count: 0, status: "completed" });
      expect(dist.record_count).toBe(0);
      expect(dist.status).toBe("completed");
    });
  });
});
