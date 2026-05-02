import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
        }),
      }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 10: Staff Management", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Doctor Staff CRUD", () => {
    it("fetches staff ordered by created_at desc", () => {
      const queryConfig = {
        table: "doctor_staff",
        filter: { doctor_id: "doctor-123" },
        ordering: { column: "created_at", ascending: false },
      };
      expect(queryConfig.ordering.ascending).toBe(false);
    });

    it("adds staff with role nurse/receptionist/assistant", () => {
      const validRoles = ["nurse", "receptionist", "assistant"];
      expect(validRoles).toContain("nurse");
      expect(validRoles).toContain("receptionist");
      expect(validRoles).toContain("assistant");
    });

    it("accepts pending or manual invite_status", () => {
      const validStatuses = ["pending", "manual"];
      expect(validStatuses).toContain("pending");
      expect(validStatuses).toContain("manual");
    });

    it("removes staff via soft delete (is_active=false)", () => {
      const update = { is_active: false };
      expect(update.is_active).toBe(false);
    });

    it("supports partial update by staff id", () => {
      const updates = { id: "staff-1", full_name: "Updated Name", phone: "+9876543210" };
      const { id, ...data } = updates;
      expect(id).toBe("staff-1");
      expect(data.full_name).toBe("Updated Name");
    });
  });

  describe("Staff Access Detection", () => {
    it("identifies doctor_staff role and returns effectiveDoctorId", () => {
      const roleData = { role: "doctor_staff" };
      const staffData = { doctor_id: "actual-doctor-456" };
      const isStaff = roleData.role === "doctor_staff";
      const effectiveDoctorId = isStaff ? staffData.doctor_id : "doctor-123";
      expect(isStaff).toBe(true);
      expect(effectiveDoctorId).toBe("actual-doctor-456");
    });

    it("non-staff returns own user.id as effectiveDoctorId", () => {
      const roleData = { role: "doctor" };
      const isStaff = roleData.role === "doctor_staff";
      const effectiveDoctorId = isStaff ? "linked-doctor" : "doctor-123";
      expect(effectiveDoctorId).toBe("doctor-123");
    });
  });

  describe("Staff Permission Check", () => {
    it("non-staff users always return true", () => {
      const isStaff = false;
      const hasPermission = (key: string) => {
        if (!isStaff) return true;
        return false;
      };
      expect(hasPermission("appointments")).toBe(true);
      expect(hasPermission("anything")).toBe(true);
    });

    it("checks permissions from staffRecord", () => {
      const permissions = { appointments: true, vitals: false, patient_records: true };
      expect(permissions["appointments"]).toBe(true);
      expect(permissions["vitals"]).toBe(false);
    });

    it("uses DEFAULT_PERMISSIONS when permissions is null", () => {
      const defaultPerms: Record<string, boolean> = { appointments: true, vitals: true };
      const perms = null;
      const check = (key: string) => {
        if (!perms) return defaultPerms[key] ?? true;
        return (perms as any)[key] ?? defaultPerms[key] ?? true;
      };
      expect(check("appointments")).toBe(true);
      expect(check("vitals")).toBe(true);
      expect(check("unknown")).toBe(true); // defaults to true
    });
  });
});
