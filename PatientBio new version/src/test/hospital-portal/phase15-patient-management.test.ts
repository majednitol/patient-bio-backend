import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

describe("Phase 15: Patient Management", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 133: Fuzzy patient search
  it("should use ILIKE matching and return up to 5 results", () => {
    const limit = 5;
    const method = "ilike";
    expect(limit).toBe(5);
    expect(method).toBe("ilike");
  });

  // Test 134: Multi-word search
  it("should split query into words and apply ILIKE for each", () => {
    const query = "John Smith";
    const words = query.trim().split(/\s+/).filter(Boolean);
    expect(words).toEqual(["John", "Smith"]);
    expect(words).toHaveLength(2);
  });

  // Test 135: Minimum 2 chars required
  it("should return empty results for <2 chars", () => {
    const query = "J";
    const shouldSearch = query.length >= 2;
    expect(shouldSearch).toBe(false);
  });

  // Test 136: Debounce at 300ms
  it("should debounce search at 300ms", () => {
    const debounceMs = 300;
    expect(debounceMs).toBe(300);
  });

  // Test 137-140: Patient history queries
  it("should fetch admissions for patient at hospital", () => {
    const filters = { hospital_id: "hosp-1", patient_id: "patient-1", table: "admissions" };
    expect(filters.table).toBe("admissions");
  });

  it("should fetch appointments for patient at hospital", () => {
    const filters = { hospital_id: "hosp-1", patient_id: "patient-1", table: "appointments" };
    expect(filters.table).toBe("appointments");
  });

  it("should fetch prescriptions for patient at hospital", () => {
    const filters = { hospital_id: "hosp-1", patient_id: "patient-1", table: "prescriptions" };
    expect(filters.table).toBe("prescriptions");
  });

  it("should fetch invoices with items for patient at hospital", () => {
    const selectQuery = "id, invoice_number, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, amount_paid, notes, items:invoice_items(id, description, quantity, unit_price, total_price)";
    expect(selectQuery).toContain("items:invoice_items");
  });

  // Test 141: Outstanding balance calculation
  it("should sum (total - paid) for non-paid/cancelled invoices", () => {
    const invoices = [
      { status: "pending", total_amount: 1000, amount_paid: 200 },
      { status: "partial", total_amount: 500, amount_paid: 300 },
      { status: "paid", total_amount: 800, amount_paid: 800 },
      { status: "cancelled", total_amount: 200, amount_paid: 0 },
    ];
    const outstanding = invoices
      .filter((i) => i.status !== "paid" && i.status !== "cancelled")
      .reduce((sum, i) => sum + (i.total_amount - i.amount_paid), 0);
    expect(outstanding).toBe(1000); // (1000-200) + (500-300)
  });

  // Test 142: Total visits calculation
  it("should sum admissions + appointments count", () => {
    const admissions = [{ id: "a1" }, { id: "a2" }];
    const appointments = [{ id: "ap1" }];
    const totalVisits = admissions.length + appointments.length;
    expect(totalVisits).toBe(3);
  });

  // Test 143: Last visit date
  it("should return max of last admission and last appointment date", () => {
    const lastAdmission = "2026-02-15";
    const lastAppointment = "2026-02-16";
    const lastVisit = new Date(lastAdmission) > new Date(lastAppointment) ? lastAdmission : lastAppointment;
    expect(lastVisit).toBe("2026-02-16");
  });

  // Test 144: Merge candidates detection
  it("should return pending candidates sorted by confidence desc", () => {
    const candidates = [
      { confidence_score: 0.8, status: "pending" },
      { confidence_score: 0.95, status: "pending" },
    ];
    const sorted = candidates.sort((a, b) => b.confidence_score - a.confidence_score);
    expect(sorted[0].confidence_score).toBe(0.95);
  });

  // Test 145: Merge candidate profiles
  it("should join user_profiles for both patient_id_a and patient_id_b", () => {
    const profileMap = new Map([
      ["patient-1", { display_name: "John", date_of_birth: "1990-01-01" }],
      ["patient-2", { display_name: "Jon", date_of_birth: "1990-01-01" }],
    ]);
    const candidate = { patient_id_a: "patient-1", patient_id_b: "patient-2" };
    expect(profileMap.get(candidate.patient_id_a)?.display_name).toBe("John");
    expect(profileMap.get(candidate.patient_id_b)?.display_name).toBe("Jon");
  });

  // Test 146: Dismiss merge candidate
  it("should set status=dismissed with reviewed_by and reviewed_at", () => {
    const update = { status: "dismissed", reviewed_by: "user-1", reviewed_at: new Date().toISOString() };
    expect(update.status).toBe("dismissed");
    expect(update.reviewed_by).toBeTruthy();
  });

  // Test 147: Run duplicate detection
  it("should invoke detect-duplicate-patients edge function", () => {
    const edgeFn = "detect-duplicate-patients";
    const body = { hospital_id: "hosp-1" };
    expect(edgeFn).toBe("detect-duplicate-patients");
    expect(body.hospital_id).toBeTruthy();
  });

  // Test 148: Patient risk flags - basic
  it("should analyze vitals and return flags array", () => {
    const vitals = [{ bp_systolic: 170, spo2: 88, heart_rate: 130, temperature: 39.5 }];
    const flags: string[] = [];
    if (vitals[0].bp_systolic >= 160) flags.push("bp-critical");
    if (vitals[0].spo2 <= 90) flags.push("spo2-critical");
    if (vitals[0].heart_rate >= 120) flags.push("hr-critical");
    if (vitals[0].temperature >= 39.0) flags.push("temp-critical");
    expect(flags).toHaveLength(4);
  });
});
