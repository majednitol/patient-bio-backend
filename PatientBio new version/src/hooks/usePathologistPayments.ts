 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "@/hooks/use-toast";
 
 export type PaymentMethod = "cash" | "card" | "upi" | "bank_transfer";
 
 export interface Payment {
   id: string;
   invoice_id: string;
   pathologist_id: string;
   amount: number;
   payment_method: PaymentMethod;
   payment_date: string;
   transaction_ref?: string | null;
   notes?: string | null;
   created_at: string;
 }
 
 export interface CreatePaymentData {
   invoice_id: string;
   amount: number;
   payment_method: PaymentMethod;
   transaction_ref?: string | null;
   notes?: string | null;
 }
 
 export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
   { value: "cash", label: "Cash" },
   { value: "card", label: "Card" },
   { value: "upi", label: "UPI" },
   { value: "bank_transfer", label: "Bank Transfer" },
 ];
 
 export const usePathologistPayments = (invoiceId: string | null) => {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ["pathologist-payments", invoiceId],
     queryFn: async () => {
       if (!invoiceId || !user?.id) return [];
       
       const { data, error } = await supabase
         .from("pathologist_payments")
         .select("id, invoice_id, pathologist_id, amount, payment_method, payment_date, transaction_ref, notes, created_at")
         .eq("invoice_id", invoiceId)
         .eq("pathologist_id", user.id)
         .order("payment_date", { ascending: false });
 
       if (error) throw error;
       return data as Payment[];
     },
     enabled: !!invoiceId && !!user?.id,
   });
 };
 
 export const usePathologistPaymentMutations = () => {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const createPayment = useMutation({
     mutationFn: async (paymentData: CreatePaymentData) => {
       if (!user?.id) throw new Error("User not authenticated");
       
       const { data, error } = await supabase
         .from("pathologist_payments")
         .insert({
           invoice_id: paymentData.invoice_id,
           pathologist_id: user.id,
           amount: paymentData.amount,
           payment_method: paymentData.payment_method,
           transaction_ref: paymentData.transaction_ref,
           notes: paymentData.notes,
         })
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: (_, variables) => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-payments", variables.invoice_id] });
       queryClient.invalidateQueries({ queryKey: ["pathologist-invoices"] });
       queryClient.invalidateQueries({ queryKey: ["pathologist-invoice"] });
       toast({ title: "Payment recorded successfully" });
     },
     onError: (error) => {
       toast({ title: "Failed to record payment", description: error.message, variant: "destructive" });
     },
   });
 
   const deletePayment = useMutation({
     mutationFn: async ({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) => {
       const { error } = await supabase
         .from("pathologist_payments")
         .delete()
         .eq("id", paymentId);
 
       if (error) throw error;
       return invoiceId;
     },
     onSuccess: (invoiceId) => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-payments", invoiceId] });
       queryClient.invalidateQueries({ queryKey: ["pathologist-invoices"] });
       toast({ title: "Payment deleted" });
     },
     onError: (error) => {
       toast({ title: "Failed to delete payment", description: error.message, variant: "destructive" });
     },
   });
 
   return { createPayment, deletePayment };
 };