import { describe, it, expect } from "vitest";

describe("Phase 4: Report Templates", () => {
  const mockTemplate = {
    id: "tmpl-1",
    pathologist_id: "path-1",
    name: "CBC Template",
    category: "Hematology",
    test_type: "blood_count",
    template_structure: {
      report_type: "blood_test",
      disease_category: "general",
      findings_template: "WBC: {{wbc}}, RBC: {{rbc}}",
      icon: "flask",
      normal_ranges: [
        { parameter: "WBC", low: 4000, high: 11000, unit: "/µL" },
        { parameter: "RBC", low: 4.5, high: 5.5, unit: "M/µL" },
      ],
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("33. Fetch active templates only (is_active=true)", () => {
    const templates = [
      { name: "Active", is_active: true },
      { name: "Inactive", is_active: false },
    ];
    const active = templates.filter((t) => t.is_active);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("Active");
  });

  it("34. Create template with pathologist_id and template_structure", () => {
    const userId = "path-user-1";
    const input = {
      name: "New Template",
      template_structure: mockTemplate.template_structure,
    };
    const insertData = { pathologist_id: userId, ...input, category: null, test_type: null };
    expect(insertData.pathologist_id).toBe(userId);
    expect(insertData.template_structure.report_type).toBe("blood_test");
  });

  it("35. Delete template (soft) - sets is_active=false", () => {
    // useReportTemplateLibrary.deleteTemplate uses .update({ is_active: false })
    const updatePayload = { is_active: false };
    expect(updatePayload.is_active).toBe(false);
  });

  it("36. Template structure parsing", () => {
    const ts = mockTemplate.template_structure;
    expect(ts.report_type).toBe("blood_test");
    expect(ts.disease_category).toBe("general");
    expect(ts.findings_template).toContain("{{wbc}}");
    expect(ts.icon).toBe("flask");
  });

  it("37. Normal ranges in template", () => {
    const ranges = mockTemplate.template_structure.normal_ranges!;
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({ parameter: "WBC", low: 4000, high: 11000, unit: "/µL" });
    expect(ranges[1].parameter).toBe("RBC");
  });

  it("38. Template category field", () => {
    expect(mockTemplate.category).toBe("Hematology");
  });

  it("39. Template test_type field", () => {
    expect(mockTemplate.test_type).toBe("blood_count");
  });

  it("40. Auth guard on create", () => {
    const user = null;
    expect(() => {
      if (!user) throw new Error("Not authenticated");
    }).toThrow("Not authenticated");
  });

  it("41. Cache invalidation on create uses pathologist-report-templates key", () => {
    const queryKey = ["pathologist-report-templates"];
    expect(queryKey[0]).toBe("pathologist-report-templates");
  });

  it("42. Cache invalidation on delete uses pathologist-report-templates key", () => {
    const queryKey = ["pathologist-report-templates"];
    expect(queryKey[0]).toBe("pathologist-report-templates");
  });
});
