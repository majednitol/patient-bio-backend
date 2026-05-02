import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const EXPORTABLE_TABLES = [
  "user_profiles",
  "user_roles",
  "health_records",
  "access_tokens",
  "access_logs",
  "prescriptions",
  "appointments",
  "doctor_profiles",
  "pathologist_profiles",
  "researcher_profiles",
  "hospitals",
  "hospital_staff",
  "audit_trail",
  "blockchain_transactions",
  "consent_records",
  "data_access_requests",
  "doctor_patient_access",
  "pathologist_reports",
  "patient_wallets",
] as const;

export type ExportableTable = (typeof EXPORTABLE_TABLES)[number];
export { EXPORTABLE_TABLES };

/** Tables that contain Personally Identifiable Information */
export const PII_TABLES: ReadonlySet<string> = new Set([
  "user_profiles",
  "health_records",
  "prescriptions",
  "patient_wallets",
  "consent_records",
  "doctor_profiles",
  "pathologist_profiles",
  "researcher_profiles",
]);

/** Rough bytes-per-row heuristic for size estimation */
export function estimateExportSize(
  tables: string[],
  counts: Record<string, number>,
  fmt: "json" | "csv"
): number {
  const bytesPerRow = fmt === "json" ? 200 : 100;
  return tables.reduce((sum, t) => sum + (counts[t] ?? 0) * bytesPerRow, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ExportResult {
  metadata: {
    exported_at: string;
    admin_email: string;
    format: string;
    tables_exported: string[];
    row_counts: Record<string, number>;
    total_rows: number;
    checksum_sha256: string;
    date_from: string | null;
    date_to: string | null;
  };
  tables: Record<string, Record<string, unknown>[]>;
}

export function useTableCounts() {
  return useQuery({
    queryKey: ["admin-backup-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data-backup", {
        body: { action: "counts" },
      });
      if (error) throw error;
      return data.counts as Record<string, number>;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useBackupExport() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      tables,
      exportFormat,
      dateFrom,
      dateTo,
    }: {
      tables: string[];
      exportFormat: "json" | "csv";
      dateFrom?: string;
      dateTo?: string;
    }): Promise<ExportResult> => {
      const { data, error } = await supabase.functions.invoke("admin-data-backup", {
        body: {
          action: "export",
          tables,
          format: exportFormat,
          date_from: dateFrom,
          date_to: dateTo,
        },
      });
      if (error) throw error;

      const result = data as ExportResult;
      const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");

      if (exportFormat === "csv") {
        const tableData = result.tables;
        let csvContent = "";
        for (const [tableName, rows] of Object.entries(tableData)) {
          if (rows.length === 0) continue;
          const headers = Object.keys(rows[0]);
          csvContent += `\n=== ${tableName.toUpperCase()} (${rows.length} rows) ===\n`;
          csvContent += headers.join(",") + "\n";
          for (const row of rows) {
            csvContent +=
              headers
                .map((h) => {
                  const val = row[h];
                  const str = val === null ? "" : String(val);
                  return str.includes(",") || str.includes('"') || str.includes("\n")
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
                })
                .join(",") + "\n";
          }
        }
        downloadFile(csvContent, `patientbio_backup_${timestamp}.csv`, "text/csv");
      } else {
        downloadFile(
          JSON.stringify(data, null, 2),
          `patientbio_backup_${timestamp}.json`,
          "application/json"
        );
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("adminBackup.exportSuccess", "Backup exported successfully"));
      queryClient.invalidateQueries({ queryKey: ["admin-backup-history"] });
    },
    onError: (err: Error) => {
      toast.error(`${t("adminBackup.exportFailed", "Export failed")}: ${err.message}`);
    },
  });
}

export function useBackupHistory() {
  return useQuery({
    queryKey: ["admin-backup-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_trail")
        .select("id, event_type, entity_type, entity_id, user_id, action, details, created_at")
        .eq("event_type", "SYSTEM_BACKUP")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });
}

export function useImportHistory() {
  return useQuery({
    queryKey: ["admin-import-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_trail")
        .select("id, event_type, entity_type, entity_id, user_id, action, details, created_at")
        .eq("event_type", "SYSTEM_RESTORE")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60,
  });
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
