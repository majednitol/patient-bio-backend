import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type UserRole = "user" | "admin" | "doctor" | "hospital_admin" | "pathologist" | "researcher";

export const roleLabels: Record<UserRole, string> = {
  user: "Patient",
  admin: "Administrator",
  doctor: "Doctor",
  hospital_admin: "Hospital Admin",
  pathologist: "Pathologist",
  researcher: "Researcher",
};

export const rolePortalMap: Record<UserRole, string> = {
  user: "/auth",
  admin: "/admin/login",
  doctor: "/doctors/login",
  hospital_admin: "/hospital/login",
  pathologist: "/pathologist/login",
  researcher: "/researcher/login",
};

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  last_activity_at: string | null;
  role: UserRole;
  email_confirmed_at: string | null;
}

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        method: "GET",
      });

      if (error) {
        console.error("Error fetching users:", error);
        throw new Error(error.message || "Failed to fetch users");
      }

      return data?.users || [];
    },
  });
};

export const useSetUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      role,
    }: {
      targetUserId: string;
      role: UserRole;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-users?action=set-role",
        {
          method: "POST",
          body: { targetUserId, role },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to update role");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-users?action=delete-user",
        {
          method: "POST",
          body: { targetUserId },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to delete user");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });
};

export const useBulkDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserIds: string[]) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-users?action=bulk-delete-users",
        {
          method: "POST",
          body: { targetUserIds },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to delete users");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Successfully deleted ${data.deleted} user(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete users");
    },
  });
};

export const useBulkSetRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserIds,
      role,
    }: {
      targetUserIds: string[];
      role: UserRole;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-users?action=bulk-set-role",
        {
          method: "POST",
          body: { targetUserIds, role },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to update roles");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Successfully updated ${data.updated} user role(s)`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update roles");
    },
  });
};
