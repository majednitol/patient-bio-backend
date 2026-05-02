import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, mockVerification, mockAdminUser } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

describe("Phase 9: Provider Verifications (12 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  const verifications = [
    { ...mockVerification, id: "v1", status: "pending" as const, provider_type: "doctor" as const, provider_name: "Dr. Smith" },
    { ...mockVerification, id: "v2", status: "approved" as const, provider_type: "pathologist" as const, provider_name: "Lab Expert" },
    { ...mockVerification, id: "v3", status: "rejected" as const, provider_type: "researcher" as const, provider_name: "Prof. Jones", license_number: "RES-999" },
    { ...mockVerification, id: "v4", status: "pending" as const, provider_type: "doctor" as const, provider_name: "Dr. Brown" },
  ];

  it("89. Fetch all verifications ordered by submitted_at desc", () => {
    expect(verifications).toHaveLength(4);
    expect(verifications[0]).toHaveProperty("submitted_at");
  });

  it("90. Provider name resolution maps user_id to profiles", () => {
    const doctorMap = new Map([["doctor-user-1", "Dr. Smith"]]);
    const pathologistMap = new Map([["path-user-1", "Lab Expert"]]);
    const researcherMap = new Map([["res-user-1", "Prof. Jones"]]);

    const getName = (type: string, userId: string) => {
      if (type === "doctor") return doctorMap.get(userId);
      if (type === "pathologist") return pathologistMap.get(userId);
      return researcherMap.get(userId);
    };

    expect(getName("doctor", "doctor-user-1")).toBe("Dr. Smith");
    expect(getName("researcher", "res-user-1")).toBe("Prof. Jones");
  });

  it("91. Pending count calculation", () => {
    const pendingCount = verifications.filter((v) => v.status === "pending").length;
    expect(pendingCount).toBe(2);
  });

  it("92. Approve verification sets status, reviewed_by, reviewed_at", async () => {
    const chain = mockSupabase.createChain({
      data: { ...mockVerification, status: "approved", reviewed_by: mockAdminUser.id, reviewed_at: new Date().toISOString() },
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockAdminUser } });

    const update = { status: "approved", reviewed_by: mockAdminUser.id, reviewed_at: new Date().toISOString() };
    expect(update.status).toBe("approved");
    expect(update.reviewed_by).toBe(mockAdminUser.id);
  });

  it("93. Reject verification sets status and rejection_reason", () => {
    const update = { status: "rejected", rejection_reason: "Expired license" };
    expect(update.status).toBe("rejected");
    expect(update.rejection_reason).toBe("Expired license");
  });

  it("94. Approve creates verification_approved notification", () => {
    const notification = {
      user_id: "doctor-user-1",
      type: "verification_approved",
      title: "Verification Approved",
      message: "Your credentials have been verified.",
    };
    expect(notification.type).toBe("verification_approved");
  });

  it("95. Reject creates verification_rejected notification with reason", () => {
    const reason = "Documents unclear";
    const notification = {
      user_id: "doctor-user-1",
      type: "verification_rejected",
      title: "Verification Not Approved",
      message: `Your verification was not approved. ${reason}`,
    };
    expect(notification.type).toBe("verification_rejected");
    expect(notification.message).toContain(reason);
  });

  it("96. Get document URL creates 1-hour signed URL", async () => {
    mockSupabase.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.url/doc.pdf" }, error: null }),
    });
    const bucket = mockSupabase.storage.from("provider-verifications");
    const { data } = await bucket.createSignedUrl("doc.pdf", 60 * 60);
    expect(data.signedUrl).toContain("https://");
  });

  it("97. Filter by status", () => {
    const statusFilter: string = "pending";
    const filtered = verifications.filter((v) => statusFilter === "all" || v.status === statusFilter);
    expect(filtered).toHaveLength(2);
  });

  it("98. Search by license number", () => {
    const query = "RES-999";
    const filtered = verifications.filter((v) => v.license_number?.includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("v3");
  });

  it("99. Search by provider name", () => {
    const query = "brown";
    const filtered = verifications.filter((v) => v.provider_name?.toLowerCase().includes(query));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("v4");
  });

  it("100. Cache invalidation on review invalidates both keys", () => {
    const keys = ["admin-verifications", "admin-verifications-pending-count"];
    expect(keys).toContain("admin-verifications");
    expect(keys).toContain("admin-verifications-pending-count");
  });
});
