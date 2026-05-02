import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Hospital } from "@/types/hospital";
import { toast } from "@/hooks/use-toast";

export const useHospitals = () => {
  return useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Hospital[];
    },
  });
};

export const useMyHospitals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-hospitals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("hospital_staff")
        .select(`
          *,
          hospital:hospitals(*)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useHospital = (hospitalId: string | undefined) => {
  return useQuery({
    queryKey: ["hospital", hospitalId],
    queryFn: async () => {
      if (!hospitalId) return null;

      const { data, error } = await supabase
        .from("hospitals")
        .select("*")
        .eq("id", hospitalId)
        .single();

      if (error) throw error;
      return data as Hospital;
    },
    enabled: !!hospitalId,
  });
};

export const useCreateHospital = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (hospitalData: Partial<Hospital>) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Create the hospital
      const { data: hospital, error: hospitalError } = await supabase
        .from("hospitals")
        .insert({
          name: hospitalData.name || "",
          type: hospitalData.type || "hospital",
          registration_number: hospitalData.registration_number,
          address: hospitalData.address,
          city: hospitalData.city,
          state: hospitalData.state,
          country: hospitalData.country,
          phone: hospitalData.phone,
          email: hospitalData.email,
          website: hospitalData.website,
          logo_url: hospitalData.logo_url,
          description: hospitalData.description,
          created_by: user.id,
        })
        .select()
        .single();

      if (hospitalError) throw hospitalError;

      // Add the creator as hospital admin
      const { error: staffError } = await supabase
        .from("hospital_staff")
        .insert({
          hospital_id: hospital.id,
          user_id: user.id,
          role: "admin",
        });

      if (staffError) throw staffError;

      // Add hospital_admin role to user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "hospital_admin",
        });

      // Ignore if role already exists
      if (roleError && !roleError.message.includes("duplicate")) {
        console.error("Error adding role:", roleError);
      }

      return hospital;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["my-hospitals"] });
      toast.success("Hospital registered successfully!");
    },
    onError: (error) => {
      toast.error("Failed to register hospital: " + error.message);
    },
  });
};

export const useUpdateHospital = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Hospital> & { id: string }) => {
      const { error } = await supabase
        .from("hospitals")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hospitals"] });
      queryClient.invalidateQueries({ queryKey: ["hospital", variables.id] });
      toast.success("Hospital updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update hospital: " + error.message);
    },
  });
};
