import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface SavedDataset {
  id: string;
  researcher_id: string;
  name: string;
  description: string | null;
  filter_config: Record<string, string | undefined>;
  record_count: number;
  created_at: string;
  updated_at: string;
}

export const useSavedDatasets = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['researcher-saved-datasets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('researcher_saved_datasets')
        .select('id, researcher_id, name, description, filter_config, record_count, created_at, updated_at')
        .eq('researcher_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as SavedDataset[];
    },
    enabled: !!user?.id,
  });

  const saveDataset = useMutation({
    mutationFn: async ({ name, description, filterConfig, recordCount }: {
      name: string;
      description?: string;
      filterConfig: Record<string, string | undefined>;
      recordCount: number;
    }) => {
      const { error } = await supabase
        .from('researcher_saved_datasets')
        .insert([{
          researcher_id: user!.id,
          name,
          description: description || null,
          filter_config: filterConfig as any,
          record_count: recordCount,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researcher-saved-datasets'] });
      toast({ title: "Dataset saved", description: "Filter preset saved for quick access." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteDataset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('researcher_saved_datasets')
        .delete()
        .eq('id', id)
        .eq('researcher_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researcher-saved-datasets'] });
      toast({ title: "Dataset deleted" });
    },
  });

  return { datasets, isLoading, saveDataset, deleteDataset };
};
