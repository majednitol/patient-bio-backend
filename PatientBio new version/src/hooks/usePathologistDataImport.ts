import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ImportRequest {
  importType: "test_catalog" | "report_templates" | "historical_reports";
  csvContent: string;
  conflictResolution: "merge" | "replace" | "skip";
  options?: {
    deactivateUnlisted?: boolean;
  };
}

interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}

export function usePathologistDataImport() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (request: ImportRequest): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke("import-pathologist-data", {
        body: request,
      });

      if (error) {
        throw new Error(error.message || "Import failed");
      }

      return data as ImportResult;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant caches based on import type
      switch (variables.importType) {
        case "test_catalog":
          queryClient.invalidateQueries({ queryKey: ["pathologist-tests"] });
          queryClient.invalidateQueries({ queryKey: ["test-catalog"] });
          break;
        case "report_templates":
          queryClient.invalidateQueries({ queryKey: ["pathologist-report-templates"] });
          break;
        case "historical_reports":
          queryClient.invalidateQueries({ queryKey: ["pathologist-reports"] });
          break;
      }

      const totalProcessed = data.imported + data.updated;
      toast({
        title: "Import Complete",
        description: `${totalProcessed} records imported${data.skipped > 0 ? `, ${data.skipped} skipped` : ""}${data.errors.length > 0 ? `, ${data.errors.length} errors` : ""}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    importData: mutation.mutateAsync,
    isImporting: mutation.isPending,
    importResult: mutation.data,
    importError: mutation.error,
  };
}
