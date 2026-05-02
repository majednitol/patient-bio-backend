import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HardDrive, Download, CheckSquare, Square, Clock, Database, FileJson, FileSpreadsheet, ShieldAlert, RefreshCw, Copy, RotateCcw, CheckCircle2, Upload, FileUp, AlertTriangle, XCircle, ArrowUpCircle, Eye, ChevronDown, ChevronRight, History, CalendarClock, Activity, Plus, Cloud } from "lucide-react";
import {
  useTableCounts,
  useBackupExport,
  useBackupHistory,
  useImportHistory,
  EXPORTABLE_TABLES,
  PII_TABLES,
  estimateExportSize,
  formatBytes,
  type ExportResult,
} from "@/hooks/useAdminBackup";
import {
  useValidateBackup,
  useImportBackup,
  useDryRunImport,
  type ValidationResult,
  type ImportResult,
  type ConflictMode,
} from "@/hooks/useAdminImport";
import { SearchInput } from "@/components/admin/SearchInput";
import { DateRangeFilter, useDateRangeFilter } from "@/components/admin/DateRangeFilter";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";
import { useBackupSchedules } from "@/hooks/useBackupSchedules";
import { BackupScheduleCard } from "@/components/admin/backup/BackupScheduleCard";
import { BackupScheduleForm } from "@/components/admin/backup/BackupScheduleForm";
import { BackupRunTimeline } from "@/components/admin/backup/BackupRunTimeline";
import { BackupSyncMonitor } from "@/components/admin/backup/BackupSyncMonitor";
import { CloudBackupRestore } from "@/components/admin/backup/CloudBackupRestore";
import type { BackupSchedule } from "@/hooks/useBackupSchedules";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const TABLE_LABELS: Record<string, string> = {
  user_profiles: "User Profiles",
  user_roles: "User Roles",
  health_records: "Health Records",
  access_tokens: "Access Tokens",
  access_logs: "Access Logs",
  prescriptions: "Prescriptions",
  appointments: "Appointments",
  doctor_profiles: "Doctor Profiles",
  pathologist_profiles: "Pathologist Profiles",
  researcher_profiles: "Researcher Profiles",
  hospitals: "Hospitals",
  hospital_staff: "Hospital Staff",
  audit_trail: "Audit Trail",
  blockchain_transactions: "Blockchain Transactions",
  consent_records: "Consent Records",
  data_access_requests: "Data Access Requests",
  doctor_patient_access: "Doctor-Patient Access",
  pathologist_reports: "Pathologist Reports",
  patient_wallets: "Patient Wallets",
};

export default function AdminBackupPage() {
  const { t } = useTranslation();
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [tableSearch, setTableSearch] = useState("");
  const [useDateFilter, setUseDateFilter] = useState(false);
  const { dateRange, setDateRange } = useDateRangeFilter("30d");
  const [lastExportResult, setLastExportResult] = useState<ExportResult | null>(null);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPayload, setImportPayload] = useState<Record<string, unknown> | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [conflictMode, setConflictMode] = useState<ConflictMode>("upsert");
  const [importSelectedTables, setImportSelectedTables] = useState<Set<string>>(new Set());
  const [dryRunResult, setDryRunResult] = useState<ImportResult | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: counts, isLoading: countsLoading } = useTableCounts();
  const exportMutation = useBackupExport();
  const { mutate: exportBackup, isPending: exporting, error: exportError, reset: resetMutation } = exportMutation;
  const { data: history, isLoading: historyLoading } = useBackupHistory();
  const { data: importHistory, isLoading: importHistoryLoading } = useImportHistory();
  const validateMutation = useValidateBackup();
  const importMutation = useImportBackup();
  const dryRunMutation = useDryRunImport();

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return [...EXPORTABLE_TABLES];
    const q = tableSearch.toLowerCase();
    return EXPORTABLE_TABLES.filter(
      (t) =>
        t.toLowerCase().includes(q) ||
        (TABLE_LABELS[t] ?? "").toLowerCase().includes(q)
    );
  }, [tableSearch]);

  const allSelected = selectedTables.size === EXPORTABLE_TABLES.length;
  const selectedArray = Array.from(selectedTables);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(EXPORTABLE_TABLES));
    }
  };

  const toggleTable = (table: string) => {
    const next = new Set(selectedTables);
    if (next.has(table)) next.delete(table);
    else next.add(table);
    setSelectedTables(next);
  };

  const handleExport = () => {
    resetMutation();
    setLastExportResult(null);
    exportBackup(
      {
        tables: selectedArray,
        exportFormat,
        dateFrom: useDateFilter ? dateRange.from.toISOString() : undefined,
        dateTo: useDateFilter ? dateRange.to.toISOString() : undefined,
      },
      {
        onSuccess: (result) => {
          setLastExportResult(result);
        },
      }
    );
  };

  const handleReExport = (tables: string[], fmt: string) => {
    setSelectedTables(new Set(tables));
    setExportFormat(fmt === "csv" ? "csv" : "json");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileSizeWarning(null);
    setDryRunResult(null);

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      setImportFile(null);
      setImportPayload(null);
      setValidationResult({
        valid: false,
        error: t("adminImport.fileTooLarge", "File exceeds 50MB limit ({{size}}). Please use a smaller backup file.", { size: formatBytes(file.size) }),
        validTables: [],
        invalidTables: [],
        tableSummary: {},
        totalRows: 0,
        checksumValid: null,
        metadata: null,
      });
      return;
    }

    if (file.size > WARN_FILE_SIZE) {
      setFileSizeWarning(t("adminImport.fileSizeWarning", "Large file ({{size}}). Parsing may take a moment.", { size: formatBytes(file.size) }));
    }

    setImportFile(file);
    setValidationResult(null);
    importMutation.reset();

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setImportPayload(parsed);

      const result = await validateMutation.mutateAsync(parsed);
      setValidationResult(result);
      // Select all valid tables by default
      setImportSelectedTables(new Set(result.validTables));
    } catch {
      setImportPayload(null);
      setValidationResult({
        valid: false,
        error: t("adminImport.invalidFile", "Invalid JSON file. Please upload a valid backup file."),
        validTables: [],
        invalidTables: [],
        tableSummary: {},
        totalRows: 0,
        checksumValid: null,
        metadata: null,
      });
    }
  };

  const getFilteredPayload = (): Record<string, unknown> | null => {
    if (!importPayload) return null;
    const tables = (importPayload as { tables?: Record<string, unknown> }).tables;
    if (!tables) return importPayload;

    const filtered: Record<string, unknown> = {};
    for (const table of importSelectedTables) {
      if (tables[table]) filtered[table] = tables[table];
    }
    return { ...importPayload, tables: filtered };
  };

  const handleDryRun = () => {
    const filtered = getFilteredPayload();
    if (!filtered) return;
    setDryRunResult(null);
    dryRunMutation.mutate(
      { payload: filtered, conflictMode },
      { onSuccess: (result) => setDryRunResult(result) }
    );
  };

  const handleImport = () => {
    const filtered = getFilteredPayload();
    if (!filtered) return;
    importMutation.mutate({ payload: filtered, conflictMode });
  };

  const resetImport = () => {
    setImportFile(null);
    setImportPayload(null);
    setValidationResult(null);
    setDryRunResult(null);
    setFileSizeWarning(null);
    setImportSelectedTables(new Set());
    importMutation.reset();
    dryRunMutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleImportTable = (table: string) => {
    const next = new Set(importSelectedTables);
    if (next.has(table)) next.delete(table);
    else next.add(table);
    setImportSelectedTables(next);
  };

  const toggleAllImportTables = () => {
    if (!validationResult) return;
    if (importSelectedTables.size === validationResult.validTables.length) {
      setImportSelectedTables(new Set());
    } else {
      setImportSelectedTables(new Set(validationResult.validTables));
    }
  };

  const toggleExpandedTable = (table: string) => {
    const next = new Set(expandedTables);
    if (next.has(table)) next.delete(table);
    else next.add(table);
    setExpandedTables(next);
  };

  const importSelectedRows = validationResult
    ? Array.from(importSelectedTables).reduce((sum, t) => sum + (validationResult.tableSummary[t] ?? 0), 0)
    : 0;

  const totalRows = counts
    ? selectedArray.reduce((sum, t) => sum + (counts[t] ?? 0), 0)
    : 0;

  const estimatedSize = counts ? estimateExportSize(selectedArray, counts, exportFormat) : 0;
  const hasPII = selectedArray.some((t) => PII_TABLES.has(t));

  // Scheduled backup state
  const [activeTab, setActiveTab] = useState("manual");
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(null);
  const { data: schedules, isLoading: schedulesLoading } = useBackupSchedules();

  const handleEditSchedule = (schedule: BackupSchedule) => {
    setEditingSchedule(schedule);
    setScheduleFormOpen(true);
  };

  const handleCloseScheduleForm = () => {
    setScheduleFormOpen(false);
    setEditingSchedule(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
          <HardDrive className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("adminBackup.title", "System Data Backup")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("adminBackup.description", "Export comprehensive system data snapshots for compliance and disaster recovery.")}
          </p>
        </div>
      </div>

      {/* Top-level tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="manual" className="gap-1.5">
            <HardDrive className="h-4 w-4" /> Manual Backup
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5">
            <CalendarClock className="h-4 w-4" /> Scheduled
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-1.5">
            <History className="h-4 w-4" /> Backup Runs
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-1.5">
            <Activity className="h-4 w-4" /> Sync Monitor
          </TabsTrigger>
          <TabsTrigger value="cloud-restore" className="gap-1.5">
            <Cloud className="h-4 w-4" /> Cloud Restore
          </TabsTrigger>
        </TabsList>

        {/* === MANUAL BACKUP TAB === */}
        <TabsContent value="manual" className="space-y-6">

      {/* Export Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">{t("adminBackup.selectTables", "Select Tables")}</CardTitle>
              <CardDescription>
                {t("adminBackup.selectionSummary", "{{selected}} of {{total}} tables selected", {
                  selected: selectedTables.size,
                  total: EXPORTABLE_TABLES.length,
                })}
                {totalRows > 0 && ` · ${totalRows.toLocaleString()} ${t("adminBackup.totalRows", "total rows")}`}
                {estimatedSize > 0 && ` · ~${formatBytes(estimatedSize)}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {allSelected ? (
                  <><Square className="h-4 w-4 mr-1.5" /> {t("adminBackup.deselectAll", "Deselect All")}</>
                ) : (
                  <><CheckSquare className="h-4 w-4 mr-1.5" /> {t("adminBackup.selectAll", "Select All")}</>
                )}
              </Button>
              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={exportFormat === "json" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setExportFormat("json")}
                >
                  <FileJson className="h-4 w-4 mr-1" /> JSON
                </Button>
                <Button
                  variant={exportFormat === "csv" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setExportFormat("csv")}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Table search & date filter */}
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <SearchInput
              value={tableSearch}
              onChange={setTableSearch}
              placeholder={t("adminBackup.searchTables", "Search tables…")}
              className="w-64"
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="date-filter-toggle"
                checked={useDateFilter}
                onCheckedChange={(v) => setUseDateFilter(!!v)}
              />
              <label htmlFor="date-filter-toggle" className="text-sm text-muted-foreground cursor-pointer">
                {t("adminBackup.filterByDate", "Filter by date range")}
              </label>
            </div>
            {useDateFilter && (
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {countsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTables.map((table) => {
                const checked = selectedTables.has(table);
                const count = counts?.[table] ?? 0;
                const isPII = PII_TABLES.has(table);
                return (
                  <label
                    key={table}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleTable(table)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">
                          {TABLE_LABELS[table] ?? table}
                        </p>
                        {isPII && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                            <ShieldAlert className="h-2.5 w-2.5 mr-0.5" />
                            PII
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {count.toLocaleString()} {t("adminBackup.rows", "rows")}
                      </p>
                    </div>
                    <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </label>
                );
              })}
              {filteredTables.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground text-center py-4">
                  {t("adminBackup.noTablesMatch", "No tables match your search.")}
                </p>
              )}
            </div>
          )}

          {exporting && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("adminBackup.preparingBackup", "Preparing backup: {{count}} tables, ~{{size}} estimated", {
                  count: selectedArray.length,
                  size: formatBytes(estimatedSize),
                })}
              </p>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          {exportError && !exporting && (
            <div className="mt-4 p-3 rounded-lg border border-destructive/50 bg-destructive/5 flex items-center justify-between gap-3">
              <p className="text-sm text-destructive">
                {t("adminBackup.exportFailed", "Export failed")}: {(exportError as Error).message}
              </p>
              <Button variant="outline" size="sm" onClick={handleExport} className="flex-shrink-0 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {t("adminBackup.retry", "Retry")}
              </Button>
            </div>
          )}

          {lastExportResult && !exporting && !exportError && (
            <div className="mt-4 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 space-y-2">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-medium">{t("adminBackup.exportComplete", "Export Complete")}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{lastExportResult.metadata.tables_exported.length}</p>
                  <p>{t("adminBackup.tablesExported", "Tables exported")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{lastExportResult.metadata.total_rows.toLocaleString()}</p>
                  <p>{t("adminBackup.totalRows", "total rows")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{lastExportResult.metadata.format.toUpperCase()}</p>
                  <p>{t("adminBackup.formatLabel", "Format")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{format(new Date(lastExportResult.metadata.exported_at), "HH:mm:ss")}</p>
                  <p>{t("adminBackup.exportedAt", "Exported at")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground font-mono truncate flex-1">
                  SHA-256: {lastExportResult.metadata.checksum_sha256}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(lastExportResult.metadata.checksum_sha256);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            {hasPII && selectedTables.size > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                {t("adminBackup.piiWarning", "Selection includes tables with personally identifiable information.")}
              </p>
            )}
            <div className="ml-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={selectedTables.size === 0 || exporting}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {exporting ? t("adminBackup.exporting", "Exporting…") : t("adminBackup.generateBackup", "Generate Backup")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("adminBackup.confirmTitle", "Confirm Backup Export")}</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <span className="block">
                        {t("adminBackup.confirmDescription", "You are about to export {{count}} tables containing {{rows}} rows (~{{size}}).", {
                          count: selectedTables.size,
                          rows: totalRows.toLocaleString(),
                          size: formatBytes(estimatedSize),
                        })}
                      </span>
                      {useDateFilter && (
                        <span className="block text-muted-foreground">
                          {t("adminBackup.confirmDateRange", "Date filter: {{from}} – {{to}}", {
                            from: format(dateRange.from, "MMM d, yyyy"),
                            to: format(dateRange.to, "MMM d, yyyy"),
                          })}
                        </span>
                      )}
                      {hasPII && (
                        <span className="block text-amber-600 dark:text-amber-400 font-medium">
                          ⚠ {t("adminBackup.confirmPII", "This export includes tables with PII. Handle the downloaded file securely.")}
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleExport}>
                      <Download className="h-4 w-4 mr-1.5" />
                      {t("adminBackup.confirmExport", "Export Now")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Data Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
            {t("adminImport.title", "System Data Import")}
          </CardTitle>
          <CardDescription>
            {t("adminImport.description", "Restore system data from a previously exported JSON backup file.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File upload */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
              id="import-file-input"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={validateMutation.isPending || importMutation.isPending}
              className="gap-2"
            >
              <FileUp className="h-4 w-4" />
              {t("adminImport.selectFile", "Select Backup File")}
            </Button>
            {importFile && (
              <span className="text-sm text-muted-foreground truncate max-w-xs">
                {importFile.name} ({formatBytes(importFile.size)})
              </span>
            )}
            {importFile && (
              <Button variant="ghost" size="sm" onClick={resetImport} className="text-xs">
                {t("adminImport.clear", "Clear")}
              </Button>
            )}
          </div>

          {/* File size warning */}
          {fileSizeWarning && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {fileSizeWarning}
            </div>
          )}

          {/* Validating spinner */}
          {validateMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t("adminImport.validating", "Validating backup file…")}
            </div>
          )}

          {/* Validation error */}
          {validationResult && !validationResult.valid && (
            <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/5 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">
                {validationResult.error || t("adminImport.invalidFile", "No valid tables found in the backup file.")}
              </p>
            </div>
          )}

          {/* Validation success — preview */}
          {validationResult && validationResult.valid && !importMutation.isSuccess && (
            <div className="space-y-4">
              {/* Metadata */}
              {validationResult.metadata && (
                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <p className="text-xs font-medium text-foreground">{t("adminImport.backupMetadata", "Backup Metadata")}</p>
                  {(validationResult.metadata as Record<string, unknown>).exported_at && (
                    <p className="text-xs text-muted-foreground">
                      {t("adminImport.exportedOn", "Exported on")}: {format(new Date((validationResult.metadata as Record<string, unknown>).exported_at as string), "MMM d, yyyy HH:mm")}
                    </p>
                  )}
                  {(validationResult.metadata as Record<string, unknown>).admin_email && (
                    <p className="text-xs text-muted-foreground">
                      {t("adminImport.exportedBy", "By")}: {(validationResult.metadata as Record<string, unknown>).admin_email as string}
                    </p>
                  )}
                  {validationResult.checksumValid !== null && (
                    <p className={`text-xs flex items-center gap-1 ${validationResult.checksumValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {validationResult.checksumValid ? (
                        <><CheckCircle2 className="h-3 w-3" /> {t("adminImport.checksumValid", "Checksum verified")}</>
                      ) : (
                        <><AlertTriangle className="h-3 w-3" /> {t("adminImport.checksumInvalid", "Checksum mismatch — file may have been modified")}</>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Selective table import */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">
                    {t("adminImport.selectiveTables", "Select tables to import ({{selected}} of {{total}})", {
                      selected: importSelectedTables.size,
                      total: validationResult.validTables.length,
                    })}
                    {importSelectedRows > 0 && ` · ${importSelectedRows.toLocaleString()} ${t("adminBackup.rows", "rows")}`}
                  </p>
                  <Button variant="outline" size="sm" onClick={toggleAllImportTables}>
                    {importSelectedTables.size === validationResult.validTables.length ? (
                      <><Square className="h-3.5 w-3.5 mr-1" /> {t("adminBackup.deselectAll", "Deselect All")}</>
                    ) : (
                      <><CheckSquare className="h-3.5 w-3.5 mr-1" /> {t("adminBackup.selectAll", "Select All")}</>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {validationResult.validTables.map((table) => {
                    const rowCount = validationResult.tableSummary[table] ?? 0;
                    const isPII = PII_TABLES.has(table);
                    const isChecked = importSelectedTables.has(table);
                    return (
                      <label
                        key={table}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                          isChecked ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleImportTable(table)}
                        />
                        <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1">{TABLE_LABELS[table] ?? table}</span>
                        {isPII && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                            PII
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex-shrink-0">{rowCount.toLocaleString()}</span>
                      </label>
                    );
                  })}
                </div>
                {validationResult.invalidTables.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t("adminImport.skippedTables", "{{count}} unrecognized tables will be skipped: {{tables}}", {
                      count: validationResult.invalidTables.length,
                      tables: validationResult.invalidTables.join(", "),
                    })}
                  </p>
                )}
              </div>

              {/* Conflict mode */}
              <div>
                <p className="text-sm font-medium mb-2">{t("adminImport.conflictResolution", "Conflict Resolution")}</p>
                <div className="flex flex-wrap gap-2">
                  {(["upsert", "skip", "replace"] as ConflictMode[]).map((mode) => (
                    <Button
                      key={mode}
                      variant={conflictMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setConflictMode(mode)}
                    >
                      {mode === "upsert" && t("adminImport.modeUpsert", "Merge (Upsert)")}
                      {mode === "skip" && t("adminImport.modeSkip", "Skip Existing")}
                      {mode === "replace" && t("adminImport.modeReplace", "Replace Existing")}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {conflictMode === "upsert" && t("adminImport.upsertDesc", "Updates existing records and inserts new ones.")}
                  {conflictMode === "skip" && t("adminImport.skipDesc", "Only inserts new records; skips any that already exist.")}
                  {conflictMode === "replace" && t("adminImport.replaceDesc", "Deletes existing records by ID and re-inserts them.")}
                </p>
              </div>

              {/* Dry-run result */}
              {dryRunResult && (
                <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Eye className="h-4 w-4" />
                    <p className="text-sm font-medium">{t("adminImport.dryRunResults", "Preview Results (no changes made)")}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">{dryRunResult.summary.tables_processed}</p>
                      <p>{t("adminImport.tablesProcessed", "Tables processed")}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{dryRunResult.summary.total_inserted.toLocaleString()}</p>
                      <p>{t("adminImport.wouldInsert", "Would insert")}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{dryRunResult.summary.total_updated.toLocaleString()}</p>
                      <p>{t("adminImport.wouldUpdate", "Would update")}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{dryRunResult.summary.total_skipped.toLocaleString()}</p>
                      <p>{t("adminImport.wouldSkip", "Would skip")}</p>
                    </div>
                  </div>
                  {/* Per-table breakdown in dry-run */}
                  <div className="space-y-1">
                    {dryRunResult.results.map((r) => (
                      <div key={r.table} className="flex items-center gap-2 text-xs">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{TABLE_LABELS[r.table] ?? r.table}:</span>
                        <span className="text-green-600 dark:text-green-400">+{r.inserted}</span>
                        <span className="text-blue-600 dark:text-blue-400">~{r.updated}</span>
                        <span className="text-muted-foreground">⊘{r.skipped}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={handleDryRun}
                  disabled={importSelectedTables.size === 0 || dryRunMutation.isPending || importMutation.isPending}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {dryRunMutation.isPending
                    ? t("adminImport.previewing", "Previewing…")
                    : t("adminImport.previewChanges", "Preview Changes")}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={importSelectedTables.size === 0 || importMutation.isPending}
                      className="gap-2"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      {importMutation.isPending
                        ? t("adminImport.importing", "Importing…")
                        : t("adminImport.startImport", "Start Import")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("adminImport.confirmTitle", "Confirm Data Import")}</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <span className="block">
                          {t("adminImport.confirmDescription", "You are about to import {{rows}} rows across {{count}} tables using \"{{mode}}\" conflict resolution.", {
                            rows: importSelectedRows.toLocaleString(),
                            count: importSelectedTables.size,
                            mode: conflictMode,
                          })}
                        </span>
                        <span className="block text-muted-foreground text-xs">
                          {t("adminImport.snapshotNote", "A pre-import safety snapshot will be saved for rollback reference.")}
                        </span>
                        {conflictMode === "replace" && (
                          <span className="block text-amber-600 dark:text-amber-400 font-medium">
                            ⚠ {t("adminImport.replaceWarning", "Replace mode will delete and re-insert matching records. This cannot be undone.")}
                          </span>
                        )}
                        {Array.from(importSelectedTables).some((tbl) => PII_TABLES.has(tbl)) && (
                          <span className="block text-amber-600 dark:text-amber-400 font-medium">
                            ⚠ {t("adminImport.piiImportWarning", "This import includes tables with personally identifiable information.")}
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleImport}>
                        <ArrowUpCircle className="h-4 w-4 mr-1.5" />
                        {t("adminImport.confirmImport", "Import Now")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Importing progress */}
          {importMutation.isPending && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("adminImport.importingProgress", "Importing data into {{count}} tables…", {
                  count: importSelectedTables.size,
                })}
              </p>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          {/* Import error with retry */}
          {importMutation.isError && !importMutation.isPending && (
            <div className="p-3 rounded-lg border border-destructive/50 bg-destructive/5 flex items-center justify-between gap-3">
              <p className="text-sm text-destructive">
                {t("adminImport.importFailed", "Import failed")}: {(importMutation.error as Error).message}
              </p>
              <Button variant="outline" size="sm" onClick={handleImport} className="flex-shrink-0 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {t("adminImport.retry", "Retry")}
              </Button>
            </div>
          )}

          {/* Import success summary with per-table breakdown */}
          {importMutation.isSuccess && importMutation.data && (
            <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 space-y-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-sm font-medium">{t("adminImport.importComplete", "Import Complete")}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{importMutation.data.summary.tables_processed}</p>
                  <p>{t("adminImport.tablesProcessed", "Tables processed")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{importMutation.data.summary.total_inserted.toLocaleString()}</p>
                  <p>{t("adminImport.recordsInserted", "Inserted")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{importMutation.data.summary.total_updated.toLocaleString()}</p>
                  <p>{t("adminImport.recordsUpdated", "Updated")}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{importMutation.data.summary.total_skipped.toLocaleString()}</p>
                  <p>{t("adminImport.recordsSkipped", "Skipped")}</p>
                </div>
              </div>

              {/* Per-table collapsible breakdown */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">{t("adminImport.perTableBreakdown", "Per-Table Breakdown")}</p>
                {importMutation.data.results.map((r) => {
                  const isExpanded = expandedTables.has(r.table);
                  const hasErrors = r.errors.length > 0;
                  return (
                    <Collapsible key={r.table} open={isExpanded} onOpenChange={() => toggleExpandedTable(r.table)}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-1.5 rounded hover:bg-muted/50 text-xs">
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <span className="font-medium flex-1">{TABLE_LABELS[r.table] ?? r.table}</span>
                        <span className="text-green-600 dark:text-green-400">+{r.inserted}</span>
                        <span className="text-blue-600 dark:text-blue-400">~{r.updated}</span>
                        <span className="text-muted-foreground">⊘{r.skipped}</span>
                        {hasErrors && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                            {r.errors.length} err
                          </Badge>
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-5 pb-1">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>{t("adminImport.recordsInserted", "Inserted")}: {r.inserted}</p>
                          <p>{t("adminImport.recordsUpdated", "Updated")}: {r.updated}</p>
                          <p>{t("adminImport.recordsSkipped", "Skipped")}: {r.skipped}</p>
                          {hasErrors && (
                            <div className="mt-1">
                              {r.errors.map((err, i) => (
                                <p key={i} className="text-destructive">{err}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>

              {importMutation.data.summary.total_errors > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t("adminImport.errorsOccurred", "{{count}} errors occurred", { count: importMutation.data.summary.total_errors })}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={resetImport} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                {t("adminImport.importAnother", "Import Another File")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History — Tabs for Backups and Imports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {t("adminBackup.operationHistory", "Operation History")}
          </CardTitle>
          <CardDescription>{t("adminBackup.historyDescription", "Recent backup and import operations recorded in the audit trail.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="backups">
            <TabsList>
              <TabsTrigger value="backups">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {t("adminBackup.recentBackups", "Recent Backups")}
              </TabsTrigger>
              <TabsTrigger value="imports">
                <History className="h-3.5 w-3.5 mr-1.5" />
                {t("adminImport.recentImports", "Recent Imports")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="backups">
              {historyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : !history || history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("adminBackup.noBackups", "No backups have been performed yet.")}
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => {
                    const details = entry.details as Record<string, Json> | null;
                    const tables = (details?.tables as string[]) ?? [];
                    const rowCounts = details?.row_counts as Record<string, number> | undefined;
                    const total = rowCounts
                      ? Object.values(rowCounts).reduce((a, b) => a + b, 0)
                      : 0;
                    const adminEmail = details?.admin_email as string | undefined;
                    const fmt = details?.format as string | undefined;
                    const checksum = details?.checksum_sha256 as string | undefined;

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {adminEmail ?? "Admin"} · {tables.length} {t("adminBackup.tables", "tables")} · {total.toLocaleString()} {t("adminBackup.rows", "rows")}
                          </p>
                          {checksum && (
                            <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                              SHA-256: {checksum.slice(0, 16)}…
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleReExport(tables, fmt ?? "json")}
                          >
                            <RotateCcw className="h-3 w-3" />
                            {t("adminBackup.reExport", "Re-export")}
                          </Button>
                          <Badge variant="outline" className="uppercase text-xs">
                            {fmt ?? "json"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="imports">
              {importHistoryLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : !importHistory || importHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("adminImport.noImports", "No imports have been performed yet.")}
                </p>
              ) : (
                <div className="space-y-2">
                  {importHistory.map((entry) => {
                    const details = entry.details as Record<string, Json> | null;
                    const tables = (details?.tables_imported as string[]) ?? [];
                    const mode = (details?.conflict_mode as string) ?? "upsert";
                    const inserted = (details?.total_inserted as number) ?? 0;
                    const updated = (details?.total_updated as number) ?? 0;
                    const skipped = (details?.total_skipped as number) ?? 0;
                    const errors = (details?.total_errors as number) ?? 0;
                    const adminEmail = details?.admin_email as string | undefined;

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {adminEmail ?? "Admin"} · {tables.length} {t("adminBackup.tables", "tables")} · {mode}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-green-600 dark:text-green-400">+{inserted}</span>{" "}
                            <span className="text-blue-600 dark:text-blue-400">~{updated}</span>{" "}
                            <span>⊘{skipped}</span>
                            {errors > 0 && <span className="text-destructive ml-1">✕{errors}</span>}
                          </p>
                        </div>
                        <Badge variant={errors > 0 ? "destructive" : "outline"} className="text-xs flex-shrink-0">
                          {errors > 0 ? t("adminImport.withErrors", "With Errors") : t("common.success", "Success")}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </TabsContent>

        {/* === SCHEDULED BACKUPS TAB === */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scheduled Backups</h2>
            <Button onClick={() => { setEditingSchedule(null); setScheduleFormOpen(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Schedule
            </Button>
          </div>
          {schedulesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : schedules && schedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((schedule) => (
                <BackupScheduleCard key={schedule.id} schedule={schedule} onEdit={handleEditSchedule} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No backup schedules yet</p>
                <p className="text-sm mt-1">Create your first automated backup schedule to keep your data safe.</p>
                <Button onClick={() => { setEditingSchedule(null); setScheduleFormOpen(true); }} className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" /> Create Schedule
                </Button>
              </CardContent>
            </Card>
          )}
          <BackupScheduleForm open={scheduleFormOpen} onClose={handleCloseScheduleForm} editSchedule={editingSchedule} />
        </TabsContent>

        {/* === BACKUP RUNS TAB === */}
        <TabsContent value="runs">
          <BackupRunTimeline />
        </TabsContent>

        {/* === SYNC MONITOR TAB === */}
        <TabsContent value="monitor">
          <BackupSyncMonitor />
        </TabsContent>

        {/* === CLOUD RESTORE TAB === */}
        <TabsContent value="cloud-restore">
          <CloudBackupRestore />
        </TabsContent>
      </Tabs>
    </div>
  );
}
