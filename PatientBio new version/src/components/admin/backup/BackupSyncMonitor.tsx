import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Clock, TrendingUp, Database, Cloud, CloudOff, RefreshCw, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useBackupHealthStats, useBackupRuns, useBackupSchedules, useRetryFailedCloudUploads } from "@/hooks/useBackupSchedules";
import { useTableCounts } from "@/hooks/useAdminBackup";

export function BackupSyncMonitor() {
  const { data: health, isLoading: healthLoading } = useBackupHealthStats();
  const { data: runs } = useBackupRuns();
  const { data: schedules } = useBackupSchedules();
  const { data: currentCounts } = useTableCounts();
  const retryMutation = useRetryFailedCloudUploads();

  const lastSuccessAge = health?.lastSuccessAt
    ? formatDistanceToNow(new Date(health.lastSuccessAt), { addSuffix: true })
    : "Never";

  const getOverallStatus = () => {
    if (!health || health.totalRuns === 0) return { status: "unknown", label: "No Data", color: "text-muted-foreground" };
    if (health.failedCount === 0 && health.consecutiveSuccesses > 0)
      return { status: "healthy", label: "Healthy", color: "text-green-600 dark:text-green-400" };
    if (health.failedCount > 0 && health.consecutiveSuccesses > 0)
      return { status: "warning", label: "Warning", color: "text-amber-600 dark:text-amber-400" };
    return { status: "error", label: "Critical", color: "text-destructive" };
  };

  const overall = getOverallStatus();

  const cloudSchedules = schedules?.filter(
    (s) => s.is_enabled && (s.storage_destination === "cloudflare_r2" || s.storage_destination === "both")
  ).length ?? 0;

  // Data drift detection
  const lastSuccessRun = runs?.find((r) => r.status === "success");
  const driftEntries: Array<{ table: string; last: number; current: number; diff: number }> = [];
  if (lastSuccessRun?.row_counts && currentCounts) {
    for (const [table, lastCount] of Object.entries(lastSuccessRun.row_counts)) {
      const curr = currentCounts[table] ?? 0;
      const last = lastCount as number;
      if (curr !== last) {
        driftEntries.push({ table, last, current: curr, diff: curr - last });
      }
    }
  }

  const failedAlerts = runs?.filter((r) => r.status === "failed").slice(0, 5) ?? [];

  // Cloud upload failures (backup succeeded but cloud failed)
  const cloudFailedRuns = runs?.filter(
    (r) => r.status === "success" && (r.cloud_upload_status === "failed" || r.cloud_upload_status === "fallback_local")
  ).slice(0, 5) ?? [];

  const cloudRetryingRuns = runs?.filter(
    (r) => r.cloud_upload_status === "retrying"
  ) ?? [];

  const cloudPermanentlyFailed = runs?.filter(
    (r) => r.cloud_upload_status === "permanently_failed"
  ).slice(0, 3) ?? [];

  return (
    <div className="space-y-4">
      {/* Overall Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className={`h-8 w-8 ${overall.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">System Status</p>
              <p className={`text-lg font-bold ${overall.color}`}>{overall.label}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Last Backup</p>
              <p className="text-sm font-semibold">{healthLoading ? "Loading…" : lastSuccessAge}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">Success Streak</p>
              <p className="text-lg font-bold">{health?.consecutiveSuccesses ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Cloud className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Cloud Uploads</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-green-600">{health?.cloudUploadsOk ?? 0}</span>
                {(health?.cloudUploadsFailed ?? 0) > 0 && (
                  <Badge variant="destructive" className="text-xs">{health?.cloudUploadsFailed} failed</Badge>
                )}
                {(health?.cloudRetrying ?? 0) > 0 && (
                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                    {health?.cloudRetrying} retrying
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cloud Schedules Info */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span>{schedules?.filter((s) => s.is_enabled).length ?? 0} active schedules</span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1">
              <Cloud className="h-3.5 w-3.5" />
              {cloudSchedules} with cloud storage
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Retry Cloud Sync Card */}
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Auto-Retry Cloud Sync
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => retryMutation.mutate(undefined)}
              disabled={retryMutation.isPending || cloudFailedRuns.length === 0}
            >
              {retryMutation.isPending ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Retrying…</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry All Now</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <CloudOff className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending Retry</p>
                <p className="text-sm font-semibold">{cloudFailedRuns.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Loader2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Currently Retrying</p>
                <p className="text-sm font-semibold">{cloudRetryingRuns.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <XCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Permanently Failed</p>
                <p className="text-sm font-semibold">{cloudPermanentlyFailed.length}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Failed cloud uploads are automatically retried every 30 minutes (up to 5 attempts). Data is always safe in local storage.
          </p>

          {/* Individual retry buttons for failed runs */}
          {cloudFailedRuns.length > 0 && (
            <div className="mt-3 space-y-2">
              {cloudFailedRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                      {" — "}
                      <Badge variant="outline" className="text-xs">
                        Attempt {run.retry_count}/5
                      </Badge>
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-7 text-xs"
                    onClick={() => retryMutation.mutate(run.id)}
                    disabled={retryMutation.isPending}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Retry
                  </Button>
                </div>
              ))}
            </div>
          )}

          {cloudFailedRuns.length === 0 && cloudRetryingRuns.length === 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              All cloud uploads are synced successfully.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permanently Failed Uploads */}
      {cloudPermanentlyFailed.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Permanently Failed Cloud Uploads ({cloudPermanentlyFailed.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cloudPermanentlyFailed.map((run) => (
              <div key={run.id} className="text-sm border rounded-lg p-2">
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                  {" — Exhausted all 5 retry attempts. Data is safe locally."}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Data Drift Detection */}
      {driftEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Data Drift Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {driftEntries.map((entry) => (
                <div key={entry.table} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{entry.table}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{entry.last} → {entry.current}</span>
                    <Badge variant={entry.diff > 0 ? "default" : "destructive"} className="text-xs">
                      {entry.diff > 0 ? "+" : ""}{entry.diff}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {driftEntries.length === 0 && lastSuccessRun && (
        <Card>
          <CardContent className="p-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            No data drift detected since last backup.
          </CardContent>
        </Card>
      )}

      {/* Failed Backup Alerts */}
      {failedAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Recent Failed Backups ({failedAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {failedAlerts.map((run) => (
              <div key={run.id} className="flex items-center justify-between text-sm border rounded-lg p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                  </p>
                  <p className="text-xs text-destructive line-clamp-1">{run.error_message}</p>
                </div>
                {run.schedule_id && (
                  <Badge variant="outline" className="text-xs ml-2">
                    Retry #{run.retry_count}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
