import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";

export interface DoctorDemandRow {
  doctor_id: string;
  full_name: string;
  specialty: string | null;
  lab_grade: string | null;
  total_appointments: number;
  unique_patients: number;
  appointments_30d: number;
  appointments_90d: number;
  repeat_patients: number;
  repeat_patient_pct: number;
  avg_visits_per_patient: number;
}

export function useDoctorDemandAnalytics() {
  return useQuery({
    queryKey: ["doctor-demand-analytics"],
    queryFn: async (): Promise<DoctorDemandRow[]> => {
      const { data, error } = await supabase
        .from("doctor_demand_analytics" as any)
        .select("*")
        .order("total_appointments", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as DoctorDemandRow[];
    },
    staleTime: STALE_TIMES.STANDARD,
  });
}

export function useDoctorRepeatPatients(doctorId: string | undefined) {
  return useQuery({
    queryKey: ["doctor-demand-analytics", doctorId],
    queryFn: async (): Promise<DoctorDemandRow | null> => {
      if (!doctorId) return null;
      const { data, error } = await supabase
        .from("doctor_demand_analytics" as any)
        .select("*")
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as DoctorDemandRow | null;
    },
    enabled: !!doctorId,
    staleTime: STALE_TIMES.STANDARD,
  });
}
