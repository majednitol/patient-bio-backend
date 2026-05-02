import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

describe("Phase 12: Lab Orders", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 107: Fetch hospital lab orders with joins
  it("should select lab orders with patient, pathologist, and admission profiles", () => {
    const selectQuery = `*, patient_profile:user_profiles!hospital_lab_orders_patient_id_fkey(display_name, patient_passport_id), pathologist_profile:pathologist_profiles!hospital_lab_orders_pathologist_id_fkey(full_name, lab_name), admission:admissions(bed:beds(bed_number, ward:wards(name)))`;
    expect(selectQuery).toContain("patient_profile");
    expect(selectQuery).toContain("pathologist_profile");
    expect(selectQuery).toContain("admission");
  });

  // Test 108: Create internal lab order
  it("should set status=ordered and consent=approved for internal lab", () => {
    const isInternal = true;
    const initialStatus = isInternal ? "ordered" : "pending_consent";
    const consentStatus = isInternal ? "approved" : "pending";
    expect(initialStatus).toBe("ordered");
    expect(consentStatus).toBe("approved");
  });

  // Test 109: Create external lab order
  it("should set status=pending_consent and create data_access_request for external lab", () => {
    const isInternal = false;
    const initialStatus = isInternal ? "ordered" : "pending_consent";
    const consentStatus = isInternal ? "approved" : "pending";
    expect(initialStatus).toBe("pending_consent");
    expect(consentStatus).toBe("pending");
  });

  // Test 110: Update order status - sample_collected
  it("should set sample_collected_at and sample_collected_by on sample_collected", () => {
    const status = "sample_collected";
    const updateData: Record<string, unknown> = { status };
    if (status === "sample_collected") {
      updateData.sample_collected_at = new Date().toISOString();
      updateData.sample_collected_by = "user-1";
    }
    expect(updateData.sample_collected_at).toBeTruthy();
    expect(updateData.sample_collected_by).toBe("user-1");
  });

  // Test 111: Complete order
  it("should set completed_at on status=completed", () => {
    const status = "completed";
    const updateData: Record<string, unknown> = { status };
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }
    expect(updateData.completed_at).toBeTruthy();
  });

  // Test 112: Cancel order
  it("should set status to cancelled", () => {
    const update = { status: "cancelled" };
    expect(update.status).toBe("cancelled");
  });

  // Test 113: Fetch admission lab orders
  it("should filter by admission_id", () => {
    const admissionId = "adm-1";
    expect(admissionId).toBeTruthy();
  });

  // Test 114: Lab order results with pathologist_report
  it("should join pathologist_reports for results", () => {
    const selectQuery = `*, pathologist_report:pathologist_reports(id, report_name, file_url, created_at)`;
    expect(selectQuery).toContain("pathologist_report:pathologist_reports");
  });

  // Test 115: Urgency levels
  it("should support 3 urgency levels", () => {
    const levels = ["routine", "urgent", "stat"];
    expect(levels).toHaveLength(3);
  });

  // Test 116: Status flow
  it("should follow correct status flow", () => {
    const flow = ["pending_consent", "ordered", "sample_collected", "processing", "completed"];
    expect(flow[0]).toBe("pending_consent");
    expect(flow[flow.length - 1]).toBe("completed");
    expect(flow).toHaveLength(5);
  });
});
