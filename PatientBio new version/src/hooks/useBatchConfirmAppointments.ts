import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function useBatchConfirmAppointments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentIds: string[]) => {
      if (appointmentIds.length === 0) return [];

      const { data, error } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .in("id", appointmentIds)
        .select("id, patient_id, appointment_date, doctor_id");

      if (error) throw error;
      return data || [];
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(`${ids.length} appointment${ids.length > 1 ? "s" : ""} confirmed`);

      // Send notifications to each patient
      if (data && data.length > 0) {
        const notifications = data.map((apt) => ({
          user_id: apt.patient_id,
          type: "appointment_confirmed",
          title: "Appointment Confirmed",
          message: `Your appointment on ${format(new Date(apt.appointment_date), "MMM d, yyyy")} has been confirmed.`,
        }));

        supabase
          .from("notifications")
          .insert(notifications)
          .then(({ error }) => {
            if (error) console.error("Failed to notify patients:", error);
          });
      }
    },
    onError: (error) => {
      toast.error("Failed to confirm appointments: " + error.message);
    },
  });
}
