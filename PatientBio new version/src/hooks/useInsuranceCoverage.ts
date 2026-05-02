import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface InsurancePlan {
  id: string;
  plan_name: string;
  provider_name: string;
  coverage_type: string;
  coverage_percentage: number;
  max_annual_limit: number | null;
  covers_consultation: boolean;
  covers_medication: boolean;
  covers_lab_tests: boolean;
  covers_hospitalization: boolean;
}

export function useInsuranceCoverage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["insurance-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_plans")
        .select("*")
        .order("plan_name");
      if (error) throw error;
      return data as InsurancePlan[];
    },
  });

  const selectedPlanQuery = useQuery({
    queryKey: ["user-insurance-plan", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("insurance_plan_id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      if (!data?.insurance_plan_id) return null;

      const { data: plan, error: planError } = await supabase
        .from("insurance_plans")
        .select("*")
        .eq("id", data.insurance_plan_id)
        .single();
      if (planError) throw planError;
      return plan as InsurancePlan;
    },
  });

  const selectPlan = useMutation({
    mutationFn: async (planId: string | null) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_profiles")
        .update({ insurance_plan_id: planId })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-insurance-plan", user?.id] });
      toast({ title: "Insurance plan updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const estimateCoverage = (totalCost: number, category: string): { covered: number; outOfPocket: number } => {
    const plan = selectedPlanQuery.data;
    if (!plan) return { covered: 0, outOfPocket: totalCost };

    let isCovered = true;
    if (category === "consultation") isCovered = plan.covers_consultation;
    else if (category === "medication") isCovered = plan.covers_medication;
    else if (category === "lab_test") isCovered = plan.covers_lab_tests;
    else if (category === "hospitalization") isCovered = plan.covers_hospitalization;

    if (!isCovered) return { covered: 0, outOfPocket: totalCost };

    const covered = Math.round((totalCost * plan.coverage_percentage) / 100);
    return { covered, outOfPocket: totalCost - covered };
  };

  return {
    plans: plansQuery.data || [],
    isLoadingPlans: plansQuery.isLoading,
    selectedPlan: selectedPlanQuery.data || null,
    isLoadingSelected: selectedPlanQuery.isLoading,
    selectPlan: selectPlan.mutate,
    isSelecting: selectPlan.isPending,
    estimateCoverage,
  };
}
