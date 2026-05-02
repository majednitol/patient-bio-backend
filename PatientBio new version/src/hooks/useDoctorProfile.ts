import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DoctorProfile } from "@/types/hospital";
import { toast } from "@/hooks/use-toast";

export const useDoctorProfile = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ["doctor-profile", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from("doctor_profiles")
        .select("id, user_id, full_name, specialty, avatar_url, license_number, experience_years, is_verified, consultation_fee, bio, qualification, phone, is_online, last_seen_at, practice_type, diseases_treated, follow_up_fee, follow_up_window_days, languages_spoken, created_at, updated_at")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return data as DoctorProfile | null;
    },
    enabled: !!targetUserId,
    staleTime: STALE_TIMES.LONG,
  });
};

export const useCreateDoctorProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      profileData: Omit<DoctorProfile, "id" | "user_id" | "is_verified" | "is_online" | "last_seen_at" | "created_at" | "updated_at">
    ) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create the doctor profile
      // Role is already assigned at signup time via database trigger
      const { error: profileError } = await supabase.from("doctor_profiles").insert({
        ...profileData,
        user_id: user.id,
      });

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
      queryClient.invalidateQueries({ queryKey: ["is-doctor"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success("Doctor profile created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create profile: " + error.message);
    },
  });
};

export const useUpdateDoctorProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (profileData: Partial<DoctorProfile>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("doctor_profiles")
        .update(profileData)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });
};

export const useIsDoctor = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-doctor", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "doctor")
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });
};
