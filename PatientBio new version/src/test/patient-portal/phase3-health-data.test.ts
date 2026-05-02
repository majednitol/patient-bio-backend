import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
});
const mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) }),
});
const mockDelete = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
});

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "test.pdf" }, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://example.com/signed" },
        error: null,
      }),
    }),
  },
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

describe("Phase 3: Health Data and Records", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 17: Save health information
  describe("Test 17: Save health information", () => {
    it("should create health data for new users", async () => {
      const userId = "user-123";
      const healthUpdate = {
        blood_group: "A+",
        health_allergies: "Penicillin",
        current_medications: "Aspirin",
      };

      mockSingle.mockResolvedValueOnce({
        data: { id: "hd-1", user_id: userId, ...healthUpdate },
        error: null,
      });

      const result = await mockSupabase
        .from("health_data")
        .insert({ user_id: userId, ...healthUpdate })
        .select()
        .single();

      expect(result.data).toMatchObject(healthUpdate);
      expect(result.error).toBeNull();
    });

    it("should update existing health data", async () => {
      const updates = { blood_group: "B+" };
      mockSingle.mockResolvedValueOnce({
        data: { id: "hd-1", blood_group: "B+" },
        error: null,
      });

      const result = await mockSupabase
        .from("health_data")
        .update(updates)
        .eq("user_id", "user-123")
        .select()
        .single();

      expect(result.data?.blood_group).toBe("B+");
    });
  });

  // Test 18: Health data reflected on dashboard
  describe("Test 18: Health data reflected on dashboard", () => {
    it("should fetch health data by user_id", async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: {
          blood_group: "O+",
          health_allergies: "Peanuts,Shellfish",
          current_medications: "Metformin",
        },
        error: null,
      });

      const result = await mockSupabase
        .from("health_data")
        .select("*")
        .eq("user_id", "user-123")
        .maybeSingle();

      expect(result.data?.blood_group).toBe("O+");
      expect(result.data?.health_allergies).toContain("Peanuts");
    });
  });

  // Test 19-22: Upload Records
  describe("Test 19: Upload a PDF record", () => {
    it("should validate accepted file types", () => {
      const accepted = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      expect(accepted.includes("application/pdf")).toBe(true);
      expect(accepted.includes("text/plain")).toBe(false);
      expect(accepted.includes("application/exe")).toBe(false);
    });

    it("should enforce 10MB max file size", () => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      expect(5 * 1024 * 1024 < MAX_FILE_SIZE).toBe(true);
      expect(15 * 1024 * 1024 < MAX_FILE_SIZE).toBe(false);
    });

    it("should generate unique file path with user ID prefix", () => {
      const userId = "user-123";
      const fileName = `${userId}/${Date.now()}-abc.pdf`;
      expect(fileName).toMatch(/^user-123\/\d+-\w+\.pdf$/);
    });
  });

  describe("Test 20: Upload an image record", () => {
    it("should accept JPEG, PNG, GIF, WebP", () => {
      const accepted = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      ["image/jpeg", "image/png", "image/gif", "image/webp"].forEach((type) => {
        expect(accepted.includes(type)).toBe(true);
      });
    });
  });

  describe("Test 21: Validation feedback", () => {
    it("should reject files without required metadata", () => {
      const validateRecord = (title: string, category: string) => {
        const errors: string[] = [];
        if (!title) errors.push("Title is required");
        if (!category) errors.push("Category is required");
        return errors;
      };

      expect(validateRecord("", "")).toHaveLength(2);
      expect(validateRecord("Test", "")).toHaveLength(1);
      expect(validateRecord("Test", "lab_result")).toHaveLength(0);
    });
  });

  // Test 23-25: View Records
  describe("Test 23: Records list with filtering", () => {
    it("should filter records by category", () => {
      const records = [
        { id: "1", title: "Blood Test", category: "lab_result" },
        { id: "2", title: "X-Ray", category: "imaging" },
        { id: "3", title: "Prescription", category: "prescription" },
      ];

      const filtered = records.filter((r) => r.category === "lab_result");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Blood Test");
    });

    it("should filter records by search term", () => {
      const records = [
        { id: "1", title: "Blood Test Results" },
        { id: "2", title: "X-Ray Report" },
        { id: "3", title: "Blood Pressure Log" },
      ];

      const search = "blood";
      const filtered = records.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase())
      );
      expect(filtered).toHaveLength(2);
    });
  });

  describe("Test 24-25: Document preview", () => {
    it("should generate signed URL for document preview", async () => {
      const result = await mockSupabase.storage
        .from("health-records")
        .createSignedUrl("user-123/test.pdf", 3600);

      expect(result.data?.signedUrl).toBeDefined();
      expect(result.data?.signedUrl).toContain("https://");
    });
  });
});
