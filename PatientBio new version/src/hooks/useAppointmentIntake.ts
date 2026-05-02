import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addToSyncQueue } from "@/lib/offlineDB";

export interface AppointmentIntake {
  id: string;
  appointment_id: string;
  patient_id: string;
  chief_complaint: string | null;
  symptom_duration: string | null;
  symptom_severity: string | null;
  self_medications: string | null;
  additional_notes: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface IntakeFormData {
  chief_complaint: string;
  symptom_duration: string;
  symptom_severity: string;
  self_medications: string;
  additional_notes: string;
}

export function useAppointmentIntake(appointmentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["appointment-intake", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const { data, error } = await supabase
        .from("appointment_intake")
        .select("id, appointment_id, patient_id, chief_complaint, symptom_duration, symptom_severity, self_medications, additional_notes, submitted_at")
        .eq("appointment_id", appointmentId)
        .maybeSingle();

      if (error) throw error;
      return data as AppointmentIntake | null;
    },
    enabled: !!user && !!appointmentId,
  });
}

export function useSubmitIntake() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: IntakeFormData;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const payload = {
        appointment_id: appointmentId,
        patient_id: user.id,
        chief_complaint: data.chief_complaint || null,
        symptom_duration: data.symptom_duration || null,
        symptom_severity: data.symptom_severity || null,
        self_medications: data.self_medications || null,
        additional_notes: data.additional_notes || null,
        submitted_at: new Date().toISOString(),
      };

      // If offline, queue for later sync
      if (!navigator.onLine) {
        await addToSyncQueue("submit_intake", payload as any);
        return payload;
      }

      const { data: result, error } = await supabase
        .from("appointment_intake")
        .upsert(payload, { onConflict: "appointment_id" })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["appointment-intake", variables.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      const msg = navigator.onLine
        ? "Intake form submitted successfully!"
        : "Intake form saved — will sync when online";
      toast.success(msg);
    },
    onError: (error) => {
      toast.error("Failed to submit intake form: " + error.message);
    },
  });
}

// For doctors: batch fetch intake for multiple appointments
export function useAppointmentIntakeBatch(appointmentIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["appointment-intake-batch", appointmentIds],
    queryFn: async () => {
      if (appointmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("appointment_intake")
        .select("id, appointment_id, patient_id, chief_complaint, symptom_duration, symptom_severity, self_medications, additional_notes, submitted_at")
        .in("appointment_id", appointmentIds);

      if (error) throw error;
      return (data || []) as AppointmentIntake[];
    },
    enabled: !!user && appointmentIds.length > 0,
  });
}
