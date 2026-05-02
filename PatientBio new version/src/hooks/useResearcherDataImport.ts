import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ImportRequest {
  importType: "research_studies" | "participant_cohorts" | "study_notes";
  csvContent: string;
  conflictResolution: "merge" | "replace" | "skip";
  options?: {
    sendInvitations?: boolean;
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

export function useResearcherDataImport() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (request: ImportRequest): Promise<ImportResult> => {
      const { data, error } = await supabase.functions.invoke("import-researcher-data", {
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
        case "research_studies":
          queryClient.invalidateQueries({ queryKey: ["research-broadcast-requests"] });
          break;
        case "participant_cohorts":
          queryClient.invalidateQueries({ queryKey: ["data-access-requests"] });
          queryClient.invalidateQueries({ queryKey: ["patient-researcher-shares"] });
          break;
        case "study_notes":
          queryClient.invalidateQueries({ queryKey: ["researcher-study-notes"] });
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
