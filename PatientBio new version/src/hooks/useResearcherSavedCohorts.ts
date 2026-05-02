import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface SavedCohort {
  id: string;
  researcher_id: string;
  name: string;
  filters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const useResearcherSavedCohorts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cohorts = [], isLoading } = useQuery({
    queryKey: ["researcher-saved-cohorts", user?.id],
    queryFn: async (): Promise<SavedCohort[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("researcher_saved_cohorts")
        .select("id, researcher_id, name, filters, created_at, updated_at")
        .eq("researcher_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Error fetching saved cohorts:", error);
        return [];
      }
      return (data || []).map((c) => ({
        ...c,
        filters: (c.filters as Record<string, unknown>) || {},
      }));
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.SHORT,
  });

  const saveCohort = useMutation({
    mutationFn: async ({ name, filters }: { name: string; filters: Record<string, unknown> }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("researcher_saved_cohorts")
        .insert({
          researcher_id: user.id,
          name,
          filters: filters as unknown as Json,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cohort Saved", description: "Filter preset saved." });
      queryClient.invalidateQueries({ queryKey: ["researcher-saved-cohorts"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save cohort.", variant: "destructive" });
    },
  });

  const deleteCohort = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("researcher_saved_cohorts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cohort Deleted" });
      queryClient.invalidateQueries({ queryKey: ["researcher-saved-cohorts"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete cohort.", variant: "destructive" });
    },
  });

  return {
    cohorts,
    isLoading,
    saveCohort: saveCohort.mutate,
    deleteCohort: deleteCohort.mutate,
    isSaving: saveCohort.isPending,
  };
};
