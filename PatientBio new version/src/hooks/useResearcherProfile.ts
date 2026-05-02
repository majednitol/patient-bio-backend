import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface ResearcherProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  institution_name: string | null;
  institution_type: string | null;
  department: string | null;
  research_focus: string | null;
  license_number: string | null;
  avatar_url: string | null;
  primary_domain: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const useResearcherProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["researcher-profile", user?.id],
    queryFn: async (): Promise<ResearcherProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("researcher_profiles")
        .select("id, user_id, full_name, email, phone, institution_name, institution_type, department, research_focus, license_number, avatar_url, primary_domain, is_verified, created_at, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching researcher profile:", error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const createProfile = useMutation({
    mutationFn: async (profileData: Partial<ResearcherProfile>) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create profile
      // Role is already assigned at signup time via database trigger
      const { data, error } = await supabase
        .from("researcher_profiles")
        .insert({
          user_id: user.id,
          full_name: profileData.full_name || "",
          email: profileData.email,
          phone: profileData.phone,
          institution_name: profileData.institution_name,
          institution_type: profileData.institution_type,
          department: profileData.department,
          research_focus: profileData.research_focus,
          license_number: profileData.license_number,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Profile Created",
        description: "Your researcher profile has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["researcher-profile", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["user-role", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating researcher profile:", error);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (profileData: Partial<ResearcherProfile>) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("researcher_profiles")
        .update({
          full_name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          institution_name: profileData.institution_name,
          institution_type: profileData.institution_type,
          department: profileData.department,
          research_focus: profileData.research_focus,
          license_number: profileData.license_number,
          avatar_url: profileData.avatar_url,
          primary_domain: profileData.primary_domain,
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["researcher-profile", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating researcher profile:", error);
    },
  });

  return {
    profile,
    isLoading,
    createProfile: createProfile.mutate,
    updateProfile: updateProfile.mutate,
    isCreating: createProfile.isPending,
    isUpdating: updateProfile.isPending,
  };
};
