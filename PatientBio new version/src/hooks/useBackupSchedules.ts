import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface BackupSchedule {
  id: string;
  name: string;
  tables: string[];
  frequency: string;
  export_format: string;
  is_enabled: boolean;
  retention_days: number;
  created_by: string;
  last_run_at: string | null;
  next_run_at: string | null;
  storage_destination: string;
  cloud_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupRun {
  id: string;
  schedule_id: string | null;
  run_type: string;
  status: string;
  tables_exported: string[] | null;
  row_counts: Record<string, number> | null;
  checksum_sha256: string | null;
  error_message: string | null;
  retry_count: number;
  duration_ms: number | null;
  storage_destination: string | null;
  cloud_file_id: string | null;
  cloud_upload_status: string | null;
  cloud_file_url: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface BackupHealthStats {
  lastSuccessAt: string | null;
  consecutiveSuccesses: number;
  failedCount: number;
  totalRuns: number;
  cloudUploadsOk: number;
  cloudUploadsFailed: number;
  cloudFallbacks: number;
  cloudRetrying: number;
  cloudPendingRetry: number;
}

const FREQUENCY_MS: Record<string, number> = {
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

function computeNextRunAt(frequency: string): string {
  const ms = FREQUENCY_MS[frequency] ?? FREQUENCY_MS["daily"];
  return new Date(Date.now() + ms).toISOString();
}

export function useBackupSchedules() {
  return useQuery({
    queryKey: ["backup-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BackupSchedule[];
    },
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (schedule: {
      name: string;
      tables: string[];
      frequency: string;
      export_format: string;
      retention_days: number;
      storage_destination: string;
      cloud_folder_id?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("backup_schedules")
        .insert({
          ...schedule,
          created_by: user.id,
          next_run_at: computeNextRunAt(schedule.frequency),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-schedules"] });
      toast({ title: "Schedule created", description: "Backup schedule has been created successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create schedule", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BackupSchedule> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.frequency) {
        updateData.next_run_at = computeNextRunAt(updates.frequency);
      }
      const { data, error } = await supabase
        .from("backup_schedules")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-schedules"] });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update schedule", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("backup_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-schedules"] });
      toast({ title: "Schedule deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete schedule", description: err.message, variant: "destructive" });
    },
  });
}

export function useBackupRuns(scheduleId?: string) {
  return useQuery({
    queryKey: ["backup-runs", scheduleId],
    queryFn: async () => {
      let query = supabase
        .from("backup_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (scheduleId) {
        query = query.eq("schedule_id", scheduleId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as BackupRun[];
    },
  });
}

export function useRetryBackupRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const { data, error } = await supabase.functions.invoke("auto-backup-runner", {
        body: { schedule_id: scheduleId, is_retry: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-runs"] });
      queryClient.invalidateQueries({ queryKey: ["backup-schedules"] });
      toast({ title: "Retry initiated", description: "Backup retry has been started." });
    },
    onError: (err: Error) => {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useBackupHealthStats() {
  return useQuery({
    queryKey: ["backup-health-stats"],
    queryFn: async () => {
      const { data: runs, error } = await supabase
        .from("backup_runs")
        .select("status, started_at, completed_at, cloud_upload_status")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const allRuns = (runs ?? []) as Array<{
        status: string;
        started_at: string;
        completed_at: string | null;
        cloud_upload_status: string | null;
      }>;
      const lastSuccess = allRuns.find((r) => r.status === "success");

      let streak = 0;
      for (const run of allRuns) {
        if (run.status === "success") streak++;
        else break;
      }

      const failedCount = allRuns.filter((r) => r.status === "failed").length;
      const cloudUploadsOk = allRuns.filter((r) => r.cloud_upload_status === "uploaded").length;
      const cloudUploadsFailed = allRuns.filter((r) => r.cloud_upload_status === "failed" || r.cloud_upload_status === "permanently_failed").length;
      const cloudFallbacks = allRuns.filter((r) => r.cloud_upload_status === "fallback_local").length;
      const cloudRetrying = allRuns.filter((r) => r.cloud_upload_status === "retrying").length;
      const cloudPendingRetry = allRuns.filter((r) =>
        (r.cloud_upload_status === "failed" || r.cloud_upload_status === "fallback_local")
      ).length;

      return {
        lastSuccessAt: lastSuccess?.completed_at ?? null,
        consecutiveSuccesses: streak,
        failedCount,
        totalRuns: allRuns.length,
        cloudUploadsOk,
        cloudUploadsFailed,
        cloudFallbacks,
        cloudRetrying,
        cloudPendingRetry,
      } as BackupHealthStats;
    },
  });
}

export function useRetryFailedCloudUploads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (runId?: string) => {
      const { data, error } = await supabase.functions.invoke("retry-failed-cloud-uploads", {
        body: runId ? { run_id: runId } : {},
      });
      if (error) throw error;
      return data as { retried: number; succeeded: number; failed: number; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["backup-runs"] });
      queryClient.invalidateQueries({ queryKey: ["backup-health-stats"] });
      toast({
        title: "Cloud sync retry complete",
        description: data.message,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Cloud sync retry failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
