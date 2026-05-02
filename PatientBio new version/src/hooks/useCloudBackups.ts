import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CloudBackupFile {
  key: string;
  size: number;
  lastModified: string;
}

export interface CloudRestoreResult {
  success: boolean;
  dry_run: boolean;
  file_key: string;
  results: Array<{
    table: string;
    inserted: number;
    updated: number;
    skipped: number;
    errors: string[];
  }>;
  summary: {
    tables_processed: number;
    total_inserted: number;
    total_updated: number;
    total_skipped: number;
    total_errors: number;
  };
}

export type ConflictMode = "upsert" | "skip" | "replace";

export function useCloudBackupList() {
  return useQuery({
    queryKey: ["cloud-backups"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("list-cloud-backups", {
        body: { max_keys: 100 },
      });
      if (error) throw new Error(error.message || "Failed to list cloud backups");
      return (data?.backups ?? []) as CloudBackupFile[];
    },
    enabled: false, // Only fetch on demand
  });
}

export function useRestoreCloudBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileKey,
      conflictMode,
      dryRun = false,
    }: {
      fileKey: string;
      conflictMode: ConflictMode;
      dryRun?: boolean;
    }): Promise<CloudRestoreResult> => {
      const { data, error } = await supabase.functions.invoke("restore-cloud-backup", {
        body: {
          file_key: fileKey,
          conflict_mode: conflictMode,
          dry_run: dryRun,
        },
      });
      if (error) throw new Error(error.message || "Restore failed");
      return data as CloudRestoreResult;
    },
    onSuccess: (data) => {
      if (!data.dry_run) {
        queryClient.invalidateQueries({ queryKey: ["admin-backup-counts"] });
        queryClient.invalidateQueries({ queryKey: ["admin-backup-history"] });
        queryClient.invalidateQueries({ queryKey: ["admin-import-history"] });

        const msg = `${data.summary.total_inserted} inserted, ${data.summary.total_updated} updated, ${data.summary.total_skipped} skipped`;
        if (data.summary.total_errors > 0) {
          toast.error(`Cloud restore completed with errors: ${msg}, ${data.summary.total_errors} errors`);
        } else {
          toast.success(`Cloud restore completed: ${msg}`);
        }
      }
    },
    onError: (err: Error) => {
      toast.error(`Cloud restore failed: ${err.message}`);
    },
  });
}
