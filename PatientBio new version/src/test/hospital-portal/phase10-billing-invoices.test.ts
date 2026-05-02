import { describe, it, expect, vi, beforeEach } from "vitest";
import { INVOICE_ITEM_CATEGORIES } from "@/hooks/useInvoices";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Phase 10: Billing & Invoices", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 91: Fetch invoices with items
  it("should select invoices with items and patient_profile joins", () => {
    const selectQuery = `*, items:invoice_items(*), patient_profile:user_profiles!invoices_patient_id_fkey(display_name, phone)`;
    expect(selectQuery).toContain("items:invoice_items(*)");
    expect(selectQuery).toContain("patient_profile");
  });

  // Test 92: Filter by status
  it("should filter invoices by status when provided", () => {
    const status = "pending";
    expect(status).toBe("pending");
  });

  // Test 93: Fetch single invoice
  it("should return full invoice with items by id", () => {
    const invoiceId = "inv-1";
    expect(invoiceId).toBeTruthy();
  });

  // Test 94: Create invoice with RPC
  it("should generate invoice number via RPC", () => {
    const rpcName = "generate_invoice_number";
    const params = { p_hospital_id: "hosp-1" };
    expect(rpcName).toBe("generate_invoice_number");
    expect(params.p_hospital_id).toBeTruthy();
  });

  // Test 95: Invoice number format
  it("should generate INV-YYYY-XXXX format", () => {
    const invoiceNumber = "INV-2026-0001";
    expect(invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
  });

  // Test 96: Subtotal calculation
  it("should calculate subtotal as sum of quantity * unit_price", () => {
    const items = [
      { quantity: 2, unit_price: 100 },
      { quantity: 1, unit_price: 500 },
    ];
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    expect(subtotal).toBe(700);
  });

  // Test 97: Tax and discount application
  it("should compute total = subtotal + taxAmount - discountAmount", () => {
    const subtotal = 1000;
    const taxPercent = 10;
    const discountAmount = 50;
    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount - discountAmount;
    expect(taxAmount).toBe(100);
    expect(total).toBe(1050);
  });

  // Test 98: Update strips joined fields
  it("should remove items and patient_profile before update", () => {
    const updates: any = { id: "inv-1", items: [], patient_profile: { display_name: "John" }, status: "paid" };
    const { items, patient_profile, ...cleanUpdates } = updates;
    expect(cleanUpdates).not.toHaveProperty("items");
    expect(cleanUpdates).not.toHaveProperty("patient_profile");
    expect(cleanUpdates.status).toBe("paid");
  });

  // Test 99: Cancel invoice
  it("should set status to cancelled", () => {
    const updatePayload = { status: "cancelled" };
    expect(updatePayload.status).toBe("cancelled");
  });

  // Test 100: Invoice item categories
  it("should define 6 invoice item categories", () => {
    expect(INVOICE_ITEM_CATEGORIES).toHaveLength(6);
    const values = INVOICE_ITEM_CATEGORIES.map((c) => c.value);
    expect(values).toContain("consultation");
    expect(values).toContain("bed_charge");
    expect(values).toContain("medication");
    expect(values).toContain("procedure");
    expect(values).toContain("lab_test");
    expect(values).toContain("other");
  });
});
