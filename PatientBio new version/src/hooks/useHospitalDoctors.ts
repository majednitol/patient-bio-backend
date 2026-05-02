import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HospitalDoctor {
  id: string;
  user_id: string;
  hospital_id: string;
  hospital_name: string;
  full_name: string;
  specialty: string | null;
  avatar_url: string | null;
}

export const useHospitalDoctors = () => {
  return useQuery({
    queryKey: ["hospital-doctors"],
    queryFn: async (): Promise<HospitalDoctor[]> => {
      // Get all verified doctor profiles with their hospital affiliations
      const { data: staffData, error: staffError } = await supabase
        .from("hospital_staff")
        .select(`
          id,
          user_id,
          hospital_id,
          hospitals!inner(name)
        `)
        .eq("role", "doctor")
        .eq("is_active", true);

      if (staffError) throw staffError;
      if (!staffData?.length) return [];

      // Get doctor profiles for these staff members
      const userIds = staffData.map((s) => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty, avatar_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching doctor profiles:", profilesError);
      }

      // Merge data
      return staffData.map((staff) => {
        const profile = profiles?.find((p) => p.user_id === staff.user_id);
        const hospital = staff.hospitals as unknown as { name: string };
        return {
          id: staff.id,
          user_id: staff.user_id,
          hospital_id: staff.hospital_id,
          hospital_name: hospital?.name || "Unknown Hospital",
          full_name: profile?.full_name || "Doctor",
          specialty: profile?.specialty || null,
          avatar_url: profile?.avatar_url || null,
        };
      });
    },
  });
};
