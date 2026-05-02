 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "@/hooks/use-toast";
 
 export type InvoiceStatus = "draft" | "pending" | "partial" | "paid" | "cancelled";
 
 export interface InvoiceItem {
   id?: string;
   invoice_id?: string;
   test_id?: string | null;
   description: string;
   quantity: number;
   unit_price: number;
   total_price: number;
 }
 
 export interface Invoice {
   id: string;
   pathologist_id: string;
   patient_id: string;
   report_id?: string | null;
   invoice_number: string;
   invoice_date: string;
   due_date?: string | null;
   subtotal: number;
   tax_amount: number;
   discount_amount: number;
   total_amount: number;
   amount_paid: number;
   status: InvoiceStatus;
   notes?: string | null;
   created_at: string;
   updated_at: string;
   items?: InvoiceItem[];
 }
 
 export interface CreateInvoiceData {
   patient_id: string;
   report_id?: string | null;
   invoice_date?: string;
   due_date?: string | null;
   subtotal: number;
   tax_amount: number;
   discount_amount: number;
   total_amount: number;
   status?: InvoiceStatus;
   notes?: string | null;
   items: Omit<InvoiceItem, "id" | "invoice_id">[];
 }
 
 export const usePathologistInvoices = () => {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ["pathologist-invoices", user?.id],
     queryFn: async () => {
       if (!user?.id) return [];
       
       const { data, error } = await supabase
         .from("pathologist_invoices")
        .select("id, pathologist_id, patient_id, report_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_paid, status, notes, created_at, updated_at")
         .eq("pathologist_id", user.id)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       return data as Invoice[];
     },
     enabled: !!user?.id,
   });
 };
 
 export const usePathologistInvoice = (invoiceId: string | null) => {
   const { user } = useAuth();
 
   return useQuery({
     queryKey: ["pathologist-invoice", invoiceId],
     queryFn: async () => {
       if (!invoiceId || !user?.id) return null;
       
       const { data: invoice, error: invoiceError } = await supabase
         .from("pathologist_invoices")
        .select("id, pathologist_id, patient_id, report_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, discount_amount, total_amount, amount_paid, status, notes, created_at, updated_at")
          .eq("id", invoiceId)
          .eq("pathologist_id", user.id)
         .single();
 
       if (invoiceError) throw invoiceError;
 
       const { data: items, error: itemsError } = await supabase
         .from("pathologist_invoice_items")
        .select("id, invoice_id, test_id, description, quantity, unit_price, total_price")
          .eq("invoice_id", invoiceId);
 
       if (itemsError) throw itemsError;
 
       return { ...invoice, items } as Invoice;
     },
     enabled: !!invoiceId && !!user?.id,
   });
 };
 
 export const usePathologistInvoiceMutations = () => {
   const { user } = useAuth();
   const queryClient = useQueryClient();
 
   const generateInvoiceNumber = async (): Promise<string> => {
     if (!user?.id) throw new Error("User not authenticated");
     
     const { data, error } = await supabase
       .rpc("generate_pathologist_invoice_number", { p_pathologist_id: user.id });
     
     if (error) throw error;
     return data;
   };
 
   const createInvoice = useMutation({
     mutationFn: async (invoiceData: CreateInvoiceData) => {
       if (!user?.id) throw new Error("User not authenticated");
       
       const invoiceNumber = await generateInvoiceNumber();
       
       const { data: invoice, error: invoiceError } = await supabase
         .from("pathologist_invoices")
         .insert({
           pathologist_id: user.id,
           patient_id: invoiceData.patient_id,
           report_id: invoiceData.report_id,
           invoice_number: invoiceNumber,
           invoice_date: invoiceData.invoice_date || new Date().toISOString().split("T")[0],
           due_date: invoiceData.due_date,
           subtotal: invoiceData.subtotal,
           tax_amount: invoiceData.tax_amount,
           discount_amount: invoiceData.discount_amount,
           total_amount: invoiceData.total_amount,
           status: invoiceData.status || "pending",
           notes: invoiceData.notes,
         })
         .select()
         .single();
 
       if (invoiceError) throw invoiceError;
 
       if (invoiceData.items.length > 0) {
         const itemsWithInvoiceId = invoiceData.items.map((item) => ({
           ...item,
           invoice_id: invoice.id,
         }));
 
         const { error: itemsError } = await supabase
           .from("pathologist_invoice_items")
           .insert(itemsWithInvoiceId);
 
         if (itemsError) throw itemsError;
       }
 
       return invoice;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-invoices"] });
       toast({ title: "Invoice created successfully" });
     },
     onError: (error) => {
       toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" });
     },
   });
 
   const updateInvoiceStatus = useMutation({
     mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) => {
       const { error } = await supabase
         .from("pathologist_invoices")
         .update({ status })
         .eq("id", invoiceId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-invoices"] });
       toast({ title: "Invoice status updated" });
     },
     onError: (error) => {
       toast({ title: "Failed to update invoice", description: error.message, variant: "destructive" });
     },
   });
 
   const cancelInvoice = useMutation({
     mutationFn: async (invoiceId: string) => {
       const { error } = await supabase
         .from("pathologist_invoices")
         .update({ status: "cancelled" as InvoiceStatus })
         .eq("id", invoiceId);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["pathologist-invoices"] });
       toast({ title: "Invoice cancelled" });
     },
     onError: (error) => {
       toast({ title: "Failed to cancel invoice", description: error.message, variant: "destructive" });
     },
   });
 
   return { createInvoice, updateInvoiceStatus, cancelInvoice };
 };