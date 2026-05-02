import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DoctorAvailability, DoctorTimeOff } from "@/types/hospital";

export interface DoctorScheduleInfo {
  user_id: string;
  full_name: string;
  specialty: string | null;
  avatar_url: string | null;
}

export interface UseHospitalDoctorScheduleResult {
  doctors: DoctorScheduleInfo[];
  availabilityMap: Map<string, DoctorAvailability[]>;
  timeOffMap: Map<string, DoctorTimeOff[]>;
  isLoading: boolean;
  error: Error | null;
}

// Cache configuration for better performance
const STALE_TIME = 30 * 1000; // 30 seconds
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export function useHospitalDoctorSchedule(
  hospitalId: string | undefined,
  weekStart: Date
): UseHospitalDoctorScheduleResult {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Single combined query that fetches doctors, availability, and time-off in parallel
  const { data, isLoading, error } = useQuery({
    queryKey: ["hospital-doctor-schedule-combined", hospitalId, weekStart.toISOString()],
    queryFn: async () => {
      if (!hospitalId) return { doctors: [], availability: [], timeOff: [] };

      // Step 1: Fetch doctors with profiles in a single joined query
      const { data: staffData, error: staffError } = await supabase
        .from("hospital_staff")
        .select(`
          user_id,
          doctor_profiles!inner (
            user_id,
            full_name,
            specialty,
            avatar_url
          )
        `)
        .eq("hospital_id", hospitalId)
        .eq("role", "doctor")
        .eq("is_active", true);

      if (staffError) throw staffError;

      const doctors = (staffData || []).map((staff: any) => ({
        user_id: staff.user_id,
        full_name: staff.doctor_profiles?.full_name || "Unknown Doctor",
        specialty: staff.doctor_profiles?.specialty || null,
        avatar_url: staff.doctor_profiles?.avatar_url || null,
      }));

      const doctorIds = doctors.map((d) => d.user_id);

      if (doctorIds.length === 0) {
        return { doctors, availability: [], timeOff: [] };
      }

      // Step 2: Fetch availability and time-off in PARALLEL (not sequential)
      const [availabilityResult, timeOffResult] = await Promise.all([
        supabase
          .from("doctor_availability")
           .select("id, doctor_id, hospital_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active, created_at, updated_at")
          .eq("hospital_id", hospitalId)
          .in("doctor_id", doctorIds)
          .eq("is_active", true),
        supabase
          .from("doctor_time_off")
          .select("id, doctor_id, hospital_id, start_date, end_date, reason, created_at")
          .in("doctor_id", doctorIds)
          .or(`hospital_id.eq.${hospitalId},hospital_id.is.null`)
          .lte("start_date", weekEnd.toISOString().split("T")[0])
          .gte("end_date", weekStart.toISOString().split("T")[0]),
      ]);

      if (availabilityResult.error) throw availabilityResult.error;
      if (timeOffResult.error) throw timeOffResult.error;

      return {
        doctors,
        availability: availabilityResult.data as DoctorAvailability[],
        timeOff: timeOffResult.data as DoctorTimeOff[],
      };
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });

  // Build availability map: doctor_id -> DoctorAvailability[]
  const availabilityMap = new Map<string, DoctorAvailability[]>();
  (data?.availability || []).forEach((a) => {
    const existing = availabilityMap.get(a.doctor_id) || [];
    existing.push(a);
    availabilityMap.set(a.doctor_id, existing);
  });

  // Build time off map: doctor_id -> DoctorTimeOff[]
  const timeOffMap = new Map<string, DoctorTimeOff[]>();
  (data?.timeOff || []).forEach((t) => {
    const existing = timeOffMap.get(t.doctor_id) || [];
    existing.push(t);
    timeOffMap.set(t.doctor_id, existing);
  });

  return {
    doctors: data?.doctors || [],
    availabilityMap,
    timeOffMap,
    isLoading,
    error: error as Error | null,
  };
}
