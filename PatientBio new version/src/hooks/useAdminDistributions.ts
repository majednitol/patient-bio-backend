import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AdminDistribution {
  id: string;
  admin_id: string;
  recipient_type: string;
  recipient_id: string;
  disease_categories: string[];
  date_range_start: string | null;
  date_range_end: string | null;
  purpose: string;
  record_count: number;
  status: string;
  created_at: string;
}

interface CreateDistributionParams {
  recipient_type: "researcher" | "pharmacy";
  recipient_id: string;
  disease_categories: string[];
  date_range_start?: string;
  date_range_end?: string;
  purpose: string;
}

export function useAdminDistributions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: distributions, isLoading, refetch } = useQuery({
    queryKey: ["admin-distributions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_data_distributions")
        .select("id, admin_id, recipient_type, recipient_id, disease_categories, date_range_start, date_range_end, purpose, record_count, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdminDistribution[];
    },
  });

  const { data: researchers } = useQuery({
    queryKey: ["admin-verified-researchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("researcher_profiles")
        .select("user_id, full_name, institution_name, research_focus, is_verified")
        .eq("is_verified", true);
      if (error) throw error;
      return data;
    },
  });

  const createDistribution = useMutation({
    mutationFn: async (params: CreateDistributionParams) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Count matching health records (aggregated only)
      let query = supabase.from("health_records").select("id", { count: "exact", head: true });
      
      if (params.disease_categories.length > 0) {
        query = query.in("disease_category", params.disease_categories as ("cancer" | "covid19" | "diabetes" | "general" | "heart_disease" | "other")[]);
      }
      if (params.date_range_start) {
        query = query.gte("created_at", params.date_range_start);
      }
      if (params.date_range_end) {
        query = query.lte("created_at", params.date_range_end);
      }

      const { count, error: countError } = await query;
      if (countError) throw countError;

      // Insert distribution record
      const { data, error } = await supabase
        .from("admin_data_distributions")
        .insert({
          admin_id: user.id,
          recipient_type: params.recipient_type,
          recipient_id: params.recipient_id,
          disease_categories: params.disease_categories,
          date_range_start: params.date_range_start || null,
          date_range_end: params.date_range_end || null,
          purpose: params.purpose,
          record_count: count || 0,
          status: "completed",
        })
        .select()
        .single();

      if (error) throw error;

      // Log to admin audit
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "distribute_data",
        target_type: params.recipient_type,
        target_id: params.recipient_id,
        details: {
          disease_categories: params.disease_categories,
          record_count: count || 0,
          purpose: params.purpose,
        },
      });

      return data;
    },
    onSuccess: () => {
      toast({ title: "Distribution completed", description: "Aggregated data has been distributed successfully." });
      queryClient.invalidateQueries({ queryKey: ["admin-distributions"] });
    },
    onError: (error) => {
      toast({ title: "Distribution failed", description: error.message, variant: "destructive" });
    },
  });

  return {
    distributions,
    isLoading,
    refetch,
    researchers: researchers || [],
    createDistribution,
  };
}
