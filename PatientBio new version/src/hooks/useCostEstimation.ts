import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CostBreakdownItem {
  category: string;
  label: string;
  amount: number;
}

interface SpendingByMonth {
  month: string;
  total: number;
  consultation: number;
  medication: number;
  lab_test: number;
  other: number;
}

export function useCostEstimation() {
  const { user } = useAuth();

  // Fetch consultation fee for a specific doctor
  const useDoctorFee = (doctorId: string | undefined) =>
    useQuery({
      queryKey: ["doctor-fee", doctorId],
      enabled: !!doctorId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("doctor_profiles")
          .select("consultation_fee, full_name, specialty")
          .eq("user_id", doctorId!)
          .single();
        if (error) throw error;
        return data;
      },
    });

  // Fetch patient spending history from invoices + invoice_items
  const useSpendingHistory = () =>
    useQuery({
      queryKey: ["patient-spending", user?.id],
      enabled: !!user?.id,
      queryFn: async () => {
        // Get all invoices for this patient
        const { data: invoices, error } = await supabase
          .from("invoices")
          .select("id, total_amount, invoice_date, status")
          .eq("patient_id", user!.id)
          .not("status", "eq", "cancelled")
          .order("invoice_date", { ascending: false });

        if (error) throw error;
        if (!invoices?.length) return { totalSpent: 0, byMonth: [] as SpendingByMonth[], invoiceCount: 0 };

        // Get all invoice items for these invoices
        const invoiceIds = invoices.map((i) => i.id);
        const { data: items, error: itemsError } = await supabase
          .from("invoice_items")
          .select("invoice_id, category, total_price")
          .in("invoice_id", invoiceIds);

        if (itemsError) throw itemsError;

        // Build per-invoice date map
        const invoiceDateMap = new Map(invoices.map((i) => [i.id, i.invoice_date]));

        // Aggregate by month
        const monthMap = new Map<string, SpendingByMonth>();
        (items || []).forEach((item) => {
          const dateStr = invoiceDateMap.get(item.invoice_id);
          if (!dateStr) return;
          const month = dateStr.substring(0, 7); // "YYYY-MM"
          const entry = monthMap.get(month) || {
            month,
            total: 0,
            consultation: 0,
            medication: 0,
            lab_test: 0,
            other: 0,
          };
          const amt = item.total_price || 0;
          entry.total += amt;
          const cat = (item.category || "other") as string;
          if (cat === "consultation") entry.consultation += amt;
          else if (cat === "medication") entry.medication += amt;
          else if (cat === "lab_test") entry.lab_test += amt;
          else entry.other += amt;
          monthMap.set(month, entry);
        });

        const byMonth = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
        const totalSpent = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);

        return { totalSpent, byMonth, invoiceCount: invoices.length };
      },
    });

  // Estimate cost for current prescription being created
  const estimatePrescriptionCost = (
    consultationFee: number | null,
    medicationCount: number
  ): CostBreakdownItem[] => {
    const items: CostBreakdownItem[] = [];
    if (consultationFee && consultationFee > 0) {
      items.push({ category: "consultation", label: "Consultation Fee", amount: consultationFee });
    }
    // Rough medication estimate (we don't have per-med pricing, but show count)
    if (medicationCount > 0) {
      items.push({
        category: "medication",
        label: `${medicationCount} medication${medicationCount > 1 ? "s" : ""} prescribed`,
        amount: 0, // unknown
      });
    }
    return items;
  };

  return { useDoctorFee, useSpendingHistory, estimatePrescriptionCost };
}
