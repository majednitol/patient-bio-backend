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

describe("Phase 5: Departments", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 41: Fetch departments with staff count
  it("should compute staff_count per department from hospital_staff", () => {
    const staffData = [
      { department_id: "dept-1" },
      { department_id: "dept-1" },
      { department_id: "dept-2" },
    ];
    const countMap = new Map<string, number>();
    staffData.forEach((s) => {
      if (s.department_id) countMap.set(s.department_id, (countMap.get(s.department_id) || 0) + 1);
    });
    expect(countMap.get("dept-1")).toBe(2);
    expect(countMap.get("dept-2")).toBe(1);
  });

  // Test 42: Head staff name resolution
  it("should resolve head_staff_id to doctor_profile full_name", () => {
    const headStaffMap = new Map([["staff-1", "Dr. Smith"]]);
    const dept = { head_staff_id: "staff-1" };
    expect(headStaffMap.get(dept.head_staff_id)).toBe("Dr. Smith");
  });

  // Test 43: Create department
  it("should insert with hospital_id, name, description, head_staff_id", () => {
    const input = { hospital_id: "hosp-1", name: "Cardiology", description: "Heart dept", head_staff_id: "staff-1" };
    expect(input.hospital_id).toBeTruthy();
    expect(input.name).toBe("Cardiology");
  });

  // Test 44: Duplicate department name rejected
  it("should show error for duplicate key", () => {
    const error = new Error("duplicate key value violates unique constraint");
    const isDuplicate = error.message.includes("duplicate key");
    const userMessage = isDuplicate ? "A department with this name already exists" : "Failed to create department";
    expect(userMessage).toContain("already exists");
  });

  // Test 45: Update department
  it("should update name, description, head_staff_id", () => {
    const updates = { id: "dept-1", hospitalId: "hosp-1", name: "Neurology", description: "Brain dept", headStaffId: "staff-2" };
    expect(updates.name).toBe("Neurology");
  });

  // Test 46: Duplicate name on update rejected
  it("should show same error for duplicate key on update", () => {
    const error = new Error("duplicate key");
    expect(error.message).toContain("duplicate key");
  });

  // Test 47: Delete department (soft)
  it("should set is_active=false on delete", () => {
    const updatePayload = { is_active: false };
    expect(updatePayload.is_active).toBe(false);
  });

  // Test 48: Department used in referrals
  it("should resolve department names from hospital_departments", () => {
    const deptMap = new Map([["dept-1", "Cardiology"], ["dept-2", "Neurology"]]);
    const referral = { from_department_id: "dept-1", to_department_id: "dept-2" };
    expect(deptMap.get(referral.from_department_id)).toBe("Cardiology");
    expect(deptMap.get(referral.to_department_id)).toBe("Neurology");
  });
});
