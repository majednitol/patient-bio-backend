import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface VisitSummary {
  id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  summary_text: string;
  diagnosis: string | null;
  medications_summary: string | null;
  follow_up_instructions: string | null;
  is_approved: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch a visit summary for a specific appointment (doctor use) */
export function useVisitSummaryByAppointment(appointmentId: string | null) {
  return useQuery({
    queryKey: ['visit-summary', 'appointment', appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const { data, error } = await supabase
        .from('visit_summaries')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      if (error) throw error;
      return data as VisitSummary | null;
    },
    enabled: !!appointmentId,
  });
}

/** Fetch all approved visit summaries for the current patient */
export function usePatientVisitSummaries() {
  return useQuery({
    queryKey: ['visit-summaries', 'patient'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_summaries')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as VisitSummary[];
    },
  });
}

/** Generate a visit summary via edge function */
export function useGenerateVisitSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-visit-summary', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { appointmentId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.data as VisitSummary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visit-summary', 'appointment', data.appointment_id] });
      toast({ title: 'Summary Generated', description: 'Review and approve the visit summary.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Generation Failed', description: error.message, variant: 'destructive' });
    },
  });
}

/** Approve a visit summary (makes it visible to patient) */
export function useApproveVisitSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (summaryId: string) => {
      const { data, error } = await supabase
        .from('visit_summaries')
        .update({ is_approved: true, approved_at: new Date().toISOString() })
        .eq('id', summaryId)
        .select()
        .single();
      if (error) throw error;
      return data as VisitSummary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visit-summary'] });
      queryClient.invalidateQueries({ queryKey: ['visit-summaries'] });
      toast({ title: 'Summary Approved', description: 'The patient can now view this summary.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Approval Failed', description: error.message, variant: 'destructive' });
    },
  });
}

/** Update summary fields before approving */
export function useUpdateVisitSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VisitSummary> & { id: string }) => {
      const { data, error } = await supabase
        .from('visit_summaries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as VisitSummary;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['visit-summary', 'appointment', data.appointment_id] });
    },
  });
}
