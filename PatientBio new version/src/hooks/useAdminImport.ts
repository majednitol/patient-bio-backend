import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  validTables: string[];
  invalidTables: string[];
  tableSummary: Record<string, number>;
  totalRows: number;
  checksumValid: boolean | null;
  metadata: Record<string, unknown> | null;
}

export interface ImportTableResult {
  table: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  dry_run?: boolean;
  results: ImportTableResult[];
  summary: {
    tables_processed: number;
    total_inserted: number;
    total_updated: number;
    total_skipped: number;
    total_errors: number;
  };
}

export type ConflictMode = "upsert" | "skip" | "replace";

export function useValidateBackup() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<ValidationResult> => {
      const checksum = (payload as { metadata?: { checksum_sha256?: string } })?.metadata
        ?.checksum_sha256;

      const { data, error } = await supabase.functions.invoke("admin-data-import", {
        body: {
          action: "validate",
          payload,
          checksum: checksum ?? undefined,
        },
      });

      if (error) throw new Error(error.message || "Validation failed");
      return data as ValidationResult;
    },
  });
}

export function useDryRunImport() {
  return useMutation({
    mutationFn: async ({
      payload,
      conflictMode,
    }: {
      payload: Record<string, unknown>;
      conflictMode: ConflictMode;
    }): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke("admin-data-import", {
        body: {
          action: "import",
          payload,
          conflict_mode: conflictMode,
          dry_run: true,
        },
      });

      if (error) throw new Error(error.message || "Dry run failed");
      return data as ImportResult;
    },
  });
}

export function useImportBackup() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      payload,
      conflictMode,
    }: {
      payload: Record<string, unknown>;
      conflictMode: ConflictMode;
    }): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke("admin-data-import", {
        body: {
          action: "import",
          payload,
          conflict_mode: conflictMode,
        },
      });

      if (error) throw new Error(error.message || "Import failed");
      return data as ImportResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-backup-counts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-backup-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-import-history"] });

      const msg = `${data.summary.total_inserted} inserted, ${data.summary.total_updated} updated, ${data.summary.total_skipped} skipped`;
      if (data.summary.total_errors > 0) {
        toast.error(
          `${t("adminImport.importCompleteWithErrors", "Import completed with errors")}: ${msg}, ${data.summary.total_errors} errors`,
        );
      } else {
        toast.success(`${t("adminImport.importSuccess", "Import completed successfully")}: ${msg}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`${t("adminImport.importFailed", "Import failed")}: ${err.message}`);
    },
  });
}
