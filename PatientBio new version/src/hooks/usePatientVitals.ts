/**
 * usePatientVitals - CRUD for patient vitals records
 * Phase 5a: Quick Vitals Entry
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PatientVitals {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  hospital_id: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  weight: number | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export interface VitalsInput {
  patient_id: string;
  appointment_id?: string;
  hospital_id?: string;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
  heart_rate?: number | null;
  temperature?: number | null;
  spo2?: number | null;
  weight?: number | null;
  notes?: string;
}

export function usePatientVitalsHistory(patientId: string | null | undefined, limit = 5) {
  return useQuery({
    queryKey: ['patient-vitals', patientId, limit],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as PatientVitals[];
    },
    enabled: !!patientId,
  });
}

export function useRecordVitals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VitalsInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('patient_vitals')
        .insert({
          ...input,
          doctor_id: user.id,
          bp_systolic: input.bp_systolic || null,
          bp_diastolic: input.bp_diastolic || null,
          heart_rate: input.heart_rate || null,
          temperature: input.temperature || null,
          spo2: input.spo2 || null,
          weight: input.weight || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-vitals', data.patient_id] });
      toast({ title: 'Vitals Recorded', description: 'Patient vitals saved successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
