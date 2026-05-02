import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PatientAccess {
  id: string;
  doctor_id: string;
  patient_id: string;
  access_token_id: string | null;
  granted_at: string;
  last_accessed_at: string | null;
  is_active: boolean;
  patient_profile?: {
    display_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
}

interface QuickRegisterPatientInput {
  hospitalId: string;
  display_name: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
}

export const useDoctorPatients = (doctorId?: string) => {
  const { user } = useAuth();
  const targetDoctorId = doctorId || user?.id;

  return useQuery({
    queryKey: ["doctor-patients", targetDoctorId],
    queryFn: async (): Promise<(PatientAccess & { display_name?: string | null })[]> => {
      if (!targetDoctorId) return [];

      // Get active patient access records for this doctor
      const { data: accessRecords, error: accessError } = await supabase
        .from("doctor_patient_access")
        .select("id, doctor_id, patient_id, access_token_id, granted_at, last_accessed_at, is_active")
        .eq("doctor_id", targetDoctorId)
        .eq("is_active", true)
        .order("granted_at", { ascending: false });

      if (accessError) throw accessError;
      if (!accessRecords?.length) return [];

      // Get patient profiles for the accessed patients
      const patientIds = accessRecords.map((r) => r.patient_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, date_of_birth, gender, phone, avatar_url")
        .in("user_id", patientIds);

      if (profilesError) {
        console.error("Error fetching patient profiles:", profilesError);
      }

      // Merge data with flat properties for easier access
      return accessRecords.map((access) => {
        const profile = profiles?.find((p) => p.user_id === access.patient_id);
        return {
          ...access,
          patient_profile: profile || null,
          display_name: profile?.display_name || null,
          date_of_birth: profile?.date_of_birth || null,
          gender: profile?.gender || null,
        };
      });
    },
    enabled: !!targetDoctorId,
    staleTime: STALE_TIMES.STANDARD,
  });
};

export const usePatientHealthData = (patientId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patient-health-data", patientId, user?.id],
    queryFn: async () => {
      if (!patientId || !user?.id) return null;

      // Verify doctor has access to this patient
      const { data: access, error: accessError } = await supabase
        .from("doctor_patient_access")
        .select("id")
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId)
        .eq("is_active", true)
        .maybeSingle();

      if (accessError) throw accessError;
      if (!access) throw new Error("No access to this patient");

      // Fetch patient data using edge function for security
      const { data, error } = await supabase.functions.invoke("get-patient-data-for-doctor", {
        body: { patient_id: patientId },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!patientId && !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });
};

export const useUpdatePatientAccess = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (patientId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("doctor_patient_access")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("doctor_id", user.id)
        .eq("patient_id", patientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
    },
  });
};

interface PatientLookupResult {
  found: boolean;
  patient_id?: string;
  display_name?: string;
  gender?: string | null;
  age?: number | null;
  already_connected?: boolean;
  has_inactive_access?: boolean;
}

export const useLookupPatientByCode = () => {
  return useMutation({
    mutationFn: async (patientCode: string): Promise<PatientLookupResult> => {
      const { data, error } = await supabase.functions.invoke("lookup-patient-by-id", {
        body: { patient_code: patientCode },
      });

      if (error) throw error;
      return data;
    },
  });
};

export const useGrantPatientAccess = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ doctorId, patientId }: { doctorId: string; patientId: string }) => {
      const targetDoctorId = doctorId || user?.id;
      if (!targetDoctorId) throw new Error("Not authenticated");
      if (!user?.id) throw new Error("Not authenticated");

      // Check for existing access record (might be inactive)
      const { data: existing, error: checkError } = await supabase
        .from("doctor_patient_access")
        .select("id, is_active")
        .eq("doctor_id", targetDoctorId)
        .eq("patient_id", patientId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Reactivate existing record
        const { error: updateError } = await supabase
          .from("doctor_patient_access")
          .update({ is_active: true, last_accessed_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        return { reactivated: true };
      }

      // Create new access record
      const { error: insertError } = await supabase
        .from("doctor_patient_access")
        .insert({
          doctor_id: targetDoctorId,
          patient_id: patientId,
          is_active: true,
        });

      if (insertError) throw insertError;
      return { reactivated: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
    },
  });
};

export const useQuickRegisterPatient = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      hospitalId,
      display_name,
      phone,
      date_of_birth,
      gender,
    }: QuickRegisterPatientInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Generate a UUID for the guest patient
      const guestUserId = crypto.randomUUID();

      // 1. Create user_profile as guest patient
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .insert({
          user_id: guestUserId,
          display_name,
          phone,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          is_guest_patient: true,
          registered_by_hospital_id: hospitalId,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 2. Grant doctor access
      const { error: accessError } = await supabase
        .from("doctor_patient_access")
        .insert({
          doctor_id: user.id,
          patient_id: guestUserId,
          is_active: true,
        });

      if (accessError) throw accessError;

      return profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
    },
  });
};
