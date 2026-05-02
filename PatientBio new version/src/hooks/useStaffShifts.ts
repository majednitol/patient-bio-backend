import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface StaffShift {
  id: string;
  hospital_id: string;
  staff_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: "morning" | "afternoon" | "night" | "regular" | "on_call";
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  staff?: {
    id: string;
    user_id: string;
    role: string;
    doctor_profile?: { full_name: string; specialty: string | null } | null;
    user_profile?: { display_name: string | null } | null;
  } | null;
}

export const SHIFT_TYPES = [
  { value: "morning", label: "Morning", color: "bg-amber-500", time: "06:00-14:00" },
  { value: "afternoon", label: "Afternoon", color: "bg-blue-500", time: "14:00-22:00" },
  { value: "night", label: "Night", color: "bg-indigo-700", time: "22:00-06:00" },
  { value: "regular", label: "Regular", color: "bg-green-500", time: "09:00-17:00" },
  { value: "on_call", label: "On Call", color: "bg-orange-500", time: "Flexible" },
] as const;

export function useStaffShifts(hospitalId: string | undefined, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return useQuery({
    queryKey: ["staff-shifts", hospitalId, weekStart.toISOString()],
    queryFn: async (): Promise<StaffShift[]> => {
      if (!hospitalId) return [];

      const { data, error } = await supabase
        .from("staff_shifts")
        .select(`
          *,
          staff:hospital_staff!staff_shifts_staff_id_fkey(
            id, user_id, role,
            doctor_profiles(full_name, specialty),
            user_profiles!hospital_staff_user_id_fkey(display_name)
          )
        `)
        .eq("hospital_id", hospitalId)
        .gte("shift_date", weekStart.toISOString().split("T")[0])
        .lte("shift_date", weekEnd.toISOString().split("T")[0])
        .order("shift_date")
        .order("start_time");

      if (error) throw error;

      return (data || []).map((s: any) => ({
        ...s,
        staff: s.staff
          ? {
              ...s.staff,
              doctor_profile: s.staff.doctor_profiles || null,
              user_profile: s.staff.user_profiles || null,
            }
          : null,
      }));
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIMES.REALTIME,
    refetchOnWindowFocus: false,
  });
}

export function useShiftMutations(hospitalId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-shifts", hospitalId] });
  };

  const createShift = useMutation({
    mutationFn: async (shift: {
      staff_id: string;
      shift_date: string;
      start_time: string;
      end_time: string;
      shift_type: string;
      notes?: string;
    }) => {
      if (!hospitalId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("staff_shifts").insert({
        hospital_id: hospitalId,
        staff_id: shift.staff_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        shift_type: shift.shift_type,
        notes: shift.notes || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Shift assigned");
    },
    onError: (e) => toast.error("Failed to assign shift: " + e.message),
  });

  const deleteShift = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase.from("staff_shifts").delete().eq("id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Shift removed");
    },
    onError: (e) => toast.error("Failed to remove shift: " + e.message),
  });

  return { createShift, deleteShift };
}
