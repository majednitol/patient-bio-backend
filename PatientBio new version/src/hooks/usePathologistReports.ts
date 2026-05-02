import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { AbnormalFlag } from "@/components/pathologist/AbnormalFlagEditor";
import type { Json } from "@/integrations/supabase/types";
import { parseAiAnalysis, type AiAnalysisData } from "@/hooks/useReportDiagnosisAnalysis";

export interface HospitalOrderContext {
  id: string;
  tests: { name: string; price?: number }[];
  urgency: string;
  clinical_notes: string | null;
  hospital: { name: string } | null;
}

export interface ReportAddendum {
  id: string;
  text: string;
  added_at: string;
  added_by: string;
}

export interface PathologistReport {
  id: string;
  pathologist_id: string;
  patient_id: string;
  doctor_id: string | null;
  report_type: string | null;
  report_name: string;
  findings: string | null;
  file_url: string | null;
  disease_category: string | null;
  is_shared_with_doctor: boolean;
  is_shared_with_patient: boolean;
  has_abnormal_values: boolean;
  abnormal_flags: AbnormalFlag[];
  addenda: ReportAddendum[];
  doctor_notified_at: string | null;
  doctor_viewed_at: string | null;
  hospital_lab_order_id: string | null;
  hospital_order?: HospitalOrderContext | null;
  ai_analysis: AiAnalysisData | null;
  created_at: string;
  updated_at: string;
}

// Helper to safely parse abnormal_flags from JSON
const parseAbnormalFlags = (flags: Json | null): AbnormalFlag[] => {
  if (!flags || !Array.isArray(flags)) return [];
  return flags as unknown as AbnormalFlag[];
};

// Helper to safely parse addenda from JSON
const parseAddenda = (addenda: Json | null): ReportAddendum[] => {
  if (!addenda || !Array.isArray(addenda)) return [];
  return addenda as unknown as ReportAddendum[];
};

export const usePathologistReports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ["pathologist-reports", user?.id],
    queryFn: async (): Promise<PathologistReport[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("pathologist_reports")
        .select(`
          *,
          hospital_order:hospital_lab_orders(
            id,
            tests,
            urgency,
            clinical_notes,
            hospital:hospitals(name)
          )
        `)
        .eq("pathologist_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reports:", error);
        return [];
      }

      // Transform the data to match our interface
      return (data || []).map((report) => ({
        ...report,
        abnormal_flags: parseAbnormalFlags(report.abnormal_flags),
        addenda: parseAddenda(report.addenda),
        has_abnormal_values: report.has_abnormal_values ?? false,
        hospital_order: report.hospital_order as HospitalOrderContext | null,
        ai_analysis: parseAiAnalysis(report.ai_analysis as Json),
      })) as PathologistReport[];
    },
    enabled: !!user?.id,
  });

  const uploadFile = async (file: File): Promise<string> => {
    if (!user?.id) throw new Error("Not authenticated");

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("pathologist-reports")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    return filePath;
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("pathologist-reports")
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error("Error generating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  };

  const createReport = useMutation({
    mutationFn: async (reportData: {
      patient_id: string;
      doctor_id?: string;
      report_type: string;
      report_name: string;
      findings?: string;
      file_url?: string;
      disease_category?: string;
      abnormal_flags?: AbnormalFlag[];
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const hasAbnormal = (reportData.abnormal_flags?.length ?? 0) > 0;

      const { error } = await supabase.from("pathologist_reports").insert({
        pathologist_id: user.id,
        patient_id: reportData.patient_id,
        doctor_id: reportData.doctor_id,
        report_type: reportData.report_type,
        report_name: reportData.report_name,
        findings: reportData.findings,
        file_url: reportData.file_url,
        disease_category: reportData.disease_category,
        has_abnormal_values: hasAbnormal,
        abnormal_flags: (reportData.abnormal_flags || []) as unknown as Json,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report created successfully" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-reports", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error creating report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({
      reportId,
      data,
    }: {
      reportId: string;
      data: {
        report_name?: string;
        report_type?: string;
        disease_category?: string;
        findings?: string;
        file_url?: string;
        abnormal_flags?: AbnormalFlag[];
      };
    }) => {
      const hasAbnormal = (data.abnormal_flags?.length ?? 0) > 0;
      
      // Build the update object explicitly to handle JSON type conversion
      const updateData: Record<string, unknown> = {};
      if (data.report_name !== undefined) updateData.report_name = data.report_name;
      if (data.report_type !== undefined) updateData.report_type = data.report_type;
      if (data.disease_category !== undefined) updateData.disease_category = data.disease_category;
      if (data.findings !== undefined) updateData.findings = data.findings;
      if (data.file_url !== undefined) updateData.file_url = data.file_url;
      if (data.abnormal_flags !== undefined) {
        updateData.has_abnormal_values = hasAbnormal;
        updateData.abnormal_flags = data.abnormal_flags as unknown as Json;
      }

      const { error } = await supabase
        .from("pathologist_reports")
        .update(updateData)
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-reports", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error updating report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addAddendum = useMutation({
    mutationFn: async ({ reportId, text }: { reportId: string; text: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Fetch current addenda
      const { data: current, error: fetchError } = await supabase
        .from("pathologist_reports")
        .select("addenda")
        .eq("id", reportId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      const existingAddenda = parseAddenda(current?.addenda as Json);
      const newAddendum: ReportAddendum = {
        id: crypto.randomUUID(),
        text,
        added_at: new Date().toISOString(),
        added_by: user.id,
      };
      
      const updatedAddenda = [...existingAddenda, newAddendum];
      
      const { error } = await supabase
        .from("pathologist_reports")
        .update({ addenda: updatedAddenda as unknown as Json })
        .eq("id", reportId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Addendum added successfully" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-reports", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error adding addendum",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shareWithDoctor = useMutation({
    mutationFn: async ({ reportId, doctorId }: { reportId: string; doctorId: string }) => {
      const { error } = await supabase
        .from("pathologist_reports")
        .update({ doctor_id: doctorId, is_shared_with_doctor: true })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report shared with doctor" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-reports", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error sharing report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shareWithPatient = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("pathologist_reports")
        .update({ is_shared_with_patient: true })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report shared with patient" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-reports", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error sharing report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("pathologist_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report deleted" });
      queryClient.invalidateQueries({ queryKey: ["pathologist-reports", user?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    reports,
    isLoading,
    refetch,
    uploadFile,
    getSignedUrl,
    createReport: createReport.mutate,
    updateReport: updateReport.mutate,
    shareWithDoctor: shareWithDoctor.mutate,
    shareWithPatient: shareWithPatient.mutate,
    addAddendum: addAddendum.mutate,
    deleteReport: deleteReport.mutate,
    isCreating: createReport.isPending,
    isUpdating: updateReport.isPending,
    isAddingAddendum: addAddendum.isPending,
  };
};
