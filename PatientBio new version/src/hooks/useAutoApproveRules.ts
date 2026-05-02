import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface AutoApproveRule {
  id: string;
  patient_id: string;
  rule_name: string;
  requester_type: string;
  require_anonymized: boolean;
  require_connected_provider: boolean;
  disease_categories: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAutoApproveRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["auto-approve-rules", user?.id],
    queryFn: async (): Promise<AutoApproveRule[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("data_request_auto_rules")
        .select("id, patient_id, rule_name, requester_type, require_anonymized, require_connected_provider, disease_categories, is_active, created_at, updated_at")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AutoApproveRule[];
    },
    enabled: !!user?.id,
  });

  const createRule = useMutation({
    mutationFn: async (rule: {
      rule_name: string;
      requester_type: string;
      require_anonymized: boolean;
      require_connected_provider: boolean;
      disease_categories?: string[] | null;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("data_request_auto_rules").insert({
        patient_id: user.id,
        ...rule,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Auto-approve rule created" });
      queryClient.invalidateQueries({ queryKey: ["auto-approve-rules", user?.id] });
    },
    onError: () => {
      toast({ title: "Failed to create rule", variant: "destructive" });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("data_request_auto_rules")
        .update({ is_active: isActive })
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-approve-rules", user?.id] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("data_request_auto_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      queryClient.invalidateQueries({ queryKey: ["auto-approve-rules", user?.id] });
    },
  });

  // Check if a request matches any active rule
  const matchesRule = (request: {
    requester_type: string;
    disease_category: string | null;
  }): AutoApproveRule | null => {
    const activeRules = rules.filter((r) => r.is_active);
    for (const rule of activeRules) {
      if (rule.requester_type !== "any" && rule.requester_type !== request.requester_type) continue;
      if (rule.disease_categories && rule.disease_categories.length > 0) {
        if (!request.disease_category || !rule.disease_categories.includes(request.disease_category)) continue;
      }
      return rule;
    }
    return null;
  };

  return {
    rules,
    activeRules: rules.filter((r) => r.is_active),
    isLoading,
    createRule: createRule.mutate,
    toggleRule: toggleRule.mutate,
    deleteRule: deleteRule.mutate,
    matchesRule,
    isCreating: createRule.isPending,
  };
}
