import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  category: "consultation" | "bed_charge" | "medication" | "procedure" | "lab_test" | "other";
  quantity: number;
  unit_price: number;
  total_price: number;
  service_date: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  hospital_id: string;
  patient_id: string;
  admission_id: string | null;
  appointment_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  status: "draft" | "pending" | "partial" | "paid" | "cancelled";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  items?: InvoiceItem[];
  patient_profile?: {
    display_name: string | null;
    phone: string | null;
  };
}

// Cache configuration for better performance
const STALE_TIME = 30 * 1000; // 30 seconds
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export const useInvoices = (hospitalId: string, status?: Invoice["status"]) => {
  return useQuery({
    queryKey: ["invoices", hospitalId, status],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          items:invoice_items(*),
          patient_profile:user_profiles!invoices_patient_id_fkey(display_name, phone)
        `)
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Invoice[];
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          items:invoice_items(*),
          patient_profile:user_profiles!invoices_patient_id_fkey(display_name, phone)
        `)
        .eq("id", invoiceId)
        .single();

      if (error) throw error;
      return data as unknown as Invoice;
    },
    enabled: !!invoiceId,
  });
};

export const useInvoiceMutations = (hospitalId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createInvoice = useMutation({
    mutationFn: async ({
      patientId,
      admissionId,
      appointmentId,
      items,
      taxPercent = 0,
      discountAmount = 0,
      notes,
      dueDate,
      createdBy,
    }: {
      patientId: string;
      admissionId?: string;
      appointmentId?: string;
      items: Array<{
        description: string;
        category: InvoiceItem["category"];
        quantity: number;
        unit_price: number;
        service_date?: string;
      }>;
      taxPercent?: number;
      discountAmount?: number;
      notes?: string;
      dueDate?: string;
      createdBy: string;
    }) => {
      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number", {
        p_hospital_id: hospitalId,
      });

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const taxAmount = subtotal * (taxPercent / 100);
      const totalAmount = subtotal + taxAmount - discountAmount;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          hospital_id: hospitalId,
          patient_id: patientId,
          admission_id: admissionId,
          appointment_id: appointmentId,
          invoice_number: invoiceNumber,
          subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          notes,
          due_date: dueDate,
          created_by: createdBy,
          status: "pending",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        service_date: item.service_date,
      }));

      const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
      if (itemsError) throw itemsError;

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", hospitalId] });
      toast({ title: "Invoice created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create invoice", description: error.message, variant: "destructive" });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const { items, patient_profile, ...cleanUpdates } = updates;
      const { data, error } = await supabase
        .from("invoices")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", hospitalId] });
      toast({ title: "Invoice updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update invoice", description: error.message, variant: "destructive" });
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", invoiceId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", hospitalId] });
      toast({ title: "Invoice cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel invoice", description: error.message, variant: "destructive" });
    },
  });

  return { createInvoice, updateInvoice, cancelInvoice };
};

export const INVOICE_STATUSES = [
  { value: "draft", label: "Draft", color: "bg-gray-500" },
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "partial", label: "Partial", color: "bg-blue-500" },
  { value: "paid", label: "Paid", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
] as const;

export const INVOICE_ITEM_CATEGORIES = [
  { value: "consultation", label: "Consultation" },
  { value: "bed_charge", label: "Bed Charge" },
  { value: "medication", label: "Medication" },
  { value: "procedure", label: "Procedure" },
  { value: "lab_test", label: "Lab Test" },
  { value: "other", label: "Other" },
] as const;
