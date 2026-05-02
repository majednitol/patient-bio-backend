import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Payment {
  id: string;
  invoice_id: string;
  hospital_id: string;
  amount: number;
  payment_method: "cash" | "card" | "upi" | "bank_transfer" | "insurance";
  payment_date: string;
  transaction_ref: string | null;
  notes: string | null;
  received_by: string | null;
  created_at: string;
}

export const usePayments = (invoiceId: string) => {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!invoiceId,
  });
};

export const usePaymentMutations = (hospitalId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const recordPayment = useMutation({
    mutationFn: async ({
      invoiceId,
      amount,
      paymentMethod,
      transactionRef,
      notes,
      receivedBy,
    }: {
      invoiceId: string;
      amount: number;
      paymentMethod: Payment["payment_method"];
      transactionRef?: string;
      notes?: string;
      receivedBy: string;
    }) => {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          invoice_id: invoiceId,
          hospital_id: hospitalId,
          amount,
          payment_method: paymentMethod,
          transaction_ref: transactionRef,
          notes,
          received_by: receivedBy,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payments", variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["invoice", variables.invoiceId] });
      toast({ title: "Payment recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record payment", description: error.message, variant: "destructive" });
    },
  });

  return { recordPayment };
};

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "insurance", label: "Insurance" },
] as const;
