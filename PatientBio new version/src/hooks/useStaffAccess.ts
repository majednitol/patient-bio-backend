import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface StaffAccessResult {
  isStaff: boolean;
  isLoading: boolean;
  staffRecord: {
    id: string;
    doctor_id: string;
    role: string;
    full_name: string;
    permissions: Record<string, boolean> | null;
  } | null;
  /** The doctor_id to use for data queries — either the staff's linked doctor or the user's own id */
  effectiveDoctorId: string | null;
}

export function useStaffAccess(): StaffAccessResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["staff-access", user?.id],
    queryFn: async () => {
      // Check user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!roleData || roleData.role !== "doctor_staff") {
        return { isStaff: false, staffRecord: null };
      }

      // Get linked doctor_staff record
      const { data: staffData } = await supabase
        .from("doctor_staff")
        .select("id, doctor_id, role, full_name, permissions")
        .eq("staff_user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();

      return {
        isStaff: true,
        staffRecord: staffData ? {
          ...staffData,
          permissions: (staffData.permissions as Record<string, boolean> | null) ?? null,
        } : null,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return {
    isStaff: data?.isStaff ?? false,
    isLoading,
    staffRecord: data?.staffRecord ?? null,
    effectiveDoctorId: data?.isStaff && data?.staffRecord
      ? data.staffRecord.doctor_id
      : user?.id ?? null,
  };
}
