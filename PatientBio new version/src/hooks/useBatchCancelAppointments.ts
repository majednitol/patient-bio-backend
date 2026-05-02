import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export function useBatchCancelAppointments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (appointmentIds: string[]) => {
      if (appointmentIds.length === 0) return [];

      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          cancelled_by: user?.id || null,
          cancelled_at: new Date().toISOString(),
        })
        .in("id", appointmentIds)
        .select("id, patient_id, appointment_date");

      if (error) throw error;
      return data || [];
    },
    onSuccess: (data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success(`${ids.length} appointment${ids.length > 1 ? "s" : ""} cancelled`);

      if (data && data.length > 0) {
        const notifications = data.map((apt) => ({
          user_id: apt.patient_id,
          type: "appointment_cancelled",
          title: "Appointment Cancelled",
          message: `Your appointment on ${format(new Date(apt.appointment_date), "MMM d, yyyy")} has been cancelled.`,
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
      toast.error("Failed to cancel appointments: " + error.message);
    },
  });
}
