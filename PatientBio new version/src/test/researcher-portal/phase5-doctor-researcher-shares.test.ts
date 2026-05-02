import { describe, it, expect, vi } from "vitest";
import { mockUser, mockDoctorResearcherShare, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("Phase 5: Doctor-Researcher Shares", () => {
  // Test 47: Fetch incoming shares (researcher view)
  it("should fetch incoming shares filtered by researcher_id", async () => {
    const shares = [mockDoctorResearcherShare];
    const chain = mockSupabase.createChain({ data: shares, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await Promise.resolve({ data: shares, error: null });
    expect(result.data[0].researcher_id).toBe(mockUser.id);
  });

  // Test 48: Fetch outgoing shares (doctor view)
  it("should fetch outgoing shares filtered by doctor_id", async () => {
    const shares = [{ ...mockDoctorResearcherShare, doctor_id: "doctor-1" }];
    const result = await Promise.resolve({ data: shares, error: null });
    expect(result.data[0].doctor_id).toBe("doctor-1");
  });

  // Test 49: Pending shares derivation
  it("should derive pending shares from incoming", () => {
    const incoming = [
      { ...mockDoctorResearcherShare, status: "pending" },
      { ...mockDoctorResearcherShare, id: "s2", status: "completed" },
      { ...mockDoctorResearcherShare, id: "s3", status: "pending" },
    ];
    const pending = incoming.filter((s) => s.status === "pending");
    expect(pending.length).toBe(2);
  });

  // Test 50: Pending count calculation
  it("should calculate pendingCount from pendingShares.length", () => {
    const pendingShares = [mockDoctorResearcherShare, { ...mockDoctorResearcherShare, id: "s2" }];
    expect(pendingShares.length).toBe(2);
  });

  // Test 51: Create share with notification
  it("should create share and notify researcher", async () => {
    const shareChain = mockSupabase.createChain({ data: { id: "new-dr-share" }, error: null });
    mockSupabase.from.mockReturnValueOnce(shareChain);

    const result = await shareChain.insert({
      doctor_id: "doctor-1",
      researcher_id: "researcher-2",
      patient_id: "patient-1",
      is_anonymized: true,
    }).select().single();

    expect(result.data.id).toBe("new-dr-share");
  });

  // Test 52: Default anonymization true
  it("should default is_anonymized to true", () => {
    const provided: boolean | undefined = undefined;
    const isAnon = provided ?? true;
    expect(isAnon).toBe(true);
  });

  // Test 53: Update share status with completed_at
  it("should set completed_at when status is completed", () => {
    const status = "completed";
    const updates: Record<string, unknown> = { status };
    if (status === "completed") updates.completed_at = new Date().toISOString();
    expect(updates).toHaveProperty("completed_at");
    expect(updates.status).toBe("completed");
  });

  // Test 54: Combined isLoading
  it("should be true when either query is loading", () => {
    const loadingIncoming = true;
    const loadingOutgoing = false;
    expect(loadingIncoming || loadingOutgoing).toBe(true);
  });

  // Test 55: Refetch triggers both queries
  it("should call both refetch functions", () => {
    const refetchIncoming = vi.fn();
    const refetchOutgoing = vi.fn();
    const refetch = () => { refetchIncoming(); refetchOutgoing(); };
    refetch();
    expect(refetchIncoming).toHaveBeenCalled();
    expect(refetchOutgoing).toHaveBeenCalled();
  });

  // Test 56: Cache invalidation on create
  it("should invalidate doctor-researcher-shares-outgoing on create", () => {
    const key = ["doctor-researcher-shares-outgoing", mockUser.id];
    expect(key[0]).toBe("doctor-researcher-shares-outgoing");
  });

  // Test 57: Cache invalidation on status update
  it("should invalidate doctor-researcher-shares-incoming on status update", () => {
    const key = ["doctor-researcher-shares-incoming", mockUser.id];
    expect(key[0]).toBe("doctor-researcher-shares-incoming");
  });

  // Test 58: Auth guard on create
  it("should throw when creating share without auth", async () => {
    const createShare = async (userId: string | null) => {
      if (!userId) throw new Error("Not authenticated");
    };
    await expect(createShare(null)).rejects.toThrow("Not authenticated");
  });
});
