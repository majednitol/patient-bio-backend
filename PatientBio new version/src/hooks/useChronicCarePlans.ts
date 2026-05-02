import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ChronicCondition, CarePlanMilestone } from "@/constants/chronicCareTemplates";

export interface ChronicCarePlan {
  id: string;
  patient_id: string;
  doctor_id: string;
  condition_type: ChronicCondition;
  plan_name: string;
  milestones: CarePlanMilestone[];
  status: "active" | "completed" | "paused";
  next_review_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useChronicCarePlans(patientId?: string | null, doctorId?: string | null) {
  const { user } = useAuth();
  const effectiveDoctorId = doctorId || user?.id;

  return useQuery({
    queryKey: ["chronic-care-plans", patientId, effectiveDoctorId],
    queryFn: async () => {
      let query = supabase
        .from("chronic_care_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (patientId) query = query.eq("patient_id", patientId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ChronicCarePlan[];
    },
    enabled: !!effectiveDoctorId,
  });
}

export function useCreateCarePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: {
      patient_id: string;
      doctor_id: string;
      condition_type: ChronicCondition;
      plan_name: string;
      milestones: CarePlanMilestone[];
      next_review_date?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("chronic_care_plans")
        .insert({
          patient_id: plan.patient_id,
          doctor_id: plan.doctor_id,
          condition_type: plan.condition_type,
          plan_name: plan.plan_name,
          milestones: plan.milestones as any,
          next_review_date: plan.next_review_date || null,
          notes: plan.notes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chronic-care-plans"] });
      toast({ title: "Care plan created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create care plan", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateCarePlanMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, milestones }: { planId: string; milestones: CarePlanMilestone[] }) => {
      const { error } = await supabase
        .from("chronic_care_plans")
        .update({ milestones: milestones as any, updated_at: new Date().toISOString() } as any)
        .eq("id", planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chronic-care-plans"] });
    },
  });
}

export function useUpdateCarePlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId, status }: { planId: string; status: "active" | "completed" | "paused" }) => {
      const { error } = await supabase
        .from("chronic_care_plans")
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq("id", planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chronic-care-plans"] });
      toast({ title: "Care plan status updated" });
    },
  });
}
