import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Bed, Ward } from "./useWards";
import { hospitalNotifications } from "@/hooks/useHospitalNotifications";

export interface Admission {
  id: string;
  hospital_id: string;
  patient_id: string;
  bed_id: string | null;
  admitting_doctor_id: string;
  admission_date: string;
  expected_discharge: string | null;
  actual_discharge: string | null;
  admission_reason: string | null;
  diagnosis: string | null;
  status: "admitted" | "discharged" | "transferred";
  discharge_notes: string | null;
  discharged_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  bed?: Bed & { ward?: Ward };
  patient_profile?: {
    display_name: string | null;
    phone: string | null;
    date_of_birth: string | null;
    gender: string | null;
  };
  doctor_profile?: {
    full_name: string;
    specialty: string | null;
  };
}

// Cache configuration for better performance
const STALE_TIME = 30 * 1000; // 30 seconds
const GC_TIME = 5 * 60 * 1000; // 5 minutes

export const useAdmissions = (hospitalId: string, status?: "admitted" | "discharged" | "transferred") => {
  return useQuery({
    queryKey: ["admissions", hospitalId, status],
    queryFn: async () => {
      let query = supabase
        .from("admissions")
        .select(`
          *,
          bed:beds(*, ward:wards(*)),
          patient_profile:user_profiles!admissions_patient_id_fkey(display_name, phone, date_of_birth, gender),
          doctor_profile:doctor_profiles!admissions_admitting_doctor_id_fkey(full_name, specialty)
        `)
        .eq("hospital_id", hospitalId)
        .order("admission_date", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Admission[];
    },
    enabled: !!hospitalId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
};

export const useCurrentAdmissions = (hospitalId: string) => {
  return useAdmissions(hospitalId, "admitted");
};

export const useAdmissionMutations = (hospitalId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const createAdmission = useMutation({
    mutationFn: async (admission: {
      patient_id: string;
      bed_id: string;
      admitting_doctor_id: string;
      admission_reason?: string;
      diagnosis?: string;
      expected_discharge?: string;
    }) => {
      const { data, error } = await supabase
        .from("admissions")
        .insert({
          ...admission,
          hospital_id: hospitalId,
          status: "admitted",
        })
        .select(`
          *,
          bed:beds(*, ward:wards(*)),
          patient_profile:user_profiles!admissions_patient_id_fkey(display_name)
        `)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admissions", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["available-beds", hospitalId] });
      toast({ title: "Patient admitted successfully" });
      
      // Notify hospital staff
      const patientName = (data as any)?.patient_profile?.display_name || "A patient";
      const wardName = (data as any)?.bed?.ward?.name || "the hospital";
      hospitalNotifications.admission(hospitalId, patientName, wardName, user?.id);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to admit patient", description: error.message, variant: "destructive" });
    },
  });

  const dischargePatient = useMutation({
    mutationFn: async ({ 
      admissionId, 
      dischargeNotes, 
      dischargedBy 
    }: { 
      admissionId: string; 
      dischargeNotes?: string; 
      dischargedBy: string;
    }) => {
      const { data, error } = await supabase
        .from("admissions")
        .update({
          status: "discharged",
          actual_discharge: new Date().toISOString(),
          discharge_notes: dischargeNotes,
          discharged_by: dischargedBy,
        })
        .eq("id", admissionId)
        .select(`
          *,
          patient_profile:user_profiles!admissions_patient_id_fkey(display_name)
        `)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admissions", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["available-beds", hospitalId] });
      toast({ title: "Patient discharged successfully" });
      
      // Notify hospital staff
      const patientName = (data as any)?.patient_profile?.display_name || "A patient";
      hospitalNotifications.discharge(hospitalId, patientName, user?.id);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to discharge patient", description: error.message, variant: "destructive" });
    },
  });

  const transferBed = useMutation({
    mutationFn: async ({ admissionId, newBedId }: { admissionId: string; newBedId: string }) => {
      const { data, error } = await supabase
        .from("admissions")
        .update({ bed_id: newBedId })
        .eq("id", admissionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["beds", hospitalId] });
      queryClient.invalidateQueries({ queryKey: ["available-beds", hospitalId] });
      toast({ title: "Patient transferred successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to transfer patient", description: error.message, variant: "destructive" });
    },
  });

  const updateAdmission = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Admission> & { id: string }) => {
      const { bed, patient_profile, doctor_profile, ...cleanUpdates } = updates;
      const { data, error } = await supabase
        .from("admissions")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions", hospitalId] });
      toast({ title: "Admission updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update admission", description: error.message, variant: "destructive" });
    },
  });

  return { createAdmission, dischargePatient, transferBed, updateAdmission };
};
