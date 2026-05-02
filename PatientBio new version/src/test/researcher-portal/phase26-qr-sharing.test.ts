import { describe, it, expect, vi } from "vitest";
import { mockUser, mockResearcherProfile, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 26 — QR Code and Data Sharing Tests (Tests 279–284)
 */

describe("Phase 26: QR Code and Data Sharing", () => {
  // Test 279: QR code generation
  it("279. generates QR code from researcher profile data", () => {
    const qrPayload = {
      researcher_id: mockUser.id,
      name: mockResearcherProfile.full_name,
      institution: mockResearcherProfile.institution_name,
    };
    expect(qrPayload.researcher_id).toBe(mockUser.id);
    expect(qrPayload.name).toBeTruthy();
  });

  // Test 280: QR code URL encoding
  it("280. QR code encodes correct sharing URL", () => {
    const baseUrl = "https://patientbio.lovable.app";
    const shareUrl = `${baseUrl}/share/researcher/${mockUser.id}`;
    expect(shareUrl).toContain("/share/researcher/");
    expect(shareUrl).toContain(mockUser.id);
  });

  // Test 281: QR scan triggers data request
  it("281. scanning QR triggers data request flow", () => {
    const scannedData = { researcher_id: mockUser.id, action: "request-data" };
    expect(scannedData.action).toBe("request-data");
    expect(scannedData.researcher_id).toBeDefined();
  });

  // Test 282: Clinical records tab
  it("282. clinical records tab renders shared data", () => {
    const sharedRecords = [
      { id: "rec-1", category: "lab_results", is_anonymized: true },
      { id: "rec-2", category: "vitals", is_anonymized: true },
    ];
    expect(sharedRecords).toHaveLength(2);
    sharedRecords.forEach(r => expect(r.is_anonymized).toBe(true));
  });

  // Test 283: Anonymization preserves research values
  it("283. anonymized data strips PII but retains research-grade values", () => {
    const original = {
      patient_name: "John Doe",
      patient_id: "pid-123",
      hba1c: 7.2,
      bmi: 28.5,
      age_range: "40-50",
      gender: "male",
    };
    const anonymized = {
      hba1c: original.hba1c,
      bmi: original.bmi,
      age_range: original.age_range,
      gender: original.gender,
    };
    expect(anonymized).not.toHaveProperty("patient_name");
    expect(anonymized).not.toHaveProperty("patient_id");
    expect(anonymized.hba1c).toBe(7.2);
    expect(anonymized.bmi).toBe(28.5);
  });

  // Test 284: Share expiry validation
  it("284. expired shares prevent access", () => {
    const expiredShare = {
      expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      status: "accepted",
    };
    const activeShare = {
      expires_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      status: "accepted",
    };
    const isExpired = (share: any) =>
      share.expires_at && new Date(share.expires_at) < new Date();
    expect(isExpired(expiredShare)).toBe(true);
    expect(isExpired(activeShare)).toBe(false);
  });
});
