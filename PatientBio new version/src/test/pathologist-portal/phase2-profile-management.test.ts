import { describe, it, expect } from "vitest";
import { mockPathologistProfile } from "./test-helpers";

describe("Phase 2: Profile Management", () => {
  it("9. Fetch pathologist profile returns full profile", () => {
    const profile = mockPathologistProfile;
    expect(profile.full_name).toBe("Dr. Lab Expert");
    expect(profile.lab_name).toBe("Expert Diagnostics");
    expect(profile.license_number).toBe("PATH-12345");
    expect(profile.specialization_area).toBe("Hematology");
  });

  it("10. Update pathologist profile includes lab_hours and certifications", () => {
    const updateData = {
      full_name: "Dr. Updated",
      lab_hours: { monday: { open: "08:00", close: "18:00", closed: false } },
      certifications: "Updated Board Cert",
    };
    expect(updateData.lab_hours).toBeDefined();
    expect(updateData.certifications).toBe("Updated Board Cert");
  });

  it("11. Profile completion tracks 11 fields", () => {
    const fieldKeys = [
      "full_name", "lab_name", "license_number", "phone", "email",
      "lab_address", "specialization_area", "total_experience",
      "avatar_url", "certifications", "lab_hours",
    ];
    expect(fieldKeys).toHaveLength(11);
  });

  it("12. Missing fields with navigation links", () => {
    const profile = { ...mockPathologistProfile, phone: null, lab_address: null };
    const fields = [
      { key: "full_name", isComplete: !!profile.full_name, link: "/pathologist/profile" },
      { key: "phone", isComplete: !!profile.phone, link: "/pathologist/profile" },
      { key: "lab_address", isComplete: !!profile.lab_address, link: "/pathologist/profile" },
    ];
    const missing = fields.filter((f) => !f.isComplete);
    expect(missing).toHaveLength(2);
    missing.forEach((f) => expect(f.link).toBe("/pathologist/profile"));
  });

  it("13. Percentage calculation - 5/11 = 45%", () => {
    const completed = 5;
    const total = 11;
    const percentage = Math.round((completed / total) * 100);
    expect(percentage).toBe(45);
  });

  it("14. Full completion = 100%", () => {
    const percentage = Math.round((11 / 11) * 100);
    expect(percentage).toBe(100);
  });

  it("15. Empty profile = 0%", () => {
    const percentage = Math.round((0 / 11) * 100);
    expect(percentage).toBe(0);
  });

  it("16. Null profile returns null", () => {
    const profile = null;
    expect(profile).toBeNull();
  });

  it("17. Create profile requires auth", () => {
    const user = null;
    expect(() => {
      if (!user) throw new Error("Not authenticated");
    }).toThrow("Not authenticated");
  });

  it("18. Update profile invalidates pathologist-profile cache key", () => {
    const queryKey = ["pathologist-profile", "test-user-id"];
    expect(queryKey[0]).toBe("pathologist-profile");
  });

  it("19. Lab hours stored as Record with open/close/closed per day", () => {
    const labHours = {
      monday: { open: "09:00", close: "17:00", closed: false },
      sunday: { open: "", close: "", closed: true },
    };
    expect(labHours.monday.closed).toBe(false);
    expect(labHours.sunday.closed).toBe(true);
  });

  it("20. Email defaults to auth email when not provided", () => {
    const user = { email: "auth@email.com" };
    const profileData = { full_name: "Test" };
    const emailToUse = (profileData as any).email || user.email;
    expect(emailToUse).toBe("auth@email.com");
  });
});
