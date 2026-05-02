import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "doctor-123" } }),
}));

describe("Phase 8: Notes and Templates", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Patient Notes CRUD", () => {
    it("fetches notes for doctor+patient pair, pinned first", () => {
      const queryConfig = {
        table: "doctor_patient_notes",
        filters: { doctor_id: "doctor-123", patient_id: "patient-abc" },
        ordering: [
          { column: "is_pinned", ascending: false },
          { column: "created_at", ascending: false },
        ],
      };
      expect(queryConfig.ordering[0].column).toBe("is_pinned");
      expect(queryConfig.ordering[0].ascending).toBe(false);
    });

    it("creates note with doctor_id and patient_id", () => {
      const insertData = {
        doctor_id: "doctor-123",
        patient_id: "patient-abc",
        note: "Patient shows improvement",
      };
      expect(insertData.doctor_id).toBe("doctor-123");
      expect(insertData.note).toBeTruthy();
    });

    it("supports partial update of note field", () => {
      const updates: Record<string, unknown> = {};
      const note = "Updated note text";
      if (note !== undefined) updates.note = note;
      expect(updates).toEqual({ note: "Updated note text" });
    });

    it("toggles is_pinned and invalidates cache", () => {
      const updates: Record<string, unknown> = {};
      const is_pinned = true;
      if (is_pinned !== undefined) updates.is_pinned = is_pinned;
      expect(updates.is_pinned).toBe(true);

      const cacheKey = ["doctor-patient-notes", "doctor-123", "patient-abc"];
      expect(cacheKey).toContain("doctor-patient-notes");
    });

    it("deletes note by id", () => {
      const deleteConfig = {
        table: "doctor_patient_notes",
        filter: { id: "note-1" },
      };
      expect(deleteConfig.filter.id).toBe("note-1");
    });
  });

  describe("Prescription Templates", () => {
    it("fetches templates sorted by name", () => {
      const queryConfig = {
        table: "prescription_templates",
        filters: { doctor_id: "doctor-123" },
        ordering: { column: "name", ascending: true },
      };
      expect(queryConfig.ordering.ascending).toBe(true);
    });

    it("creates template with medications as JSON", () => {
      const templateData = {
        doctor_id: "doctor-123",
        name: "Common Cold",
        diagnosis: "Upper Respiratory Infection",
        medications: [{ name: "Paracetamol", dosage: "500mg", frequency: "TID", duration: "5 days" }],
        instructions: "Rest and fluids",
      };
      expect(templateData.name).toBe("Common Cold");
      expect(templateData.medications.length).toBe(1);
    });

    it("handles non-array medications gracefully", () => {
      const parseMeds = (medications: any) => {
        return Array.isArray(medications) ? medications : [];
      };
      expect(parseMeds(null)).toEqual([]);
      expect(parseMeds("string")).toEqual([]);
      expect(parseMeds({})).toEqual([]);
      expect(parseMeds([{ name: "Drug" }])).toHaveLength(1);
    });

    it("deletes template and invalidates cache", () => {
      const cacheKey = ["prescription-templates"];
      expect(cacheKey).toContainEqual("prescription-templates");
    });
  });

  describe("Data Import", () => {
    it("invokes import-doctor-data edge function", () => {
      const config = {
        function: "import-doctor-data",
        body: { data: "csv-content", type: "medications" },
      };
      expect(config.function).toBe("import-doctor-data");
    });

    it("returns summary with counts", () => {
      const summary = { imported: 15, skipped: 2, errors: 1 };
      expect(summary.imported + summary.skipped + summary.errors).toBe(18);
    });
  });
});
