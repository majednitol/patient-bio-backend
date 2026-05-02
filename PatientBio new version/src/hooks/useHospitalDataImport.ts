import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ImportType = 'departments' | 'staff' | 'wards' | 'patients' | 'admissions' | 'invoices';
export type ConflictResolution = 'merge' | 'replace' | 'skip';

interface ImportRequest {
  hospitalId: string;
  importType: ImportType;
  csvContent: string;
  conflictResolution: ConflictResolution;
  sendInvitations?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  errors: { row: number; error: string }[];
  warnings: string[];
}

export function useHospitalDataImport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: ImportRequest): Promise<ImportResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }
      
      const { data, error } = await supabase.functions.invoke('import-hospital-data', {
        body: request,
      });
      
      if (error) {
        throw new Error(error.message || 'Import failed');
      }
      
      return data as ImportResult;
    },
    onSuccess: (data, variables) => {
      // Invalidate related caches based on import type
      const cacheKeys: Record<ImportType, string[]> = {
        departments: ['hospital-departments'],
        staff: ['hospital-staff'],
        wards: ['wards', 'beds'],
        patients: ['data-access-requests'],
        admissions: ['admissions'],
        invoices: ['invoices'],
      };
      
      const keysToInvalidate = cacheKeys[variables.importType] || [];
      keysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key, variables.hospitalId] });
      });
      
      // Also invalidate the import history
      queryClient.invalidateQueries({ queryKey: ['provider-import-logs', variables.hospitalId] });
      
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} records${data.skipped > 0 ? `, skipped ${data.skipped}` : ''}${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
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
}

export function useImportHistory(hospitalId: string) {
  return useQueryClient().fetchQuery({
    queryKey: ['provider-import-logs', hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_import_logs')
        .select('*')
        .eq('provider_id', hospitalId)
        .eq('provider_type', 'hospital')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });
}
