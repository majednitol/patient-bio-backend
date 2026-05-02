import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DoctorReceivedReport {
  id: string;
  report_name: string;
  report_type: string | null;
  disease_category: string | null;
  findings: string | null;
  file_url: string | null;
  has_abnormal_values: boolean | null;
  abnormal_flags: any;
  created_at: string | null;
  patient_id: string;
  pathologist_id: string;
  pathologist_name: string | null;
  patient_name: string | null;
  doctor_viewed_at: string | null;
}

export const useDoctorReceivedReports = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["doctor-received-reports", user?.id],
    queryFn: async (): Promise<DoctorReceivedReport[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("pathologist_reports")
        .select("id, report_name, report_type, disease_category, findings, file_url, has_abnormal_values, abnormal_flags, created_at, patient_id, pathologist_id, doctor_id")
        .eq("doctor_id", user.id)
        .eq("is_shared_with_doctor", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching doctor received reports:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      const pathologistIds = [...new Set(data.map((r) => r.pathologist_id))];
      const patientIds = [...new Set(data.map((r) => r.patient_id))];

      const [pathRes, patientRes] = await Promise.all([
        supabase.from("pathologist_profiles").select("user_id, full_name").in("user_id", pathologistIds),
        supabase.from("user_profiles").select("user_id, display_name").in("user_id", patientIds),
      ]);

      const pathMap = new Map((pathRes.data || []).map((p) => [p.user_id, p.full_name]));
      const patientMap = new Map((patientRes.data || []).map((p) => [p.user_id, p.display_name]));

      return data.map((r) => ({
        id: r.id,
        report_name: r.report_name,
        report_type: r.report_type,
        disease_category: r.disease_category,
        findings: r.findings,
        file_url: r.file_url,
        has_abnormal_values: r.has_abnormal_values,
        abnormal_flags: r.abnormal_flags,
        created_at: r.created_at,
        patient_id: r.patient_id,
        pathologist_id: r.pathologist_id,
        pathologist_name: pathMap.get(r.pathologist_id) || null,
        patient_name: patientMap.get(r.patient_id) || null,
        doctor_viewed_at: (r as any).doctor_viewed_at || null,
      }));
    },
    enabled: !!user?.id,
  });

  const markReportViewed = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("pathologist_reports")
        .update({ doctor_viewed_at: new Date().toISOString() } as any)
        .eq("id", reportId)
        .is("doctor_viewed_at" as any, null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-received-reports", user?.id] });
    },
  });

  const getReportSignedUrl = async (fileUrl: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("pathologist-reports")
        .createSignedUrl(fileUrl, 300);
      if (error) throw error;
      return data.signedUrl;
    } catch (error: any) {
      toast({ title: "Error accessing report file", description: error.message, variant: "destructive" });
      return null;
    }
  };

  return { reports, isLoading, getReportSignedUrl, markReportViewed: markReportViewed.mutate };
};
