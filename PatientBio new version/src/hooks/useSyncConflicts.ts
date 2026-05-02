import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface SyncConflict {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string | null;
  local_data: Record<string, unknown>;
  remote_data: Record<string, unknown>;
  source_system: string | null;
  conflict_fields: string[];
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export function useSyncConflicts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const conflictsQuery = useQuery({
    queryKey: ["sync-conflicts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_conflicts")
        .select("id, user_id, resource_type, resource_id, local_data, remote_data, source_system, conflict_fields, resolution, resolved_at, resolved_by, created_at")
        .eq("user_id", user!.id)
        .is("resolution", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SyncConflict[];
    },
  });

  const resolveConflict = useMutation({
    mutationFn: async ({ conflictId, resolution }: { conflictId: string; resolution: "keep_local" | "keep_remote" | "manual_merge" }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("sync_conflicts")
        .update({
          resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", conflictId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-conflicts", user?.id] });
      toast({ title: "Conflict resolved" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return {
    conflicts: conflictsQuery.data || [],
    isLoading: conflictsQuery.isLoading,
    unresolvedCount: (conflictsQuery.data || []).length,
    resolveConflict: resolveConflict.mutate,
    isResolving: resolveConflict.isPending,
  };
}
