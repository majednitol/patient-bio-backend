import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HospitalStaff, HospitalStaffRole, DoctorProfile } from "@/types/hospital";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  user_id: string;
  display_name: string | null;
}

interface StaffWithProfile extends HospitalStaff {
  doctor_profile?: DoctorProfile | null;
  user_profile?: UserProfile | null;
  display_name?: string | null;
}

// Cache configuration for better performance
const STALE_TIME = 30 * 1000; // 30 seconds
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export const useHospitalStaff = (hospitalId: string | undefined) => {
  return useQuery({
    queryKey: ["hospital-staff", hospitalId],
    queryFn: async (): Promise<StaffWithProfile[]> => {
      if (!hospitalId) return [];

      // Single query with joined profiles - eliminates 2 extra round trips
      const { data: staffData, error: staffError } = await supabase
        .from("hospital_staff")
        .select(`
          *,
          doctor_profiles:doctor_profiles(user_id, full_name, specialty, avatar_url),
          user_profiles:user_profiles!hospital_staff_user_id_fkey(user_id, display_name)
        `)
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("joined_at", { ascending: false });

      if (staffError) throw staffError;

      // Map the joined data to the expected structure
      return (staffData || []).map((staff: any) => ({
        ...staff,
        role: staff.role as HospitalStaffRole,
        doctor_profile: staff.doctor_profiles || null,
        user_profile: staff.user_profiles || null,
        display_name:
          staff.doctor_profiles?.full_name ||
          staff.user_profiles?.display_name ||
          null,
      }));
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useIsHospitalAdmin = (hospitalId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-hospital-admin", hospitalId, user?.id],
    queryFn: async () => {
      if (!hospitalId || !user?.id) return false;

      const { data, error } = await supabase
        .from("hospital_staff")
        .select("role")
        .eq("hospital_id", hospitalId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (error) return false;
      return data?.role === "admin";
    },
    enabled: !!hospitalId && !!user?.id,
  });
};

export const useAddStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hospitalId,
      userId,
      role,
      department,
      employeeId,
    }: {
      hospitalId: string;
      userId: string;
      role: HospitalStaffRole;
      department?: string;
      employeeId?: string;
    }) => {
      const { error } = await supabase.from("hospital_staff").insert({
        hospital_id: hospitalId,
        user_id: userId,
        role,
        department,
        employee_id: employeeId,
      });

      if (error) throw error;

      // Add doctor role if needed
      if (role === "doctor") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "doctor" });

        if (roleError && !roleError.message.includes("duplicate")) {
          console.error("Error adding doctor role:", roleError);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-staff", variables.hospitalId],
      });
      toast.success("Staff member added successfully!");
    },
    onError: (error) => {
      toast.error("Failed to add staff: " + error.message);
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      hospitalId,
      ...data
    }: Partial<HospitalStaff> & { id: string; hospitalId: string }) => {
      const { error } = await supabase
        .from("hospital_staff")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-staff", variables.hospitalId],
      });
      toast.success("Staff member updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update staff: " + error.message);
    },
  });
};

export const useRemoveStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      hospitalId,
    }: {
      id: string;
      hospitalId: string;
    }) => {
      const { error } = await supabase
        .from("hospital_staff")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-staff", variables.hospitalId],
      });
      toast.success("Staff member removed successfully!");
    },
    onError: (error) => {
      toast.error("Failed to remove staff: " + error.message);
    },
  });
};
