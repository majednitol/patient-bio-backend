import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdmissionTransfer {
  id: string;
  admission_id: string;
  from_bed_id: string | null;
  to_bed_id: string;
  transferred_by: string;
  transfer_reason: string;
  notes: string | null;
  transferred_at: string;
  created_at: string;
  // Joined fields
  from_bed?: {
    bed_number: string;
    ward?: { name: string; type: string };
  } | null;
  to_bed?: {
    bed_number: string;
    ward?: { name: string; type: string };
  };
}

export const TRANSFER_REASONS = [
  { value: "improvement", label: "Condition Improvement" },
  { value: "worsening", label: "Condition Worsening" },
  { value: "isolation", label: "Isolation Required" },
  { value: "patient_request", label: "Patient Request" },
  { value: "bed_maintenance", label: "Bed Maintenance" },
  { value: "ward_capacity", label: "Ward Capacity Adjustment" },
  { value: "other", label: "Other" },
] as const;

export const useTransferHistory = (admissionId: string) => {
  return useQuery({
    queryKey: ["transfer-history", admissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_transfers")
        .select(`
          *,
          from_bed:beds!admission_transfers_from_bed_id_fkey(bed_number, ward:wards(name, type)),
          to_bed:beds!admission_transfers_to_bed_id_fkey(bed_number, ward:wards(name, type))
        `)
        .eq("admission_id", admissionId)
        .order("transferred_at", { ascending: true });

      if (error) throw error;
      return data as unknown as AdmissionTransfer[];
    },
    enabled: !!admissionId,
  });
};

export const useCreateTransfer = (hospitalId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      admissionId,
      fromBedId,
      toBedId,
      transferredBy,
      transferReason,
      notes,
    }: {
      admissionId: string;
      fromBedId: string | null;
      toBedId: string;
      transferredBy: string;
      transferReason: string;
      notes?: string;
    }) => {
      // Create transfer record
      const { error: transferError } = await supabase
        .from("admission_transfers")
        .insert({
          admission_id: admissionId,
          from_bed_id: fromBedId,
          to_bed_id: toBedId,
          transferred_by: transferredBy,
          transfer_reason: transferReason,
          notes: notes || null,
        });

      if (transferError) throw transferError;

      // Update admission with new bed
      const { data, error: admissionError } = await supabase
        .from("admissions")
        .update({ bed_id: toBedId })
        .eq("id", admissionId)
        .select()
        .single();

      if (admissionError) throw admissionError;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admissions", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["available-beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["transfer-history", variables.admissionId] });
      toast({ title: "Patient transferred successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to transfer patient", description: error.message, variant: "destructive" });
    },
  });
};
