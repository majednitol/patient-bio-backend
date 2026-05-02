import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface PathologistProfile {
  id: string;
  user_id: string;
  full_name: string;
  license_number: string | null;
  specialization_area: string | null;
  total_experience: number | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  lab_name: string | null;
  lab_address: string | null;
  lab_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
  certifications: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const usePathologistProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ["pathologist-profile", user?.id],
    queryFn: async (): Promise<PathologistProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("pathologist_profiles")
        .select("id, user_id, full_name, license_number, specialization_area, total_experience, phone, email, avatar_url, lab_name, lab_address, lab_hours, certifications, is_verified, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching pathologist profile:", error);
        return null;
      }

      return data as PathologistProfile | null;
    },
    enabled: !!user?.id,
  });

  const createProfile = useMutation({
    mutationFn: async (profileData: Partial<PathologistProfile>) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create pathologist profile
      // Role is already assigned at signup time via database trigger
      const { error } = await supabase.from("pathologist_profiles").insert({
        user_id: user.id,
        full_name: profileData.full_name || "",
        license_number: profileData.license_number,
        specialization_area: profileData.specialization_area,
        total_experience: profileData.total_experience,
        phone: profileData.phone,
        email: profileData.email || user.email,
        lab_name: profileData.lab_name,
        lab_address: profileData.lab_address,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile created successfully" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-role", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error creating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (profileData: Partial<PathologistProfile>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("pathologist_profiles")
        .update({
          full_name: profileData.full_name,
          license_number: profileData.license_number,
          specialization_area: profileData.specialization_area,
          total_experience: profileData.total_experience,
          phone: profileData.phone,
          email: profileData.email,
          lab_name: profileData.lab_name,
          lab_address: profileData.lab_address,
          avatar_url: profileData.avatar_url,
          lab_hours: (profileData as any).lab_hours,
          certifications: (profileData as any).certifications,
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-profile", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    isLoading,
    refetch,
    createProfile: createProfile.mutate,
    updateProfile: updateProfile.mutate,
    isCreating: createProfile.isPending,
    isUpdating: updateProfile.isPending,
    isUpdateSuccess: updateProfile.isSuccess,
    resetUpdateStatus: updateProfile.reset,
  };
};
