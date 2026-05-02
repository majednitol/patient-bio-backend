import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface DoctorAccess {
  id: string;
  doctor_id: string;
  patient_id: string;
  granted_at: string;
  last_accessed_at: string | null;
  is_active: boolean;
  doctor_profile?: {
    full_name: string;
    specialty: string | null;
    avatar_url: string | null;
  } | null;
  hospital_name?: string;
}

export const usePatientDoctorAccess = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accessRecords, isLoading } = useQuery({
    queryKey: ["patient-doctor-access", user?.id],
    queryFn: async (): Promise<DoctorAccess[]> => {
      if (!user?.id) return [];

      // Get active access records where this user is the patient
      const { data: accessData, error: accessError } = await supabase
        .from("doctor_patient_access")
        .select("id, doctor_id, patient_id, granted_at, is_active, last_accessed_at")
        .eq("patient_id", user.id)
        .eq("is_active", true)
        .order("granted_at", { ascending: false });

      if (accessError) throw accessError;
      if (!accessData?.length) return [];

      // Get doctor profiles
      const doctorIds = accessData.map((r) => r.doctor_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty, avatar_url")
        .in("user_id", doctorIds);

      if (profilesError) {
        console.error("Error fetching doctor profiles:", profilesError);
      }

      // Get hospital affiliations for these doctors
      const { data: staffData, error: staffError } = await supabase
        .from("hospital_staff")
        .select(`
          user_id,
          hospitals!inner(name)
        `)
        .in("user_id", doctorIds)
        .eq("is_active", true)
        .eq("role", "doctor");

      if (staffError) {
        console.error("Error fetching staff data:", staffError);
      }

      // Merge data
      return accessData.map((access) => {
        const profile = profiles?.find((p) => p.user_id === access.doctor_id);
        const staff = staffData?.find((s) => s.user_id === access.doctor_id);
        const hospital = staff?.hospitals as unknown as { name: string } | undefined;
        
        return {
          ...access,
          doctor_profile: profile || null,
          hospital_name: hospital?.name,
        };
      });
    },
    enabled: !!user?.id,
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (accessId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("doctor_patient_access")
        .update({ is_active: false })
        .eq("id", accessId)
        .eq("patient_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-doctor-access", user?.id] });
      toast.success("Access revoked successfully");
    },
    onError: (error) => {
      toast.error("Failed to revoke access: " + error.message);
    },
  });

  return {
    accessRecords: accessRecords || [],
    isLoading,
    revokeAccess: revokeAccessMutation.mutate,
    isRevoking: revokeAccessMutation.isPending,
  };
};
