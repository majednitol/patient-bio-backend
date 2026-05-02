import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Cloud,
  Download,
  RefreshCw,
  RotateCcw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileJson,
} from "lucide-react";
import { useCloudBackupList, useRestoreCloudBackup, type ConflictMode, type CloudRestoreResult } from "@/hooks/useCloudBackups";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function CloudBackupRestore() {
  const { t } = useTranslation();
  const { data: backups, isLoading, refetch, isFetching } = useCloudBackupList();
  const restoreMutation = useRestoreCloudBackup();

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("upsert");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<CloudRestoreResult | null>(null);
  const [restoreStep, setRestoreStep] = useState<"idle" | "dry-run" | "restoring" | "done">("idle");

  const handleBrowse = () => {
    refetch();
  };

  const handleDryRun = async (fileKey: string) => {
    setSelectedFile(fileKey);
    setRestoreStep("dry-run");
    setDryRunResult(null);
    try {
      const result = await restoreMutation.mutateAsync({
        fileKey,
        conflictMode,
        dryRun: true,
      });
      setDryRunResult(result);
    } catch {
      setRestoreStep("idle");
    }
  };

  const handleRestore = (fileKey: string) => {
    setSelectedFile(fileKey);
    setConfirmDialogOpen(true);
  };

  const confirmRestore = async () => {
    if (!selectedFile) return;
    setConfirmDialogOpen(false);
    setRestoreStep("restoring");
    try {
      await restoreMutation.mutateAsync({
        fileKey: selectedFile,
        conflictMode,
        dryRun: false,
      });
      setRestoreStep("done");
    } catch {
      setRestoreStep("idle");
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setDryRunResult(null);
    setRestoreStep("idle");
    restoreMutation.reset();
  };

  return (
    <div className="space-y-4">
      {/* Browse Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Cloud className="h-5 w-5 text-primary" />
                {t("cloudRestore.title", "Cloud Backup Restore")}
              </CardTitle>
              <CardDescription>
                {t("cloudRestore.description", "Browse and restore backups stored in Cloudflare R2.")}
              </CardDescription>
            </div>
            <Button
              onClick={handleBrowse}
              disabled={isFetching}
              variant="outline"
              className="gap-1.5"
            >
              {isFetching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              {backups ? t("cloudRestore.refresh", "Refresh") : t("cloudRestore.browse", "Browse Cloud Backups")}
            </Button>
          </div>
        </CardHeader>

        {/* Conflict Mode Selector */}
        <CardContent className="pb-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {t("cloudRestore.conflictMode", "Conflict Mode")}:
            </span>
            {(["upsert", "skip", "replace"] as ConflictMode[]).map((mode) => (
              <Button
                key={mode}
                variant={conflictMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => setConflictMode(mode)}
              >
                {mode === "upsert" && t("cloudRestore.upsert", "Upsert")}
                {mode === "skip" && t("cloudRestore.skip", "Skip Existing")}
                {mode === "replace" && t("cloudRestore.replace", "Replace")}
              </Button>
            ))}
          </div>
        </CardContent>

        {/* Backup List */}
        {isLoading && (
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          </CardContent>
        )}

        {backups && backups.length === 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("cloudRestore.noBackups", "No backup files found in cloud storage.")}
            </p>
          </CardContent>
        )}

        {backups && backups.length > 0 && (
          <CardContent className="pt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cloudRestore.fileName", "File Name")}</TableHead>
                    <TableHead className="w-24">{t("cloudRestore.size", "Size")}</TableHead>
                    <TableHead className="w-40">{t("cloudRestore.date", "Last Modified")}</TableHead>
                    <TableHead className="w-48 text-right">{t("cloudRestore.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.key}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[300px]">{backup.key}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBytes(backup.size)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {backup.lastModified
                          ? format(new Date(backup.lastModified), "MMM dd, yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDryRun(backup.key)}
                            disabled={restoreMutation.isPending}
                            className="gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" /> {t("cloudRestore.preview", "Preview")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(backup.key)}
                            disabled={restoreMutation.isPending}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> {t("cloudRestore.restore", "Restore")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Progress indicator */}
      {restoreStep === "restoring" && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-3">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <p className="font-medium">{t("cloudRestore.restoring", "Restoring data from cloud backup…")}</p>
            </div>
            <Progress value={undefined} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {t("cloudRestore.restoringFile", "File: {{file}}", { file: selectedFile })}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dry Run Result */}
      {dryRunResult && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t("cloudRestore.dryRunResults", "Dry Run Results")}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetState}>
                  {t("cloudRestore.dismiss", "Dismiss")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRestore(selectedFile!)}
                  className="gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("cloudRestore.proceedRestore", "Proceed with Restore")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">{dryRunResult.summary.total_inserted}</p>
                <p className="text-xs text-muted-foreground">{t("cloudRestore.toInsert", "To Insert")}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-amber-600">{dryRunResult.summary.total_updated}</p>
                <p className="text-xs text-muted-foreground">{t("cloudRestore.toUpdate", "To Update")}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{dryRunResult.summary.total_skipped}</p>
                <p className="text-xs text-muted-foreground">{t("cloudRestore.toSkip", "To Skip")}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold text-destructive">{dryRunResult.summary.total_errors}</p>
                <p className="text-xs text-muted-foreground">{t("cloudRestore.errors", "Errors")}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              {dryRunResult.results.map((r) => (
                <div key={r.table} className="flex items-center justify-between py-1.5 px-2 rounded text-sm hover:bg-muted/30">
                  <span className="font-medium">{r.table}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {r.inserted > 0 && <Badge variant="default" className="text-xs">+{r.inserted}</Badge>}
                    {r.updated > 0 && <Badge variant="secondary" className="text-xs">~{r.updated}</Badge>}
                    {r.skipped > 0 && <span>{r.skipped} skip</span>}
                    {r.errors.length > 0 && (
                      <Badge variant="destructive" className="text-xs">{r.errors.length} err</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restore Complete */}
      {restoreStep === "done" && restoreMutation.data && !restoreMutation.data.dry_run && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  {t("cloudRestore.restoreComplete", "Restore completed successfully")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {restoreMutation.data.summary.total_inserted} inserted,{" "}
                  {restoreMutation.data.summary.total_updated} updated,{" "}
                  {restoreMutation.data.summary.total_skipped} skipped
                  {restoreMutation.data.summary.total_errors > 0 &&
                    `, ${restoreMutation.data.summary.total_errors} errors`}
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={resetState}>
                {t("cloudRestore.dismiss", "Dismiss")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {restoreMutation.isError && (
        <Card className="border-destructive/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  {t("cloudRestore.restoreFailed", "Restore failed")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(restoreMutation.error as Error).message}
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto" onClick={resetState}>
                {t("cloudRestore.retry", "Retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t("cloudRestore.confirmTitle", "Confirm Cloud Restore")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {t("cloudRestore.confirmMessage", "This will restore data from the cloud backup into your database.")}
              </p>
              <p className="font-medium">
                {t("cloudRestore.file", "File")}: <code className="text-xs bg-muted px-1 py-0.5 rounded">{selectedFile}</code>
              </p>
              <p className="font-medium">
                {t("cloudRestore.mode", "Mode")}: <Badge variant="secondary">{conflictMode}</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("cloudRestore.snapshotNote", "A pre-import snapshot will be captured for rollback safety.")}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} className="bg-primary">
              <Download className="h-4 w-4 mr-1.5" />
              {t("cloudRestore.confirmRestore", "Restore Now")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
