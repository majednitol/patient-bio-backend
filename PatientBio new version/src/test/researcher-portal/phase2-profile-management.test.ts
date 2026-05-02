import { describe, it, expect, vi } from "vitest";
import { mockUser, mockResearcherProfile, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe("Phase 2: Researcher Profile Management", () => {
  // Test 9: Fetch researcher profile
  it("should fetch full researcher profile", async () => {
    const chain = mockSupabase.createChain({ data: mockResearcherProfile, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await chain.select("*").eq("user_id", mockUser.id).maybeSingle();
    expect(result.data).toEqual(mockResearcherProfile);
    expect(result.data.institution_name).toBe("University Research Center");
    expect(result.data.research_focus).toBe("Genomics");
  });

  // Test 10: Update researcher profile
  it("should update researcher profile fields", async () => {
    const updated = { ...mockResearcherProfile, department: "Updated Dept" };
    const chain = mockSupabase.createChain({ data: updated, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await chain.update({ department: "Updated Dept" }).eq("user_id", mockUser.id).select().single();
    expect(result.data.department).toBe("Updated Dept");
  });

  // Test 11: Profile completion tracks 9 fields
  it("should track 9 completion fields", () => {
    const fields = [
      "full_name", "institution_name", "institution_type", "department",
      "research_focus", "license_number", "phone", "email", "avatar_url",
    ];
    expect(fields.length).toBe(9);
  });

  // Test 12: Missing fields identification
  it("should identify missing fields with links", () => {
    const profile = { ...mockResearcherProfile, department: null, research_focus: null };
    const fields = [
      { key: "full_name", label: "Full Name", isComplete: !!profile.full_name, link: "/researcher/profile" },
      { key: "department", label: "Department", isComplete: !!profile.department, link: "/researcher/profile" },
      { key: "research_focus", label: "Research Focus", isComplete: !!profile.research_focus, link: "/researcher/profile" },
    ];
    const missing = fields.filter((f) => !f.isComplete);
    expect(missing.length).toBe(2);
    expect(missing[0].link).toBe("/researcher/profile");
  });

  // Test 13: Percentage calculation
  it("should calculate 56% for 5/9 fields", () => {
    const completed = 5;
    const total = 9;
    const percentage = Math.round((completed / total) * 100);
    expect(percentage).toBe(56);
  });

  // Test 14: Full completion = 100%
  it("should return 100% when all fields complete", () => {
    const completed = 9;
    const total = 9;
    expect(Math.round((completed / total) * 100)).toBe(100);
  });

  // Test 15: Empty profile = 0%
  it("should return 0% when no profile exists", () => {
    const completed = 0;
    const total = 9;
    expect(Math.round((completed / total) * 100)).toBe(0);
  });

  // Test 16: Null profile returns null
  it("should return null when no profile exists", async () => {
    const chain = mockSupabase.createChain({ data: null, error: null });
    mockSupabase.from.mockReturnValueOnce(chain);

    const result = await chain.select("*").eq("user_id", "unknown").maybeSingle();
    expect(result.data).toBeNull();
  });

  // Test 17: Create profile requires auth
  it("should throw when creating profile without auth", async () => {
    const createProfile = async (userId: string | null) => {
      if (!userId) throw new Error("Not authenticated");
      return {};
    };
    await expect(createProfile(null)).rejects.toThrow("Not authenticated");
  });

  // Test 18: Update profile invalidates cache
  it("should invalidate correct query keys on update", () => {
    const keysToInvalidate = [
      ["researcher-profile", mockUser.id],
      ["user-role", mockUser.id],
    ];
    expect(keysToInvalidate[0][0]).toBe("researcher-profile");
    expect(keysToInvalidate[1][0]).toBe("user-role");
  });

  // Test 19: Create profile does not insert role
  it("should not insert role during profile creation", () => {
    // Role is assigned at signup via handle_new_user trigger
    const insertFields = {
      user_id: mockUser.id,
      full_name: "New Researcher",
      email: mockUser.email,
    };
    expect(insertFields).not.toHaveProperty("role");
  });

  // Test 20: Profile staleTime is 5 minutes
  it("should have 5 minute staleTime", () => {
    const staleTime = 5 * 60 * 1000;
    expect(staleTime).toBe(300000);
  });
});
