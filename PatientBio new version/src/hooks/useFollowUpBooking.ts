import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addDays, addWeeks, addMonths, format } from "date-fns";

export type FollowUpInterval = "1_week" | "2_weeks" | "1_month" | "3_months" | "custom";

interface FollowUpParams {
  parentAppointmentId: string;
  patientId: string;
  doctorId: string;
  hospitalId?: string | null;
  interval: FollowUpInterval;
  customDate?: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

function getFollowUpDate(interval: FollowUpInterval, customDate?: Date): Date {
  const now = new Date();
  switch (interval) {
    case "1_week": return addWeeks(now, 1);
    case "2_weeks": return addWeeks(now, 2);
    case "1_month": return addMonths(now, 1);
    case "3_months": return addMonths(now, 3);
    case "custom": return customDate || addWeeks(now, 1);
  }
}

export function useFollowUpBooking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FollowUpParams) => {
      const followUpDate = getFollowUpDate(params.interval, params.customDate);

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: params.patientId,
          doctor_id: params.doctorId,
          hospital_id: params.hospitalId || null,
          appointment_date: format(followUpDate, "yyyy-MM-dd"),
          start_time: params.startTime,
          end_time: params.endTime,
          reason: params.reason || "Follow-up",
          status: "scheduled",
          parent_appointment_id: params.parentAppointmentId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Follow-up appointment scheduled!" });
    },
    onError: (error) => {
      toast({ title: "Failed to schedule follow-up", description: error.message, variant: "destructive" });
    },
  });
}
