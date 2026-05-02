import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorImportRequest {
  csvContent: string;
  importType: "templates" | "patients" | "notes";
  conflictResolution: "merge" | "replace" | "skip";
  sourceFilename: string;
}

export interface ImportResponse {
  success: boolean;
  summary: {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  };
  details: Array<{
    success: boolean;
    resourceType: string;
    action: string;
    details?: string;
    error?: string;
  }>;
  importLogId?: string;
}

export const useDoctorDataImport = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: DoctorImportRequest): Promise<ImportResponse> => {
      if (!user?.id) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("import-doctor-data", {
        body: {
          csvContent: request.csvContent,
          importType: request.importType,
          conflictResolution: request.conflictResolution,
          sourceFilename: request.sourceFilename,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Import failed");
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["prescription-templates"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-connections"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-patient-notes"] });

      const message = `Import complete: ${data.summary.imported} imported, ${data.summary.skipped} skipped, ${data.summary.errors} errors`;
      toast.success(message);
    },
    onError: (error) => {
      toast.error("Import failed: " + error.message);
    },
  });
};
