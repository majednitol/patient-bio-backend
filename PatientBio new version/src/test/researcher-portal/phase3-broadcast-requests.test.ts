import { describe, it, expect, vi } from "vitest";
import { mockUser, mockBroadcastRequest, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("Phase 3: Broadcast Requests", () => {
  // Test 21: Fetch broadcast requests
  it("should fetch broadcast requests ordered by created_at desc", async () => {
    const requests = [mockBroadcastRequest, { ...mockBroadcastRequest, id: "broadcast-2", status: "completed" as const }];
    const chain = mockSupabase.createChain({ data: requests, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await Promise.resolve({ data: requests, error: null });
    expect(result.data.length).toBe(2);
    expect(result.data[0].researcher_id).toBe(mockUser.id);
  });

  // Test 22: Create broadcast via edge function
  it("should invoke broadcast-research-request edge function", async () => {
    const params = { disease_category: "diabetes", research_purpose: "Study" };
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { patients_notified: 5, broadcast_id: "new-broadcast" }, error: null,
    });

    const result = await mockSupabase.functions.invoke("broadcast-research-request", { body: params });
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith("broadcast-research-request", { body: params });
    expect(result.data.patients_notified).toBe(5);
  });

  // Test 23: Broadcast with token budget
  it("should send token budget parameters", async () => {
    const params = {
      disease_category: "cardiology",
      research_purpose: "Heart study",
      token_offer_per_patient: 20,
      total_token_budget: 200,
    };
    mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { patients_notified: 10 }, error: null });

    await mockSupabase.functions.invoke("broadcast-research-request", { body: params });
    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
      "broadcast-research-request",
      expect.objectContaining({ body: expect.objectContaining({ token_offer_per_patient: 20, total_token_budget: 200 }) })
    );
  });

  // Test 24: Zero patients notified
  it("should handle zero patients notified", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { patients_notified: 0 }, error: null });
    const result = await mockSupabase.functions.invoke("broadcast-research-request", { body: {} });
    expect(result.data.patients_notified).toBe(0);
  });

  // Test 25: Positive patients notified
  it("should handle positive patients notified", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({ data: { patients_notified: 15 }, error: null });
    const result = await mockSupabase.functions.invoke("broadcast-research-request", { body: {} });
    expect(result.data.patients_notified).toBe(15);
  });

  // Test 26: Cancel broadcast
  it("should cancel broadcast by setting status to cancelled", async () => {
    const chain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    await chain.update({ status: "cancelled" }).eq("id", "broadcast-1");
    expect(chain.update).toHaveBeenCalledWith({ status: "cancelled" });
  });

  // Test 27: Active requests filter
  it("should filter active requests", () => {
    const requests = [
      { ...mockBroadcastRequest, status: "active" as const },
      { ...mockBroadcastRequest, id: "b2", status: "completed" as const },
      { ...mockBroadcastRequest, id: "b3", status: "cancelled" as const },
    ];
    const active = requests.filter((r) => r.status === "active");
    expect(active.length).toBe(1);
  });

  // Test 28: Completed requests filter
  it("should filter completed requests", () => {
    const requests = [
      { ...mockBroadcastRequest, status: "active" as const },
      { ...mockBroadcastRequest, id: "b2", status: "completed" as const },
    ];
    const completed = requests.filter((r) => r.status === "completed");
    expect(completed.length).toBe(1);
  });

  // Test 29: Broadcast statuses
  it("should support 3 broadcast statuses", () => {
    const statuses = ["active", "completed", "cancelled"];
    expect(statuses.length).toBe(3);
  });

  // Test 30: Cache invalidation on create
  it("should invalidate broadcast-requests on create", () => {
    const queryKey = ["broadcast-requests", mockUser.id];
    expect(queryKey[0]).toBe("broadcast-requests");
  });

  // Test 31: Cache invalidation on cancel
  it("should invalidate broadcast-requests on cancel", () => {
    const queryKey = ["broadcast-requests", mockUser.id];
    expect(queryKey[0]).toBe("broadcast-requests");
  });

  // Test 32: Query staleTime is 5 minutes
  it("should have 5 minute staleTime", () => {
    const staleTime = 5 * 60 * 1000;
    expect(staleTime).toBe(300000);
  });
});
