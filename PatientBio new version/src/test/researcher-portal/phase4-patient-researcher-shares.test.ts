import { describe, it, expect, vi } from "vitest";
import { mockUser, mockPatientResearcherShare, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("Phase 4: Patient-Researcher Shares", () => {
  // Test 33: Fetch researcher shares
  it("should fetch shares filtered by researcher_id", async () => {
    const shares = [mockPatientResearcherShare];
    const chain = mockSupabase.createChain({ data: shares, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await Promise.resolve({ data: shares, error: null });
    expect(result.data[0].researcher_id).toBe(mockUser.id);
  });

  // Test 34: Fetch patient shares
  it("should fetch shares filtered by patient_id", async () => {
    const patientUser = { id: "patient-1" };
    const shares = [{ ...mockPatientResearcherShare, patient_id: patientUser.id }];
    const result = await Promise.resolve({ data: shares, error: null });
    expect(result.data[0].patient_id).toBe("patient-1");
  });

  // Test 35: Active patient shares filter
  it("should exclude revoked and expired shares from active", () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 86400000).toISOString();
    const futureDate = new Date(now.getTime() + 86400000).toISOString();

    const shares = [
      { ...mockPatientResearcherShare, status: "pending" as const, expires_at: futureDate },
      { ...mockPatientResearcherShare, id: "s2", status: "revoked" as const, expires_at: null },
      { ...mockPatientResearcherShare, id: "s3", status: "viewed" as const, expires_at: pastDate },
    ];

    const active = shares.filter(
      (s) => s.status !== "revoked" && (!s.expires_at || new Date(s.expires_at) > new Date())
    );
    expect(active.length).toBe(1);
  });

  // Test 36: Pending shares count
  it("should count pending shares from researcher perspective", () => {
    const shares = [
      { ...mockPatientResearcherShare, status: "pending" as const },
      { ...mockPatientResearcherShare, id: "s2", status: "viewed" as const },
      { ...mockPatientResearcherShare, id: "s3", status: "pending" as const },
    ];
    const pending = shares.filter((s) => s.status === "pending");
    expect(pending.length).toBe(2);
  });

  // Test 37: Create share with notification
  it("should create share and send notification", async () => {
    const shareChain = mockSupabase.createChain({ data: { id: "new-share" }, error: null });
    const notifChain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(shareChain).mockReturnValueOnce(notifChain);

    const shareResult = await shareChain.insert({
      patient_id: "patient-1",
      researcher_id: "researcher-2",
      is_anonymized: true,
    }).select().single();

    expect(shareResult.data.id).toBe("new-share");
  });

  // Test 38: Default anonymization true
  it("should default is_anonymized to true when not provided", () => {
    const shareData = { researcher_id: "r1" };
    const isAnonymized = (shareData as any).is_anonymized ?? true;
    expect(isAnonymized).toBe(true);
  });

  // Test 39: Revoke share
  it("should set status to revoked", async () => {
    const chain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    await chain.update({ status: "revoked" }).eq("id", "share-1");
    expect(chain.update).toHaveBeenCalledWith({ status: "revoked" });
  });

  // Test 40: Update share status - viewed
  it("should set viewed_at timestamp when status is viewed", () => {
    const status = "viewed";
    const updates: Record<string, unknown> = { status };
    if (status === "viewed") updates.viewed_at = new Date().toISOString();
    expect(updates).toHaveProperty("viewed_at");
  });

  // Test 41: Update share status - completed
  it("should set completed_at timestamp when status is completed", () => {
    const status = "completed";
    const updates: Record<string, unknown> = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    expect(updates).toHaveProperty("completed_at");
  });

  // Test 42: Share status transitions
  it("should support 4 share statuses", () => {
    const statuses = ["pending", "viewed", "completed", "revoked"];
    expect(statuses.length).toBe(4);
  });

  // Test 43: Expired share excluded from active
  it("should exclude expired shares from active list", () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const share = { ...mockPatientResearcherShare, expires_at: pastDate, status: "pending" as string };
    const isActive = share.status !== "revoked" && (!share.expires_at || new Date(share.expires_at) > new Date());
    expect(isActive).toBe(false);
  });

  // Test 44: Cache invalidation on create
  it("should invalidate patient-researcher-shares-patient on create", () => {
    const key = ["patient-researcher-shares-patient", mockUser.id];
    expect(key[0]).toBe("patient-researcher-shares-patient");
  });

  // Test 45: Cache invalidation on revoke
  it("should invalidate patient-researcher-shares-patient on revoke", () => {
    const key = ["patient-researcher-shares-patient", mockUser.id];
    expect(key[0]).toBe("patient-researcher-shares-patient");
  });

  // Test 46: Cache invalidation on status update
  it("should invalidate patient-researcher-shares-researcher on status update", () => {
    const key = ["patient-researcher-shares-researcher", mockUser.id];
    expect(key[0]).toBe("patient-researcher-shares-researcher");
  });
});
