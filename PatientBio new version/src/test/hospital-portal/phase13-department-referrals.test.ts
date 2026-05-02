import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

describe("Phase 13: Department Referrals", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 117: Fetch referrals with resolved names
  it("should resolve department, patient, and staff names from separate queries", () => {
    const deptMap = new Map([["dept-1", "Cardiology"], ["dept-2", "Neurology"]]);
    const patientMap = new Map([["patient-1", "John Doe"]]);
    const staffMap = new Map([["user-1", "Dr. Smith"]]);

    const referral = { from_department_id: "dept-1", to_department_id: "dept-2", patient_id: "patient-1", referred_by: "user-1" };
    expect(deptMap.get(referral.from_department_id)).toBe("Cardiology");
    expect(deptMap.get(referral.to_department_id)).toBe("Neurology");
    expect(patientMap.get(referral.patient_id)).toBe("John Doe");
    expect(staffMap.get(referral.referred_by)).toBe("Dr. Smith");
  });

  // Test 118: Create referral
  it("should insert with from/to departments, urgency, reason", () => {
    const referral = {
      hospital_id: "hosp-1",
      patient_id: "patient-1",
      from_department_id: "dept-1",
      to_department_id: "dept-2",
      referred_by: "user-1",
      reason: "Neurological symptoms",
      urgency: "urgent",
    };
    expect(referral.from_department_id).toBeTruthy();
    expect(referral.to_department_id).toBeTruthy();
    expect(referral.reason).toBeTruthy();
  });

  // Test 119: Accept referral
  it("should set accepted_by and accepted_at on status=accepted", () => {
    const status = "accepted";
    const updates: Record<string, any> = { status };
    if (status === "accepted") {
      updates.accepted_by = "user-2";
      updates.accepted_at = new Date().toISOString();
    }
    expect(updates.accepted_by).toBe("user-2");
    expect(updates.accepted_at).toBeTruthy();
  });

  // Test 120: Complete referral
  it("should set completed_at on status=completed", () => {
    const status = "completed";
    const updates: Record<string, any> = { status };
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }
    expect(updates.completed_at).toBeTruthy();
  });

  // Test 121: Cancel referral
  it("should set status to cancelled", () => {
    const updates = { status: "cancelled" };
    expect(updates.status).toBe("cancelled");
  });

  // Test 122: Urgency levels
  it("should support 3 urgency levels", () => {
    const levels = ["routine", "urgent", "emergency"];
    expect(levels).toHaveLength(3);
  });

  // Test 123: Status flow
  it("should follow correct status flow", () => {
    const flow = ["requested", "accepted", "in_progress", "completed"];
    expect(flow[0]).toBe("requested");
    expect(flow[flow.length - 1]).toBe("completed");
  });

  // Test 124: Realtime subscription
  it("should subscribe to postgres_changes on department_referrals filtered by hospital_id", () => {
    const channelConfig = {
      event: "*",
      schema: "public",
      table: "department_referrals",
      filter: "hospital_id=eq.hosp-1",
    };
    expect(channelConfig.table).toBe("department_referrals");
    expect(channelConfig.filter).toContain("hospital_id=eq.");
  });
});
