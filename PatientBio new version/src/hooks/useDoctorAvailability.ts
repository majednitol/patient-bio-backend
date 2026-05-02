import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { DoctorAvailability, DoctorTimeOff } from "@/types/hospital";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useDoctorAvailability(hospitalId?: string, doctorId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const targetDoctorId = doctorId || user?.id;

  const availabilityQuery = useQuery({
    queryKey: ["doctor-availability", hospitalId, targetDoctorId],
    queryFn: async () => {
      let query = supabase
        .from("doctor_availability")
        .select("*")
        .eq("is_active", true);

      if (hospitalId) {
        query = query.eq("hospital_id", hospitalId);
      }
      if (targetDoctorId) {
        query = query.eq("doctor_id", targetDoctorId);
      }

      const { data, error } = await query.order("day_of_week");
      if (error) throw error;
      return data as DoctorAvailability[];
    },
    enabled: !!targetDoctorId,
    staleTime: STALE_TIMES.STANDARD,
  });

  const timeOffQuery = useQuery({
    queryKey: ["doctor-time-off", hospitalId, targetDoctorId],
    queryFn: async () => {
      let query = supabase
        .from("doctor_time_off")
        .select("*")
        .gte("end_date", new Date().toISOString().split("T")[0]);

      if (hospitalId) {
        query = query.eq("hospital_id", hospitalId);
      }
      if (targetDoctorId) {
        query = query.eq("doctor_id", targetDoctorId);
      }

      const { data, error } = await query.order("start_date");
      if (error) throw error;
      return data as DoctorTimeOff[];
    },
    enabled: !!targetDoctorId,
    staleTime: STALE_TIMES.STANDARD,
  });

  const upsertAvailability = useMutation({
    mutationFn: async (availability: Partial<DoctorAvailability> & { day_of_week: number }) => {
      const { data, error } = await supabase
        .from("doctor_availability")
        .upsert({
          doctor_id: user?.id,
          hospital_id: hospitalId,
          day_of_week: availability.day_of_week,
          start_time: availability.start_time,
          end_time: availability.end_time,
          slot_duration_minutes: availability.slot_duration_minutes || 30,
          is_active: availability.is_active ?? true,
        }, {
          onConflict: "doctor_id,hospital_id,day_of_week",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-availability"] });
      toast.success("Availability updated");
    },
    onError: (error) => {
      toast.error("Failed to update availability: " + error.message);
    },
  });

  const deleteAvailability = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("doctor_availability")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-availability"] });
      toast.success("Availability removed");
    },
    onError: (error) => {
      toast.error("Failed to remove availability: " + error.message);
    },
  });

  const addTimeOff = useMutation({
    mutationFn: async (timeOff: { start_date: string; end_date: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("doctor_time_off")
        .insert({
          doctor_id: user?.id,
          hospital_id: hospitalId,
          start_date: timeOff.start_date,
          end_date: timeOff.end_date,
          reason: timeOff.reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-time-off"] });
      toast.success("Time off added");
    },
    onError: (error) => {
      toast.error("Failed to add time off: " + error.message);
    },
  });

  const deleteTimeOff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("doctor_time_off")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-time-off"] });
      toast.success("Time off removed");
    },
    onError: (error) => {
      toast.error("Failed to remove time off: " + error.message);
    },
  });

  return {
    availability: availabilityQuery.data || [],
    timeOff: timeOffQuery.data || [],
    isLoading: availabilityQuery.isLoading || timeOffQuery.isLoading,
    upsertAvailability,
    deleteAvailability,
    addTimeOff,
    deleteTimeOff,
  };
}
