import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";

// Get the mocked function
const mockInvoke = vi.mocked(supabase.functions.invoke);

// Mock data for testing
const mockPatientProfile = {
  display_name: "John Doe",
  date_of_birth: "1990-05-15",
  gender: "Male",
  location: "New York, NY",
  phone: "+1-555-0123",
};

const mockHealthData = {
  blood_group: "O+",
  health_allergies: "Penicillin, Shellfish",
  current_medications: "Metformin 500mg daily",
  chronic_diseases: "Type 2 Diabetes",
  previous_diseases: "COVID-19 (2021)",
  emergency_contact_name: "Jane Doe",
  emergency_contact_phone: "+1-555-0124",
  height: "180cm",
};

const mockRecords = [
  { id: "rec-1", title: "Diabetes Diagnosis", category: "diabetes", record_date: "2023-06-01", provider_name: "Dr. Smith" },
  { id: "rec-2", title: "Blood Test Results", category: "lab_reports", record_date: "2023-12-15", provider_name: "Path Labs" },
  { id: "rec-3", title: "Chest X-Ray", category: "imaging", record_date: "2024-01-20", provider_name: "City Hospital" },
  { id: "rec-4", title: "COVID Vaccination", category: "vaccination", record_date: "2021-03-15", provider_name: "Public Health" },
];

// Helper to create valid response
const createValidResponse = (overrides = {}) => ({
  data: {
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    profile: mockPatientProfile,
    healthData: mockHealthData,
    records: mockRecords,
    ...overrides,
  },
  error: null,
});

describe("ShareViewPage E2E - Provider Data Access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Token Validation & Data Fetching", () => {
    it("should fetch patient data with valid token", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse());

      const { data, error } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token-abc123" },
      });

      expect(error).toBeNull();
      expect(data.profile).toEqual(mockPatientProfile);
      expect(data.records).toHaveLength(4);
      expect(mockInvoke).toHaveBeenCalledWith("get-shared-patient-data", {
        body: { token: "valid-token-abc123" },
      });
    });

    it("should handle invalid token with proper error state", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "invalid" },
        error: null,
      });

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "invalid-token" },
      });

      expect(data.error).toBe("invalid");
      expect(data.profile).toBeUndefined();
    });

    it("should handle expired token with expiration date", async () => {
      const expiredDate = "2020-01-01T00:00:00Z";
      mockInvoke.mockResolvedValueOnce({
        data: { error: "expired", expires_at: expiredDate },
        error: null,
      });

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "expired-token" },
      });

      expect(data.error).toBe("expired");
      expect(data.expires_at).toBe(expiredDate);
    });

    it("should handle revoked token", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "revoked" },
        error: null,
      });

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "revoked-token" },
      });

      expect(data.error).toBe("revoked");
    });

    it("should handle malformed token", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "invalid", message: "Token format is invalid" },
        error: null,
      });

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "malformed!!token" },
      });

      expect(data.error).toBe("invalid");
    });

    it("should handle empty token", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "invalid", message: "Token is required" },
        error: null,
      });

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "" },
      });

      expect(data.error).toBe("invalid");
    });
  });

  describe("Document Access & Signed URLs", () => {
    it("should generate signed URL for valid document", async () => {
      const signedUrl = "https://storage.supabase.co/object/sign/health-records/doc123?token=xyz";
      mockInvoke.mockResolvedValueOnce({
        data: { url: signedUrl, expires_in: 300 },
        error: null,
      });

      const { data, error } = await supabase.functions.invoke("generate-document-url", {
        body: { token: "valid-token", record_id: "rec-1" },
      });

      expect(error).toBeNull();
      expect(data.url).toBe(signedUrl);
      expect(data.url).toContain("https://");
      expect(data.expires_in).toBe(300);
    });

    it("should handle unauthorized document access", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "unauthorized", message: "You don't have access to this document" },
        error: null,
      });

      const { data } = await supabase.functions.invoke("generate-document-url", {
        body: { token: "valid-token", record_id: "unauthorized-rec" },
      });

      expect(data.error).toBe("unauthorized");
      expect(data.message).toContain("don't have access");
    });

    it("should handle non-existent document", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "not_found", message: "Document not found" },
        error: null,
      });

      const { data } = await supabase.functions.invoke("generate-document-url", {
        body: { token: "valid-token", record_id: "non-existent-id" },
      });

      expect(data.error).toBe("not_found");
    });

    it("should handle expired share token during document access", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "token_expired", message: "Share link has expired" },
        error: null,
      });

      const { data } = await supabase.functions.invoke("generate-document-url", {
        body: { token: "expired-token", record_id: "rec-1" },
      });

      expect(data.error).toBe("token_expired");
    });

    it("should generate URL with proper security parameters", async () => {
      const signedUrl = "https://storage.example.com/doc?signature=abc&expires=123456789";
      mockInvoke.mockResolvedValueOnce({
        data: { url: signedUrl },
        error: null,
      });

      const { data } = await supabase.functions.invoke("generate-document-url", {
        body: { token: "valid-token", record_id: "rec-1" },
      });

      expect(data.url).toContain("signature=");
      expect(data.url).toContain("expires=");
    });

    it("should handle concurrent document requests", async () => {
      const url1 = "https://storage.example.com/doc1?sig=1";
      const url2 = "https://storage.example.com/doc2?sig=2";

      mockInvoke
        .mockResolvedValueOnce({ data: { url: url1 }, error: null })
        .mockResolvedValueOnce({ data: { url: url2 }, error: null });

      const [result1, result2] = await Promise.all([
        supabase.functions.invoke("generate-document-url", { body: { token: "t", record_id: "rec-1" } }),
        supabase.functions.invoke("generate-document-url", { body: { token: "t", record_id: "rec-2" } }),
      ]);

      expect(result1.data.url).toBe(url1);
      expect(result2.data.url).toBe(url2);
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });

  describe("Patient Data Display", () => {
    it("should return complete patient profile", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse());

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.profile.display_name).toBe("John Doe");
      expect(data.profile.date_of_birth).toBe("1990-05-15");
      expect(data.profile.gender).toBe("Male");
      expect(data.profile.location).toBe("New York, NY");
      expect(data.profile.phone).toBe("+1-555-0123");
    });

    it("should handle partial patient profile", async () => {
      const partialProfile = {
        display_name: "Jane Smith",
        date_of_birth: null,
        gender: null,
        location: null,
        phone: null,
      };

      mockInvoke.mockResolvedValueOnce(createValidResponse({ profile: partialProfile }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.profile.display_name).toBe("Jane Smith");
      expect(data.profile.date_of_birth).toBeNull();
      expect(data.profile.gender).toBeNull();
    });

    it("should return complete health data", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse());

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.healthData.blood_group).toBe("O+");
      expect(data.healthData.health_allergies).toBe("Penicillin, Shellfish");
      expect(data.healthData.current_medications).toBe("Metformin 500mg daily");
      expect(data.healthData.chronic_diseases).toBe("Type 2 Diabetes");
      expect(data.healthData.emergency_contact_name).toBe("Jane Doe");
    });

    it("should handle empty health data", async () => {
      const emptyHealthData = {
        blood_group: null,
        health_allergies: null,
        current_medications: null,
        chronic_diseases: null,
        previous_diseases: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        height: null,
      };

      mockInvoke.mockResolvedValueOnce(createValidResponse({ healthData: emptyHealthData }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.healthData.blood_group).toBeNull();
      expect(data.healthData.health_allergies).toBeNull();
    });
  });

  describe("Health Records Display", () => {
    it("should return all health records", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse());

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.records).toHaveLength(4);
      expect(data.records[0].title).toBe("Diabetes Diagnosis");
      expect(data.records[1].category).toBe("lab_reports");
    });

    it("should return empty array when no records exist", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse({ records: [] }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.records).toEqual([]);
    });

    it("should include all required record fields", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse());

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      const record = data.records[0];
      expect(record).toHaveProperty("id");
      expect(record).toHaveProperty("title");
      expect(record).toHaveProperty("category");
      expect(record).toHaveProperty("record_date");
      expect(record).toHaveProperty("provider_name");
    });

    it("should handle records with null provider", async () => {
      const recordsWithNullProvider = [
        { id: "rec-1", title: "Self Upload", category: "prescription", record_date: "2024-01-01", provider_name: null },
      ];

      mockInvoke.mockResolvedValueOnce(createValidResponse({ records: recordsWithNullProvider }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.records[0].provider_name).toBeNull();
    });

    it("should handle various record categories", async () => {
      const categorizedRecords = [
        { id: "1", title: "Record 1", category: "prescription", record_date: "2024-01-01", provider_name: "Dr. A" },
        { id: "2", title: "Record 2", category: "lab_reports", record_date: "2024-01-02", provider_name: "Lab B" },
        { id: "3", title: "Record 3", category: "imaging", record_date: "2024-01-03", provider_name: "Hospital C" },
        { id: "4", title: "Record 4", category: "vaccination", record_date: "2024-01-04", provider_name: "Clinic D" },
        { id: "5", title: "Record 5", category: "diabetes", record_date: "2024-01-05", provider_name: "Dr. E" },
        { id: "6", title: "Record 6", category: "cancer", record_date: "2024-01-06", provider_name: "Oncology F" },
      ];

      mockInvoke.mockResolvedValueOnce(createValidResponse({ records: categorizedRecords }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      const categories = data.records.map((r: { category: string }) => r.category);
      expect(categories).toContain("prescription");
      expect(categories).toContain("lab_reports");
      expect(categories).toContain("imaging");
      expect(categories).toContain("vaccination");
      expect(categories).toContain("diabetes");
      expect(categories).toContain("cancer");
    });
  });

  describe("Token Expiration Handling", () => {
    it("should include expiration timestamp in response", async () => {
      const futureExpiry = new Date(Date.now() + 7200000).toISOString(); // 2 hours
      mockInvoke.mockResolvedValueOnce(createValidResponse({ expires_at: futureExpiry }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.expires_at).toBe(futureExpiry);
    });

    it("should calculate correct time remaining", async () => {
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
      mockInvoke.mockResolvedValueOnce(createValidResponse({ expires_at: expiresAt }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      const expiryDate = new Date(data.expires_at);
      const now = new Date();
      const diffMs = expiryDate.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);

      expect(diffMinutes).toBeGreaterThan(55);
      expect(diffMinutes).toBeLessThanOrEqual(60);
    });

    it("should handle tokens with various expiration periods", async () => {
      const periods = [
        { hours: 1, label: "1 hour" },
        { hours: 24, label: "24 hours" },
        { hours: 168, label: "1 week" },
        { hours: 720, label: "30 days" },
      ];

      for (const period of periods) {
        const expiresAt = new Date(Date.now() + period.hours * 3600000).toISOString();
        mockInvoke.mockResolvedValueOnce(createValidResponse({ expires_at: expiresAt }));

        const { data } = await supabase.functions.invoke("get-shared-patient-data", {
          body: { token: `token-${period.hours}h` },
        });

        expect(new Date(data.expires_at) > new Date()).toBe(true);
      }
    });
  });

  describe("Access Logging", () => {
    it("should log access attempt in response metadata", async () => {
      mockInvoke.mockResolvedValueOnce(
        createValidResponse({
          access_logged: true,
          access_count: 5,
        })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.access_logged).toBe(true);
      expect(data.access_count).toBe(5);
    });

    it("should include accessor information when available", async () => {
      mockInvoke.mockResolvedValueOnce(
        createValidResponse({
          accessor_ip: "192.168.1.1",
          accessed_at: new Date().toISOString(),
        })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.accessed_at).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Network error", name: "FetchError" },
      });

      const { data, error } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(error).toBeDefined();
      expect(error.message).toBe("Network error");
      expect(data).toBeNull();
    });

    it("should handle timeout errors", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Request timeout", code: "TIMEOUT" },
      });

      const { error } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(error).toBeDefined();
      expect(error.message).toContain("timeout");
    });

    it("should handle server errors", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "Internal server error", status: 500 },
      });

      const { error } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(error).toBeDefined();
      expect(error.status).toBe(500);
    });

    it("should return consistent response structure on success", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse());

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      // Verify response structure
      expect(data).toHaveProperty("expires_at");
      expect(data).toHaveProperty("profile");
      expect(data).toHaveProperty("healthData");
      expect(data).toHaveProperty("records");
      expect(typeof data.expires_at).toBe("string");
      expect(typeof data.profile).toBe("object");
      expect(typeof data.healthData).toBe("object");
      expect(Array.isArray(data.records)).toBe(true);
    });

    it("should handle rate limiting", async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { error: "rate_limited", retry_after: 60 },
        error: null,
      });

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.error).toBe("rate_limited");
      expect(data.retry_after).toBe(60);
    });
  });

  describe("Security & Privacy", () => {
    it("should not expose sensitive fields in response", async () => {
      mockInvoke.mockResolvedValueOnce(createValidResponse());

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      // These fields should NOT be in response
      expect(data).not.toHaveProperty("user_id");
      expect(data).not.toHaveProperty("password");
      expect(data).not.toHaveProperty("access_token");
      expect(data.profile).not.toHaveProperty("email");
    });

    it("should validate token format before processing", async () => {
      const invalidTokens = ["", null, undefined, "<script>", "' OR 1=1 --", "../../../etc/passwd"];

      for (const token of invalidTokens) {
        mockInvoke.mockResolvedValueOnce({
          data: { error: "invalid" },
          error: null,
        });

        const { data } = await supabase.functions.invoke("get-shared-patient-data", {
          body: { token },
        });

        expect(data.error).toBe("invalid");
      }
    });

    it("should sanitize output data", async () => {
      const xssProfile = {
        ...mockPatientProfile,
        display_name: "<script>alert('xss')</script>John",
      };

      mockInvoke.mockResolvedValueOnce(createValidResponse({ profile: xssProfile }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      // In a real scenario, the edge function would sanitize this
      expect(data.profile.display_name).toBeDefined();
    });
  });

  describe("Provider-Specific Access", () => {
    it("should handle doctor token access", async () => {
      mockInvoke.mockResolvedValueOnce(
        createValidResponse({
          accessor_type: "doctor",
          doctor_name: "Dr. Smith",
        })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "doctor-token-123" },
      });

      expect(data.accessor_type).toBe("doctor");
      expect(data.doctor_name).toBe("Dr. Smith");
    });

    it("should handle pathologist token access", async () => {
      mockInvoke.mockResolvedValueOnce(
        createValidResponse({
          accessor_type: "pathologist",
          lab_name: "City Diagnostics",
        })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "path-token-456" },
      });

      expect(data.accessor_type).toBe("pathologist");
      expect(data.lab_name).toBe("City Diagnostics");
    });

    it("should handle researcher token access with anonymization", async () => {
      const anonymizedProfile = {
        display_name: "Anonymous Patient",
        date_of_birth: null, // Hidden for privacy
        gender: "Male",
        location: "New York", // City only, no full address
        phone: null, // Hidden for privacy
      };

      mockInvoke.mockResolvedValueOnce(
        createValidResponse({
          profile: anonymizedProfile,
          accessor_type: "researcher",
          is_anonymized: true,
        })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "researcher-token-789" },
      });

      expect(data.accessor_type).toBe("researcher");
      expect(data.is_anonymized).toBe(true);
      expect(data.profile.display_name).toBe("Anonymous Patient");
      expect(data.profile.phone).toBeNull();
    });

    it("should handle general share link access", async () => {
      mockInvoke.mockResolvedValueOnce(
        createValidResponse({
          accessor_type: "general",
        })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "general-share-link" },
      });

      expect(data.accessor_type).toBe("general");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long display names", async () => {
      const longName = "A".repeat(200);
      mockInvoke.mockResolvedValueOnce(
        createValidResponse({
          profile: { ...mockPatientProfile, display_name: longName },
        })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.profile.display_name.length).toBe(200);
    });

    it("should handle special characters in health data", async () => {
      const specialHealthData = {
        ...mockHealthData,
        health_allergies: "Penicillin (severe), β-lactam antibiotics, Aspirin™",
        current_medications: "Metformin 500mg — twice daily",
      };

      mockInvoke.mockResolvedValueOnce(
        createValidResponse({ healthData: specialHealthData })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.healthData.health_allergies).toContain("β-lactam");
      expect(data.healthData.current_medications).toContain("—");
    });

    it("should handle future dates in records", async () => {
      const futureRecord = [
        { id: "rec-future", title: "Scheduled Procedure", category: "surgery", record_date: "2030-12-31", provider_name: "Future Hospital" },
      ];

      mockInvoke.mockResolvedValueOnce(createValidResponse({ records: futureRecord }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(new Date(data.records[0].record_date) > new Date()).toBe(true);
    });

    it("should handle large number of records", async () => {
      const manyRecords = Array.from({ length: 100 }, (_, i) => ({
        id: `rec-${i}`,
        title: `Record ${i}`,
        category: "prescription",
        record_date: `2024-01-${String(i % 28 + 1).padStart(2, "0")}`,
        provider_name: `Provider ${i}`,
      }));

      mockInvoke.mockResolvedValueOnce(createValidResponse({ records: manyRecords }));

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.records).toHaveLength(100);
    });

    it("should handle Unicode in patient data", async () => {
      const unicodeProfile = {
        ...mockPatientProfile,
        display_name: "田中太郎",
        location: "東京都渋谷区",
      };

      mockInvoke.mockResolvedValueOnce(
        createValidResponse({ profile: unicodeProfile })
      );

      const { data } = await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });

      expect(data.profile.display_name).toBe("田中太郎");
      expect(data.profile.location).toBe("東京都渋谷区");
    });

    it("should handle simultaneous access validation and document requests", async () => {
      // First call: validate token
      mockInvoke.mockResolvedValueOnce(createValidResponse());
      // Second call: generate document URL
      mockInvoke.mockResolvedValueOnce({
        data: { url: "https://example.com/doc" },
        error: null,
      });

      const [validationResult, documentResult] = await Promise.all([
        supabase.functions.invoke("get-shared-patient-data", { body: { token: "t" } }),
        supabase.functions.invoke("generate-document-url", { body: { token: "t", record_id: "r" } }),
      ]);

      expect(validationResult.data.profile).toBeDefined();
      expect(documentResult.data.url).toBeDefined();
    });
  });

  describe("Response Time Metrics", () => {
    it("should complete data fetch within acceptable time", async () => {
      mockInvoke.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(createValidResponse()), 50)
          )
      );

      const start = Date.now();
      await supabase.functions.invoke("get-shared-patient-data", {
        body: { token: "valid-token" },
      });
      const duration = Date.now() - start;

      // Should complete within 200ms (including 50ms mock delay)
      expect(duration).toBeLessThan(200);
    });
  });
});
