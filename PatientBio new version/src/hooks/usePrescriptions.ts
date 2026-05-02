import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";
import { getCachedPrescriptions } from "@/lib/offlineDB";

export interface TimingPattern {
  morning: number;
  noon: number;
  night: number;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  timingPattern?: TimingPattern;
}

export const formatTimingPattern = (tp?: TimingPattern): string => {
  if (!tp) return "";
  return `${tp.morning}+${tp.noon}+${tp.night}`;
};

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string | null;
  diagnosis: string | null;
  chief_complaints: string | null;
  investigations: string | null;
  advice: string | null;
  medications: Medication[];
  instructions: string | null;
  notes: string | null;
  follow_up_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  doctor_qualification?: string;
  doctor_phone?: string;
}

export interface CreatePrescriptionInput {
  patient_id: string;
  hospital_id?: string;
  diagnosis?: string;
  chief_complaints?: string;
  investigations?: string;
  advice?: string;
  medications: Medication[];
  instructions?: string;
  notes?: string;
  follow_up_date?: string;
  icd11_code?: string;
  icd11_chapter_code?: string;
  icd_standard?: string;
}

const PRESCRIPTION_SELECT = "id, patient_id, doctor_id, hospital_id, diagnosis, chief_complaints, investigations, advice, medications, instructions, notes, follow_up_date, is_active, created_at, updated_at";

const parseMedications = (medications: Json | null): Medication[] => {
  if (!medications) return [];
  if (Array.isArray(medications)) {
    return medications as unknown as Medication[];
  }
  return [];
};

// For doctors - get prescriptions they've written (with patient names)
export const useDoctorPrescriptions = (patientId?: string, doctorId?: string) => {
  const { user } = useAuth();
  const effectiveId = doctorId || user?.id;

  return useQuery({
    queryKey: ["doctor-prescriptions", effectiveId, patientId],
    queryFn: async (): Promise<Prescription[]> => {
      if (!effectiveId) return [];

      let query = supabase
        .from("prescriptions")
        .select(PRESCRIPTION_SELECT)
        .eq("doctor_id", effectiveId)
        .order("created_at", { ascending: false });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data: prescriptions, error } = await query;

      if (error) throw error;
      if (!prescriptions || prescriptions.length === 0) return [];

      const patientIds = [...new Set(prescriptions.map(p => p.patient_id))];
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", patientIds);

      const patientMap = new Map(
        (profiles || []).map(p => [p.user_id, p.display_name])
      );
      
      return prescriptions.map(prescription => ({
        ...prescription,
        medications: parseMedications(prescription.medications),
        patient_name: patientMap.get(prescription.patient_id) || undefined,
      }));
    },
    enabled: !!effectiveId,
  });
};

// For patients - get prescriptions issued to them (with doctor info)
export const usePatientPrescriptions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patient-prescriptions", user?.id],
    queryFn: async (): Promise<Prescription[]> => {
      if (!user?.id) return [];

      try {
        const { data: prescriptions, error } = await supabase
          .from("prescriptions")
          .select(PRESCRIPTION_SELECT)
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!prescriptions || prescriptions.length === 0) return [];

        const doctorIds = [...new Set(prescriptions.map(p => p.doctor_id))];
        const { data: doctors } = await supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty, qualification, phone")
          .in("user_id", doctorIds);

        const doctorMap = new Map(
          (doctors || []).map(d => [d.user_id, d])
        );
        
        return prescriptions.map(prescription => {
          const doctor = doctorMap.get(prescription.doctor_id);
          return {
            ...prescription,
            medications: parseMedications(prescription.medications),
            doctor_name: doctor?.full_name,
            doctor_specialty: doctor?.specialty,
            doctor_qualification: doctor?.qualification,
            doctor_phone: doctor?.phone,
          };
        });
      } catch (err) {
        // Offline fallback
        if (!navigator.onLine) {
          const cached = await getCachedPrescriptions(user.id);
          return cached.map(p => ({
            id: p.id,
            patient_id: user.id,
            doctor_id: "",
            hospital_id: null,
            diagnosis: p.diagnosis,
            chief_complaints: null,
            investigations: null,
            advice: null,
            medications: p.medications as Medication[],
            instructions: null,
            notes: null,
            follow_up_date: p.followUpDate,
            is_active: p.isActive,
            created_at: p.createdAt,
            updated_at: p.createdAt,
            doctor_name: p.doctorName || undefined,
            doctor_specialty: p.doctorSpecialty || undefined,
          }));
        }
        throw err;
      }
    },
    enabled: !!user?.id,
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreatePrescriptionInput) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: input.patient_id,
          doctor_id: user.id,
          hospital_id: input.hospital_id || null,
          diagnosis: input.diagnosis || null,
          chief_complaints: input.chief_complaints || null,
          investigations: input.investigations || null,
          advice: input.advice || null,
          medications: input.medications as unknown as Json,
          instructions: input.instructions || null,
          notes: input.notes || null,
          follow_up_date: input.follow_up_date || null,
          icd11_code: input.icd11_code || null,
          icd11_chapter_code: input.icd11_chapter_code || null,
          icd_standard: input.icd_standard || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      toast.success("Prescription created successfully!");

      if (data?.id) {
        supabase.functions.invoke("auto-populate-clinical-records", {
          body: {
            prescription_id: data.id,
            patient_id: data.patient_id,
            doctor_id: data.doctor_id,
            diagnosis: data.diagnosis,
            medications: data.medications,
            notes: data.notes,
          },
        }).catch((err) => console.log("Auto-populate clinical records (graceful):", err));
      }
    },
    onError: (error) => {
      toast.error("Failed to create prescription: " + error.message);
    },
  });
};

export const useUpdatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<CreatePrescriptionInput> & { id: string; is_active?: boolean }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;
      if (data.chief_complaints !== undefined) updateData.chief_complaints = data.chief_complaints;
      if (data.investigations !== undefined) updateData.investigations = data.investigations;
      if (data.advice !== undefined) updateData.advice = data.advice;
      if (data.instructions !== undefined) updateData.instructions = data.instructions;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.follow_up_date !== undefined) updateData.follow_up_date = data.follow_up_date;
      if (data.medications !== undefined) {
        updateData.medications = data.medications as unknown as Json;
      }
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { error } = await supabase
        .from("prescriptions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["patient-prescriptions"] });
      toast.success("Prescription updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update prescription: " + error.message);
    },
  });
};

export const useTogglePrescriptionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("prescriptions")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      queryClient.invalidateQueries({ queryKey: ["patient-prescriptions"] });
      toast.success(
        variables.is_active
          ? "Prescription marked as active"
          : "Prescription marked as completed"
      );
    },
    onError: (error) => {
      toast.error("Failed to update prescription status: " + error.message);
    },
  });
};