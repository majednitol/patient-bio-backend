import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, RefreshCw, RotateCcw, Loader2, Cloud, HardDrive, ExternalLink, CloudOff } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useBackupRuns, useRetryBackupRun, type BackupRun } from "@/hooks/useBackupSchedules";

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  success: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", label: "Success" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  running: { icon: Loader2, color: "text-blue-600 dark:text-blue-400", label: "Running" },
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
};

const CLOUD_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  uploaded: { icon: Cloud, color: "text-green-600 dark:text-green-400", label: "Uploaded to R2" },
  failed: { icon: CloudOff, color: "text-destructive", label: "Upload Failed" },
  fallback_local: { icon: HardDrive, color: "text-amber-500", label: "Saved Locally (R2 Failed)" },
  pending: { icon: Clock, color: "text-amber-500", label: "Uploading…" },
  skipped: { icon: HardDrive, color: "text-muted-foreground", label: "Local Only" },
};

interface BackupRunTimelineProps {
  scheduleId?: string;
}

export function BackupRunTimeline({ scheduleId }: BackupRunTimelineProps) {
  const { data: runs, isLoading } = useBackupRuns(scheduleId);
  const retryMutation = useRetryBackupRun();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading backup history…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No backup runs recorded yet. Runs will appear here once a scheduled or manual backup executes.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const config = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.pending;
        const StatusIcon = config.icon;
        const cloudStatus = CLOUD_STATUS_CONFIG[run.cloud_upload_status ?? "skipped"] ?? CLOUD_STATUS_CONFIG.skipped;
        const CloudIcon = cloudStatus.icon;
        const totalRows = run.row_counts
          ? Object.values(run.row_counts).reduce((a: number, b: unknown) => a + (b as number), 0)
          : 0;

        return (
          <Card key={run.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color} ${run.status === "running" ? "animate-spin" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                      <Badge variant="outline" className="text-xs">{run.run_type}</Badge>
                      {run.retry_count > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Retry #{run.retry_count}
                        </Badge>
                      )}
                      {/* Cloud upload status badge */}
                      <Badge variant="outline" className={`text-xs gap-1 ${cloudStatus.color}`}>
                        <CloudIcon className="h-3 w-3" />
                        {cloudStatus.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                      {" · "}
                      {format(new Date(run.started_at), "MMM d, HH:mm:ss")}
                    </p>
                    {run.status === "success" && (
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{run.tables_exported?.length ?? 0} tables</span>
                        <span>{totalRows.toLocaleString()} rows</span>
                        {run.duration_ms && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                      </div>
                    )}
                    {run.error_message && (
                      <p className="text-xs text-destructive mt-1 line-clamp-2">{run.error_message}</p>
                    )}
                    {run.checksum_sha256 && (
                      <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                        SHA-256: {run.checksum_sha256.slice(0, 16)}…
                      </p>
                    )}
                    {/* Google Drive link */}
                    {run.cloud_file_url && (
                      <a
                        href={run.cloud_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View in Cloud Storage
                      </a>
                    )}
                  </div>
                </div>
                {run.status === "failed" && run.schedule_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retryMutation.mutate(run.schedule_id!)}
                    disabled={retryMutation.isPending}
                    className="gap-1 text-xs flex-shrink-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
