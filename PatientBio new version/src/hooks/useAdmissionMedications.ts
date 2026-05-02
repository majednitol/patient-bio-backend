import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Types matching the database schema
export type MedicationStatus = "active" | "discontinued" | "completed";
export type MedicationRoute = "oral" | "iv" | "im" | "sc" | "topical" | "inhalation" | "rectal" | "other";

export interface AdmissionMedication {
  id: string;
  admission_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  prescribed_by: string;
  prescribed_at: string;
  status: MedicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  prescriber_name?: string;
  last_administration?: MedicationAdministration | null;
  administration_count?: number;
}

export interface MedicationAdministration {
  id: string;
  admission_medication_id: string;
  administered_by: string;
  administered_at: string;
  dose_given: string;
  notes: string | null;
  skipped: boolean;
  skip_reason: string | null;
  created_at: string;
  // Joined data
  administrator_name?: string;
}

// Frequency options for the UI
export const MEDICATION_FREQUENCIES = [
  { value: "OD", label: "Once daily (OD)" },
  { value: "BD", label: "Twice daily (BD)" },
  { value: "TDS", label: "Three times daily (TDS)" },
  { value: "QID", label: "Four times daily (QID)" },
  { value: "Q4H", label: "Every 4 hours" },
  { value: "Q6H", label: "Every 6 hours" },
  { value: "Q8H", label: "Every 8 hours" },
  { value: "Q12H", label: "Every 12 hours" },
  { value: "PRN", label: "As needed (PRN)" },
  { value: "AC", label: "Before meals (AC)" },
  { value: "PC", label: "After meals (PC)" },
  { value: "HS", label: "At bedtime (HS)" },
  { value: "STAT", label: "Immediately (STAT)" },
] as const;

export const MEDICATION_ROUTES: { value: MedicationRoute; label: string }[] = [
  { value: "oral", label: "Oral" },
  { value: "iv", label: "Intravenous (IV)" },
  { value: "im", label: "Intramuscular (IM)" },
  { value: "sc", label: "Subcutaneous (SC)" },
  { value: "topical", label: "Topical" },
  { value: "inhalation", label: "Inhalation" },
  { value: "rectal", label: "Rectal" },
  { value: "other", label: "Other" },
];

// Fetch all medications for an admission
export const useAdmissionMedications = (admissionId: string | undefined) => {
  return useQuery({
    queryKey: ["admission-medications", admissionId],
    queryFn: async () => {
      if (!admissionId) return [];

      // Fetch medications
      const { data: medications, error } = await supabase
        .from("admission_medications")
        .select("*")
        .eq("admission_id", admissionId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get prescriber names from doctor_profiles or hospital_staff
      const prescriberIds = [...new Set(medications?.map(m => m.prescribed_by) || [])];
      
      // Try to get doctor profile names
      const { data: doctorProfiles } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name")
        .in("user_id", prescriberIds);

      const doctorMap = new Map(doctorProfiles?.map(d => [d.user_id, d.full_name]) || []);

      // Get last administration for each medication
      const medicationIds = medications?.map(m => m.id) || [];
      
      const { data: lastAdmins } = await supabase
        .from("medication_administrations")
        .select("*")
        .in("admission_medication_id", medicationIds)
        .order("administered_at", { ascending: false });

      // Group administrations by medication
      const adminByMed = new Map<string, MedicationAdministration[]>();
      lastAdmins?.forEach(admin => {
        const existing = adminByMed.get(admin.admission_medication_id) || [];
        existing.push(admin as MedicationAdministration);
        adminByMed.set(admin.admission_medication_id, existing);
      });

      return (medications || []).map(med => ({
        ...med,
        route: med.route as MedicationRoute,
        status: med.status as MedicationStatus,
        prescriber_name: doctorMap.get(med.prescribed_by) || "Staff",
        last_administration: adminByMed.get(med.id)?.[0] || null,
        administration_count: adminByMed.get(med.id)?.length || 0,
      })) as AdmissionMedication[];
    },
    enabled: !!admissionId,
  });
};

// Fetch administration history for a specific medication
export const useMedicationAdministrations = (medicationId: string | undefined) => {
  return useQuery({
    queryKey: ["medication-administrations", medicationId],
    queryFn: async () => {
      if (!medicationId) return [];

      const { data, error } = await supabase
        .from("medication_administrations")
        .select("*")
        .eq("admission_medication_id", medicationId)
        .order("administered_at", { ascending: false });

      if (error) throw error;

      // Get administrator names
      const adminIds = [...new Set(data?.map(a => a.administered_by) || [])];
      const { data: profiles } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name")
        .in("user_id", adminIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return (data || []).map(admin => ({
        ...admin,
        administrator_name: profileMap.get(admin.administered_by) || "Staff",
      })) as MedicationAdministration[];
    },
    enabled: !!medicationId,
  });
};

// Add a new medication to an admission
export const useAddMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      admission_id: string;
      medication_name: string;
      dosage: string;
      frequency: string;
      route: MedicationRoute;
      notes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("admission_medications")
        .insert({
          admission_id: data.admission_id,
          medication_name: data.medication_name,
          dosage: data.dosage,
          frequency: data.frequency,
          route: data.route,
          notes: data.notes || null,
          prescribed_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admission-medications", variables.admission_id] });
      toast.success("Medication added successfully");
    },
    onError: (error) => {
      console.error("Add medication error:", error);
      toast.error("Failed to add medication");
    },
  });
};

// Record a medication administration
export const useRecordAdministration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      admission_medication_id: string;
      admission_id: string;
      dose_given: string;
      notes?: string;
      skipped?: boolean;
      skip_reason?: string;
      administered_at?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("medication_administrations")
        .insert({
          admission_medication_id: data.admission_medication_id,
          administered_by: user.user.id,
          dose_given: data.dose_given,
          notes: data.notes || null,
          skipped: data.skipped || false,
          skip_reason: data.skip_reason || null,
          administered_at: data.administered_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admission-medications", variables.admission_id] });
      queryClient.invalidateQueries({ queryKey: ["medication-administrations", variables.admission_medication_id] });
      toast.success(variables.skipped ? "Dose skipped and recorded" : "Dose administered and recorded");
    },
    onError: (error) => {
      console.error("Record administration error:", error);
      toast.error("Failed to record administration");
    },
  });
};

// Update medication (e.g., discontinue or complete)
export const useUpdateMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      medication_id: string;
      admission_id: string;
      status?: MedicationStatus;
      notes?: string;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.status) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const { data: result, error } = await supabase
        .from("admission_medications")
        .update(updateData)
        .eq("id", data.medication_id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admission-medications", variables.admission_id] });
      toast.success("Medication updated successfully");
    },
    onError: (error) => {
      console.error("Update medication error:", error);
      toast.error("Failed to update medication");
    },
  });
};
