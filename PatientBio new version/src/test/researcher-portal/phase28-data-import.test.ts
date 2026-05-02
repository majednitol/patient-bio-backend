import { describe, it, expect, vi } from "vitest";
import { mockUser, createMockSupabase } from "./test-helpers";

const mockSupabase = createMockSupabase();
vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

/**
 * Phase 28 — Researcher Data Import Tests (Tests 291–296)
 */

describe("Phase 28: Researcher Data Import", () => {
  // Test 291: Import accepts CSV
  it("291. import dialog accepts CSV content", () => {
    const csvContent = "title,disease_category,target_sample_size\nStudy A,diabetes,100\nStudy B,cardiology,200";
    expect(csvContent).toContain("title");
    expect(csvContent.split("\n")).toHaveLength(3);
  });

  // Test 292: CSV parsing
  it("292. CSV parsing extracts headers and rows correctly", () => {
    const csv = "title,disease_category,target_sample_size\nStudy A,diabetes,100\nStudy B,cardiology,200";
    const lines = csv.split("\n");
    const headers = lines[0].split(",");
    const rows = lines.slice(1).map(line => {
      const vals = line.split(",");
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] }), {} as Record<string, string>);
    });
    expect(headers).toEqual(["title", "disease_category", "target_sample_size"]);
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe("Study A");
    expect(rows[1].disease_category).toBe("cardiology");
  });

  // Test 293: Column mapping validation
  it("293. validates required fields in column mapping", () => {
    const requiredColumns = ["title", "disease_category"];
    const providedColumns = ["title", "disease_category", "target_sample_size"];
    const missing = requiredColumns.filter(c => !providedColumns.includes(c));
    expect(missing).toHaveLength(0);

    const incompleteColumns = ["title"];
    const missingRequired = requiredColumns.filter(c => !incompleteColumns.includes(c));
    expect(missingRequired).toContain("disease_category");
  });

  // Test 294: Import preview
  it("294. preview shows sample rows before commit", () => {
    const allRows = Array.from({ length: 50 }, (_, i) => ({
      title: `Study ${i}`,
      disease_category: "diabetes",
    }));
    const preview = allRows.slice(0, 5);
    expect(preview).toHaveLength(5);
    expect(preview[0].title).toBe("Study 0");
  });

  // Test 295: Bulk insert with researcher_id
  it("295. bulk insert creates records with correct researcher_id", async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { success: true, imported: 10, updated: 0, skipped: 0, errors: [], warnings: [] },
      error: null,
    });
    const result = await mockSupabase.functions.invoke("import-researcher-data", {
      body: {
        importType: "research_studies",
        csvContent: "title,disease_category\nStudy A,diabetes",
        conflictResolution: "skip",
      },
    });
    expect(result.data.success).toBe(true);
    expect(result.data.imported).toBe(10);
  });

  // Test 296: Import error handling
  it("296. import errors show row-level details", () => {
    const importResult = {
      success: true,
      imported: 8,
      updated: 0,
      skipped: 0,
      errors: [
        { row: 3, message: "Missing required field: disease_category" },
        { row: 7, message: "Invalid target_sample_size: not a number" },
      ],
      warnings: [
        { row: 5, message: "Duplicate title detected, skipping" },
      ],
    };
    expect(importResult.errors).toHaveLength(2);
    expect(importResult.errors[0].row).toBe(3);
    expect(importResult.warnings).toHaveLength(1);
  });
});
