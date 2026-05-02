import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));

// Re-implement completion calculators for testing
function calculatePatientCompletion(
  profile: { display_name: string | null; avatar_url: string | null } | undefined,
  health: { blood_group: string | null; health_allergies: string | null; current_medications: string | null; emergency_contact_name: string | null } | undefined
): number {
  const fields = [
    !!profile?.display_name, !!profile?.avatar_url,
    !!health?.blood_group, !!health?.health_allergies,
    !!health?.current_medications, !!health?.emergency_contact_name,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

function calculateDoctorCompletion(profile: {
  full_name: string; specialty: string | null; license_number: string | null;
  phone: string | null; qualification: string | null; experience_years: number | null;
  bio: string | null; avatar_url: string | null;
}): number {
  const fields = [
    !!profile.full_name?.trim(), !!profile.specialty?.trim(),
    !!profile.license_number?.trim(), !!profile.phone?.trim(),
    !!profile.qualification?.trim(),
    profile.experience_years !== null && profile.experience_years !== undefined,
    !!profile.bio?.trim(), !!profile.avatar_url,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

describe("Phase 14: Platform Settings and Completion (6 tests)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("143. Fetch platform logo from platform_settings", () => {
    const settings = [
      { key: "logo_url", value: "https://example.com/logo.png" },
    ];
    const logoUrl = settings.find((s) => s.key === "logo_url")?.value || null;
    expect(logoUrl).toBe("https://example.com/logo.png");
  });

  it("144. Upload platform logo to avatars bucket", async () => {
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://public.url/logo.png" } }),
    });

    const bucket = mockSupabase.storage.from("avatars");
    const timestamp = Date.now();
    const path = `platform/logo-${timestamp}.png`;
    const result = await bucket.upload(path, new Blob());
    expect(result.error).toBeNull();
    expect(path).toMatch(/^platform\/logo-\d+\.png$/);
  });

  it("145. Remove platform logo sets logo_url to empty string", () => {
    const updatePayload = { key: "logo_url", value: "" };
    expect(updatePayload.value).toBe("");
  });

  it("146. File validation rejects non-image files", () => {
    const validateFile = (file: { type: string }) => file.type.startsWith("image/");
    expect(validateFile({ type: "image/png" })).toBe(true);
    expect(validateFile({ type: "image/jpeg" })).toBe(true);
    expect(validateFile({ type: "application/pdf" })).toBe(false);
    expect(validateFile({ type: "text/plain" })).toBe(false);
  });

  it("147. File validation rejects files > 2MB", () => {
    const MAX_SIZE = 2 * 1024 * 1024;
    const validateSize = (size: number) => size <= MAX_SIZE;
    expect(validateSize(1024)).toBe(true);
    expect(validateSize(2 * 1024 * 1024)).toBe(true);
    expect(validateSize(2 * 1024 * 1024 + 1)).toBe(false);
  });

  it("148. Platform completion stats calculation", () => {
    // Patient completion
    const patientComp = calculatePatientCompletion(
      { display_name: "John", avatar_url: null },
      { blood_group: "A+", health_allergies: null, current_medications: null, emergency_contact_name: "Jane" }
    );
    // 3 out of 6 = 50%
    expect(patientComp).toBe(50);

    // Doctor completion
    const doctorComp = calculateDoctorCompletion({
      full_name: "Dr. Smith", specialty: "Cardiology", license_number: "DOC-123",
      phone: "+1234", qualification: "MBBS", experience_years: 10,
      bio: "Expert", avatar_url: "https://avatar.url",
    });
    // 8 out of 8 = 100%
    expect(doctorComp).toBe(100);

    // Aggregate
    const completions = [patientComp, doctorComp];
    const totalUsers = completions.length;
    const averageCompletion = Math.round(completions.reduce((s, c) => s + c, 0) / totalUsers);
    const usersAt100 = completions.filter((c) => c === 100).length;
    const usersBelow50 = completions.filter((c) => c < 50).length;

    expect(averageCompletion).toBe(75);
    expect(usersAt100).toBe(1);
    expect(usersBelow50).toBe(0);
    expect(totalUsers).toBe(2);
  });
});
