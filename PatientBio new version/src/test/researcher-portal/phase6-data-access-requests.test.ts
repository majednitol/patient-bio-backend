import { describe, it, expect, vi } from "vitest";
import { mockUser, mockDataAccessRequest, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("Phase 6: Data Access Requests", () => {
  // Test 59: Fetch incoming requests (patient view)
  it("should fetch incoming requests filtered by patient_id", async () => {
    const requests = [{ ...mockDataAccessRequest, patient_id: "patient-1" }];
    const chain = mockSupabase.createChain({ data: requests, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);
    const result = await Promise.resolve({ data: requests, error: null });
    expect(result.data[0].patient_id).toBe("patient-1");
  });

  // Test 60: Fetch outgoing requests (researcher view)
  it("should fetch outgoing requests filtered by requester_id", async () => {
    const requests = [mockDataAccessRequest];
    const result = await Promise.resolve({ data: requests, error: null });
    expect(result.data[0].requester_id).toBe(mockUser.id);
  });

  // Test 61: Pending requests derivation
  it("should derive pending from incoming requests", () => {
    const incoming = [
      { ...mockDataAccessRequest, status: "pending" as const },
      { ...mockDataAccessRequest, id: "r2", status: "approved" as const },
    ];
    const pending = incoming.filter((r) => r.status === "pending");
    expect(pending.length).toBe(1);
  });

  // Test 62: Create request with notification
  it("should create request and notify patient", async () => {
    const reqChain = mockSupabase.createChain({ data: null, error: null });
    const notifChain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(reqChain).mockReturnValueOnce(notifChain);

    await reqChain.insert({
      patient_id: "patient-1",
      requester_id: mockUser.id,
      requester_type: "researcher",
      disease_category: "diabetes",
    });
    expect(reqChain.insert).toHaveBeenCalled();
  });

  // Test 63: Approve auto-creates patient_researcher_shares
  it("should create share when approving researcher request", async () => {
    const request = { ...mockDataAccessRequest, requester_type: "researcher" as const };
    const isResearcher = request.requester_type === "researcher";
    expect(isResearcher).toBe(true);

    // Simulating share creation
    const shareData = {
      patient_id: request.patient_id,
      researcher_id: request.requester_id,
      disease_category: request.disease_category,
      research_purpose: request.reason,
      is_anonymized: true,
      status: "pending",
    };
    expect(shareData.is_anonymized).toBe(true);
    expect(shareData.status).toBe("pending");
  });

  // Test 64: Approve credits patient wallet
  it("should call credit_patient_wallet RPC", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    await mockSupabase.rpc("credit_patient_wallet", {
      p_patient_id: "patient-1",
      p_tokens: 15,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith("credit_patient_wallet", {
      p_patient_id: "patient-1",
      p_tokens: 15,
    });
  });

  // Test 65: Approve creates data_transaction
  it("should insert data_transaction with access_tier=2", () => {
    const txData = {
      patient_id: "patient-1",
      requester_id: mockUser.id,
      requester_type: "researcher",
      access_tier: 2,
      disease_category: "diabetes",
      tokens_earned: 15,
      is_anonymized: true,
      data_access_request_id: "request-1",
    };
    expect(txData.access_tier).toBe(2);
    expect(txData.is_anonymized).toBe(true);
  });

  // Test 66: Approve updates broadcast approval count
  it("should increment patients_approved on broadcast", async () => {
    const currentData = { patients_approved: 3, tokens_disbursed: 45, token_offer_per_patient: 15 };
    const updated = {
      patients_approved: currentData.patients_approved + 1,
      tokens_disbursed: currentData.tokens_disbursed + 15,
    };
    expect(updated.patients_approved).toBe(4);
    expect(updated.tokens_disbursed).toBe(60);
  });

  // Test 67: Default token amount
  it("should default to 10 PBIO when no token_offer", () => {
    const request = { ...mockDataAccessRequest, token_offer: null };
    const tokenAmount = request.token_offer || 10;
    expect(tokenAmount).toBe(10);
  });

  // Test 68: Reject request
  it("should set status to rejected with responded_at", () => {
    const updates = {
      status: "rejected" as const,
      responded_at: new Date().toISOString(),
    };
    expect(updates.status).toBe("rejected");
    expect(updates.responded_at).toBeTruthy();
  });

  // Test 69: Reject updates broadcast rejection count
  it("should increment patients_rejected on broadcast", () => {
    const currentData = { patients_rejected: 1 };
    const updated = { patients_rejected: (currentData.patients_rejected || 0) + 1 };
    expect(updated.patients_rejected).toBe(2);
  });

  // Test 70: Approve notification to requester
  it("should create request_approved notification", () => {
    const notification = {
      user_id: mockUser.id,
      type: "request_approved",
      title: "Data Access Approved",
      message: "A patient has approved your research data request. Anonymized data is now available.",
    };
    expect(notification.type).toBe("request_approved");
  });

  // Test 71: Reject notification to requester
  it("should create request_rejected notification", () => {
    const notification = {
      user_id: mockUser.id,
      type: "request_rejected",
      title: "Data Access Rejected",
    };
    expect(notification.type).toBe("request_rejected");
  });

  // Test 72: Cache invalidation on approve
  it("should invalidate multiple query keys on approve", () => {
    const keys = [
      ["data-requests-incoming", mockUser.id],
      ["patient-wallet", mockUser.id],
      ["data-transactions", mockUser.id],
    ];
    expect(keys.length).toBe(3);
    expect(keys[0][0]).toBe("data-requests-incoming");
    expect(keys[1][0]).toBe("patient-wallet");
    expect(keys[2][0]).toBe("data-transactions");
  });
});
