import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getCachedDoctorConnections } from "@/lib/offlineDB";

export interface DoctorConnection {
  id: string;
  user_id: string;
  doctor_name: string;
  specialty: string | null;
  hospital_clinic: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateDoctorParams {
  doctor_name: string;
  specialty?: string;
  hospital_clinic?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface UpdateDoctorParams extends CreateDoctorParams {
  id: string;
}

export const useDoctorConnections = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctor-connections", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("doctor_connections")
          .select("id, user_id, doctor_name, specialty, hospital_clinic, phone, email, notes, created_at, updated_at")
          .eq("user_id", user.id)
          .order("doctor_name", { ascending: true });

        if (error) throw error;
        return data as DoctorConnection[];
      } catch (err) {
        if (!navigator.onLine) {
          const cached = await getCachedDoctorConnections(user.id);
          if (cached.length > 0) {
            return cached.map(c => ({
              id: c.id,
              user_id: c.userId,
              doctor_name: c.doctorName,
              specialty: c.specialty,
              hospital_clinic: c.hospitalClinic,
              phone: c.phone,
              email: c.email,
              notes: c.notes,
              created_at: c.cachedAt,
              updated_at: c.cachedAt,
            })) as DoctorConnection[];
          }
        }
        throw err;
      }
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const createDoctorMutation = useMutation({
    mutationFn: async (params: CreateDoctorParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("doctor_connections")
        .insert({
          user_id: user.id,
          doctor_name: params.doctor_name,
          specialty: params.specialty || null,
          hospital_clinic: params.hospital_clinic || null,
          phone: params.phone || null,
          email: params.email || null,
          notes: params.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DoctorConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-connections", user?.id] });
      toast({
        title: "Doctor Added",
        description: "Healthcare provider has been added to your list.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Doctor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateDoctorMutation = useMutation({
    mutationFn: async ({ id, ...params }: UpdateDoctorParams) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("doctor_connections")
        .update({
          doctor_name: params.doctor_name,
          specialty: params.specialty || null,
          hospital_clinic: params.hospital_clinic || null,
          phone: params.phone || null,
          email: params.email || null,
          notes: params.notes || null,
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as DoctorConnection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-connections", user?.id] });
      toast({
        title: "Doctor Updated",
        description: "Provider information has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteDoctorMutation = useMutation({
    mutationFn: async (doctorId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("doctor_connections")
        .delete()
        .eq("id", doctorId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-connections", user?.id] });
      toast({
        title: "Doctor Removed",
        description: "Provider has been removed from your list.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Remove",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    doctors: doctors || [],
    isLoading,
    createDoctor: createDoctorMutation.mutate,
    isCreating: createDoctorMutation.isPending,
    updateDoctor: updateDoctorMutation.mutate,
    isUpdating: updateDoctorMutation.isPending,
    deleteDoctor: deleteDoctorMutation.mutate,
    isDeleting: deleteDoctorMutation.isPending,
  };
};
