import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface SavedChart {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  createdAt: string;
}

export function useResearcherSavedCharts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: charts = [], isLoading } = useQuery({
    queryKey: ["researcher-saved-charts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("researcher_saved_charts")
        .select("*")
        .eq("researcher_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.chart_type,
        config: c.config as Record<string, any>,
        createdAt: c.created_at,
      })) as SavedChart[];
    },
    enabled: !!user?.id,
  });

  const saveChart = useMutation({
    mutationFn: async (chart: { name: string; type: string; config: Record<string, any> }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("researcher_saved_charts").insert({
        researcher_id: user.id,
        name: chart.name,
        chart_type: chart.type,
        config: chart.config,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researcher-saved-charts"] });
      toast({ title: "Chart saved", description: "Chart has been saved to your gallery." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save chart.", variant: "destructive" });
    },
  });

  const deleteChart = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("researcher_saved_charts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researcher-saved-charts"] });
      toast({ title: "Chart deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete chart.", variant: "destructive" });
    },
  });

  return { charts, isLoading, saveChart, deleteChart };
}
