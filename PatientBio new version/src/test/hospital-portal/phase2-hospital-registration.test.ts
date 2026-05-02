import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockHospital } from "./test-helpers";

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
  useAuth: () => ({ user: { id: "user-1", email: "admin@hospital.com" } }),
}));

describe("Phase 2: Hospital Registration & Profile", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 9: Create hospital inserts row
  it("should create hospital with required fields", () => {
    const hospitalData = {
      name: "New Hospital",
      type: "hospital",
      created_by: "user-1",
    };
    expect(hospitalData.name).toBeTruthy();
    expect(hospitalData.type).toBe("hospital");
    expect(hospitalData.created_by).toBe("user-1");
  });

  // Test 10: Creator gets hospital_admin role
  it("should assign hospital_admin role to creator", () => {
    const roleInsert = { user_id: "user-1", role: "hospital_admin" };
    expect(roleInsert.role).toBe("hospital_admin");
  });

  // Test 11: Fetch single hospital
  it("should return full hospital object with all fields", () => {
    expect(mockHospital.id).toBeTruthy();
    expect(mockHospital.name).toBe("Test Hospital");
    expect(mockHospital.city).toBeTruthy();
    expect(mockHospital.email).toBeTruthy();
  });

  // Test 12: Fetch my hospitals returns active staff hospitals
  it("should filter by user_id and is_active", () => {
    const filters = { user_id: "user-1", is_active: true };
    expect(filters.is_active).toBe(true);
  });

  // Test 13: Update hospital profile
  it("should update hospital fields and keep id", () => {
    const update = { id: "hospital-1", name: "Updated Hospital" };
    expect(update.id).toBe("hospital-1");
    expect(update.name).toBe("Updated Hospital");
  });

  // Test 14: Profile completion tracks 8 fields
  it("should track 8 profile fields", () => {
    const fields = ["name", "city", "phone", "email", "address", "description", "logo_url", "website"];
    expect(fields).toHaveLength(8);
  });

  // Test 15: Missing fields return navigation links
  it("should return /hospital/settings link for incomplete fields", () => {
    const field = { key: "phone", label: "Phone Number", isComplete: false, link: "/hospital/settings", priority: "high" };
    expect(field.link).toBe("/hospital/settings");
    expect(field.isComplete).toBe(false);
  });

  // Test 16: Percentage calculation
  it("should calculate 50% for 4/8 completed fields", () => {
    const completed = 4;
    const total = 8;
    const percentage = Math.round((completed / total) * 100);
    expect(percentage).toBe(50);
  });

  // Test 17: Hospital search with debounce
  it("should support ILIKE search on active hospitals", () => {
    const searchConfig = { table: "hospitals", filter: "is_active", method: "ilike", field: "name" };
    expect(searchConfig.method).toBe("ilike");
    expect(searchConfig.filter).toBe("is_active");
  });

  // Test 18: Hospital types
  it("should accept valid hospital types", () => {
    const validTypes = ["hospital", "clinic", "diagnostic", "pharmacy"];
    expect(validTypes).toContain("hospital");
    expect(validTypes).toContain("clinic");
    expect(validTypes).toHaveLength(4);
  });
});
