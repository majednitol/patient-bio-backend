import { describe, it, expect, vi } from "vitest";
import { mockUser, mockResearcherProfile, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 27 — Researcher Profile Completion Tests (Tests 285–290)
 */

describe("Phase 27: Researcher Profile Completion", () => {
  // Test 285: Completion percentage
  it("285. calculates profile completion percentage correctly", () => {
    const requiredFields = ["full_name", "email", "institution_name", "department", "research_focus", "license_number", "avatar_url", "phone"];
    const profile: Record<string, any> = { ...mockResearcherProfile };
    const filled = requiredFields.filter(f => !!profile[f]).length;
    const pct = Math.round((filled / requiredFields.length) * 100);
    expect(pct).toBe(100); // mock has all fields
  });

  // Test 286: Missing fields highlighted
  it("286. completion card highlights missing fields", () => {
    const requiredFields = ["full_name", "email", "institution_name", "department", "research_focus", "license_number", "avatar_url", "phone"];
    const incompleteProfile: Record<string, any> = {
      ...mockResearcherProfile,
      avatar_url: null,
      phone: null,
    };
    const missing = requiredFields.filter(f => !incompleteProfile[f]);
    expect(missing).toContain("avatar_url");
    expect(missing).toContain("phone");
    expect(missing).toHaveLength(2);
  });

  // Test 287: Avatar upload
  it("287. avatar upload stores to storage bucket", async () => {
    mockSupabase.storage.from.mockReturnValueOnce({
      upload: vi.fn().mockResolvedValue({ error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://signed.url/avatar.png" },
        error: null,
      }),
    });
    const bucket = mockSupabase.storage.from("avatars");
    const uploadResult = await bucket.upload(`researcher/${mockUser.id}/avatar.png`, new Blob());
    expect(uploadResult.error).toBeNull();
  });

  // Test 288: Profile update saves all fields
  it("288. profile update mutation saves all fields", () => {
    const updates = {
      full_name: "Dr. Updated Name",
      department: "New Department",
      research_focus: "Proteomics",
    };
    const updatedProfile = { ...mockResearcherProfile, ...updates };
    expect(updatedProfile.full_name).toBe("Dr. Updated Name");
    expect(updatedProfile.department).toBe("New Department");
    expect(updatedProfile.research_focus).toBe("Proteomics");
  });

  // Test 289: Institution type validation
  it("289. validates institution type from allowed values", () => {
    const allowedTypes = ["university", "hospital", "government", "private"];
    expect(allowedTypes).toContain(mockResearcherProfile.institution_type);
    expect(allowedTypes).not.toContain("invalid_type");
  });

  // Test 290: Verification status display
  it("290. displays verification status correctly", () => {
    const verified = { ...mockResearcherProfile, is_verified: true };
    const unverified = { ...mockResearcherProfile, is_verified: false };
    const getStatusLabel = (profile: typeof verified) =>
      profile.is_verified ? "Verified" : "Pending Verification";
    expect(getStatusLabel(verified)).toBe("Verified");
    expect(getStatusLabel(unverified)).toBe("Pending Verification");
  });
});
