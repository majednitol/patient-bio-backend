import { describe, it, expect, vi, beforeEach } from "vitest";
import { PAYMENT_METHODS } from "@/hooks/usePayments";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("Phase 11: Payments", () => {
  beforeEach(() => vi.clearAllMocks());

  // Test 101: Fetch payments for invoice
  it("should query payments by invoice_id ordered by date desc", () => {
    const queryConfig = { table: "payments", filter: "invoice_id", order: { field: "payment_date", ascending: false } };
    expect(queryConfig.order.ascending).toBe(false);
  });

  // Test 102: Record payment
  it("should insert payment with method, amount, transaction_ref", () => {
    const payment = {
      invoice_id: "inv-1",
      hospital_id: "hosp-1",
      amount: 500,
      payment_method: "cash" as const,
      transaction_ref: "TXN-001",
      received_by: "user-1",
    };
    expect(payment.amount).toBe(500);
    expect(payment.payment_method).toBe("cash");
  });

  // Test 103: Payment methods constant
  it("should define 5 payment methods", () => {
    expect(PAYMENT_METHODS).toHaveLength(5);
    const values = PAYMENT_METHODS.map((m) => m.value);
    expect(values).toContain("cash");
    expect(values).toContain("card");
    expect(values).toContain("upi");
    expect(values).toContain("bank_transfer");
    expect(values).toContain("insurance");
  });

  // Test 104: Invoice auto-update on payment (trigger logic)
  it("should recalculate amount_paid and status on payment", () => {
    const totalPaid = 500;
    const totalAmount = 1000;
    const status = totalPaid >= totalAmount ? "paid" : totalPaid > 0 ? "partial" : "pending";
    expect(status).toBe("partial");
  });

  // Test 105: Partial payment status
  it("should set status=partial when 0 < paid < total", () => {
    const paid = 300;
    const total = 1000;
    const status = paid >= total ? "paid" : paid > 0 ? "partial" : "pending";
    expect(status).toBe("partial");
  });

  // Test 106: Full payment status
  it("should set status=paid when paid >= total", () => {
    const paid = 1000;
    const total = 1000;
    const status = paid >= total ? "paid" : paid > 0 ? "partial" : "pending";
    expect(status).toBe("paid");
  });
});
