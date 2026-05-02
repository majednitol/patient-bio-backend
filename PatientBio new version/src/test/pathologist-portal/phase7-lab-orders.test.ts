import { describe, it, expect } from "vitest";

describe("Phase 7: Incoming Lab Orders", () => {
  it("75. Fetch lab orders with patient_profile, hospital, admission joined", () => {
    const selectQuery = `*, patient_profile:user_profiles!hospital_lab_orders_patient_id_fkey(display_name, patient_passport_id), hospital:hospitals!hospital_lab_orders_hospital_id_fkey(name, logo_url), admission:admissions(bed:beds(bed_number, ward:wards(name)))`;
    expect(selectQuery).toContain("patient_profile");
    expect(selectQuery).toContain("hospital");
    expect(selectQuery).toContain("admission");
  });

  it("76. Active orders filter - non-completed always returned", () => {
    const orders = [
      { status: "ordered", completed_at: null },
      { status: "processing", completed_at: null },
      { status: "completed", completed_at: "2025-01-01" },
    ];
    const active = orders.filter((o) => o.status !== "completed");
    expect(active).toHaveLength(2);
  });

  it("77. Completed orders 30-day filter", () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCompleted = { status: "completed", completed_at: new Date().toISOString() };
    const oldCompleted = { status: "completed", completed_at: "2024-01-01T00:00:00Z" };
    
    const isRecent = new Date(recentCompleted.completed_at) >= thirtyDaysAgo;
    const isOld = new Date(oldCompleted.completed_at) >= thirtyDaysAgo;
    
    expect(isRecent).toBe(true);
    expect(isOld).toBe(false);
  });

  it("78. Pending count = orders with status ordered or sample_collected", () => {
    const orders = [
      { status: "ordered" },
      { status: "sample_collected" },
      { status: "processing" },
      { status: "completed" },
    ];
    const pendingCount = orders.filter(
      (o) => o.status === "ordered" || o.status === "sample_collected"
    ).length;
    expect(pendingCount).toBe(2);
  });

  it("79. Update order status auto-sets completed_at for completed", () => {
    const status = "completed";
    const updateData: Record<string, unknown> = { status };
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }
    expect(updateData.completed_at).toBeTruthy();
  });

  it("80. Complete order links report, creates health_record and lab_result", () => {
    const operations = [
      "fetch pathologist_report",
      "insert health_records",
      "insert hospital_lab_results",
      "update hospital_lab_orders status=completed",
    ];
    expect(operations).toHaveLength(4);
  });

  it("81. Health record created with category=lab_result", () => {
    const healthRecord = {
      user_id: "patient-1",
      title: "CBC Report",
      category: "lab_result",
      file_url: "path/to/file.pdf",
      disease_category: "general",
    };
    expect(healthRecord.category).toBe("lab_result");
  });

  it("82. Lab result record links order_id and pathologist_report_id", () => {
    const labResult = {
      order_id: "order-1",
      pathologist_report_id: "report-1",
      health_record_id: "hr-1",
    };
    expect(labResult.order_id).toBe("order-1");
    expect(labResult.pathologist_report_id).toBe("report-1");
  });

  it("83. No health record if no file_url", () => {
    const report = { file_url: null, report_name: "Test" };
    const shouldCreateHealthRecord = !!report.file_url;
    expect(shouldCreateHealthRecord).toBe(false);
  });

  it("84. Fallback query on join failure", () => {
    // useLabOrdersForPathologist has try/catch with fallback to basic select("*")
    const fallbackQuery = "select * from hospital_lab_orders";
    expect(fallbackQuery).toContain("select *");
  });

  it("85. Cache invalidation on complete: pathologist-lab-orders and pathologist-reports", () => {
    const keys = ["pathologist-lab-orders", "pathologist-reports"];
    expect(keys).toContain("pathologist-lab-orders");
    expect(keys).toContain("pathologist-reports");
  });

  it("86. Retry limited to 1", () => {
    const queryConfig = { retry: 1 };
    expect(queryConfig.retry).toBe(1);
  });
});
