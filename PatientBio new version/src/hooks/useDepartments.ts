import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Department } from "@/types/department";

export function useDepartments(hospitalId: string | undefined) {
  return useQuery({
    queryKey: ["hospital-departments", hospitalId],
    queryFn: async () => {
      if (!hospitalId) return [];

      const { data, error } = await supabase
        .from("hospital_departments")
        .select("id, hospital_id, name, description, head_staff_id, is_active, created_at, updated_at")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      // Fetch head staff names separately
      const headStaffIds = data
        ?.filter((d) => d.head_staff_id)
        .map((d) => d.head_staff_id) as string[];

      let headStaffMap = new Map<string, string>();
      if (headStaffIds?.length > 0) {
        const { data: staffData } = await supabase
          .from("hospital_staff")
          .select("id, doctor_profile:doctor_profiles(full_name)")
          .in("id", headStaffIds);

        staffData?.forEach((s: any) => {
          if (s.doctor_profile?.full_name) {
            headStaffMap.set(s.id, s.doctor_profile.full_name);
          }
        });
      }

      // Get staff counts per department
      const { data: staffCounts, error: countError } = await supabase
        .from("hospital_staff")
        .select("department_id")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .not("department_id", "is", null);

      if (countError) throw countError;

      const countMap = new Map<string, number>();
      staffCounts?.forEach((s) => {
        if (s.department_id) {
          countMap.set(s.department_id, (countMap.get(s.department_id) || 0) + 1);
        }
      });

      return (data || []).map((dept) => ({
        ...dept,
        staff_count: countMap.get(dept.id) || 0,
        head_staff: dept.head_staff_id
          ? {
              id: dept.head_staff_id,
              doctor_profile: headStaffMap.has(dept.head_staff_id)
                ? { full_name: headStaffMap.get(dept.head_staff_id)! }
                : null,
            }
          : null,
      })) as Department[];
    },
    enabled: !!hospitalId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hospitalId,
      name,
      description,
      headStaffId,
    }: {
      hospitalId: string;
      name: string;
      description?: string;
      headStaffId?: string;
    }) => {
      const { data, error } = await supabase
        .from("hospital_departments")
        .insert({
          hospital_id: hospitalId,
          name,
          description: description || null,
          head_staff_id: headStaffId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-departments", variables.hospitalId],
      });
      toast.success("Department created successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate key")) {
        toast.error("A department with this name already exists");
      } else {
        toast.error("Failed to create department");
      }
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      hospitalId,
      name,
      description,
      headStaffId,
    }: {
      id: string;
      hospitalId: string;
      name: string;
      description?: string;
      headStaffId?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("hospital_departments")
        .update({
          name,
          description: description || null,
          head_staff_id: headStaffId || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-departments", variables.hospitalId],
      });
      toast.success("Department updated successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate key")) {
        toast.error("A department with this name already exists");
      } else {
        toast.error("Failed to update department");
      }
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      hospitalId,
    }: {
      id: string;
      hospitalId: string;
    }) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("hospital_departments")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hospital-departments", variables.hospitalId],
      });
      toast.success("Department deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete department");
    },
  });
}
