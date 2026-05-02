import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorStaff {
  id: string;
  doctor_id: string;
  staff_user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: "nurse" | "receptionist" | "assistant";
  is_active: boolean;
  invite_status: "pending" | "accepted" | "manual";
  invite_token: string;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export function useDoctorStaff() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["doctor-staff", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_staff")
        .select("id, doctor_id, staff_user_id, full_name, phone, email, role, is_active, invite_status, invite_token, permissions, created_at, updated_at")
        .eq("doctor_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as DoctorStaff[];
    },
    enabled: !!user?.id,
  });
}

export function useAddStaff() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staff: {
      full_name: string;
      email?: string;
      phone?: string;
      role: "nurse" | "receptionist" | "assistant";
      invite_status: "pending" | "manual";
    }) => {
      const { data, error } = await supabase
        .from("doctor_staff")
        .insert({
          doctor_id: user!.id,
          full_name: staff.full_name,
          email: staff.email || null,
          phone: staff.phone || null,
          role: staff.role,
          invite_status: staff.invite_status,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-staff"] });
      toast({ title: "Staff added", description: "Staff member has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<DoctorStaff> & { id: string }) => {
      const { data, error } = await supabase
        .from("doctor_staff")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-staff"] });
      toast({ title: "Staff updated", description: "Staff member has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useRemoveStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("doctor_staff")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-staff"] });
      toast({ title: "Staff removed", description: "Staff member has been deactivated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
