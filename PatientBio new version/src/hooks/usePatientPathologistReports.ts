 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "@/hooks/use-toast";
 
export interface PatientPathologistReport {
  id: string;
  report_name: string;
  report_type: string | null;
  findings: string | null;
  disease_category: string | null;
  file_url: string | null;
  created_at: string | null;
  pathologist_name: string | null;
  lab_name: string | null;
  has_abnormal_values: boolean | null;
}
 
 export const usePatientPathologistReports = () => {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const { data: reports = [], isLoading, refetch } = useQuery({
     queryKey: ["patient-pathologist-reports", user?.id],
     queryFn: async (): Promise<PatientPathologistReport[]> => {
       if (!user?.id) return [];
 
       // Fetch reports where patient_id matches and is_shared_with_patient is true
       const { data: reportsData, error } = await supabase
         .from("pathologist_reports")
          .select(`
            id,
            report_name,
            report_type,
            findings,
            disease_category,
            file_url,
            created_at,
            pathologist_id,
            has_abnormal_values
          `)
         .eq("patient_id", user.id)
         .eq("is_shared_with_patient", true)
         .order("created_at", { ascending: false });
 
       if (error) {
         console.error("Error fetching pathologist reports:", error);
         return [];
       }
 
       // Fetch pathologist profiles for the reports
       const pathologistIds = [...new Set(reportsData.map((r) => r.pathologist_id))];
       const { data: profiles } = await supabase
         .from("pathologist_profiles")
         .select("user_id, full_name, lab_name")
         .in("user_id", pathologistIds);
 
       const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
 
       return reportsData.map((report) => {
         const profile = profileMap.get(report.pathologist_id);
         return {
           id: report.id,
           report_name: report.report_name,
           report_type: report.report_type,
           findings: report.findings,
           disease_category: report.disease_category,
           file_url: report.file_url,
           created_at: report.created_at,
            pathologist_name: profile?.full_name || null,
            lab_name: profile?.lab_name || null,
            has_abnormal_values: report.has_abnormal_values ?? null,
          };
       });
     },
     enabled: !!user?.id,
   });
 
   // Generate signed URL for viewing report file
   const getReportSignedUrl = async (fileUrl: string | null): Promise<string | null> => {
     if (!fileUrl) return null;
 
     // Extract the path from the file URL
     const path = fileUrl.replace(/^.*\/storage\/v1\/object\/public\//, "");
     const bucketAndPath = path.split("/");
     const bucket = bucketAndPath[0];
     const filePath = bucketAndPath.slice(1).join("/");
 
     const { data, error } = await supabase.storage
       .from(bucket)
       .createSignedUrl(filePath, 300); // 5 minutes
 
     if (error) {
       console.error("Error generating signed URL:", error);
       return null;
     }
 
     return data?.signedUrl || null;
   };
 
   const markReportViewedMutation = useMutation({
     mutationFn: async (reportId: string) => {
       if (!user?.id) return;
       const { error } = await supabase
         .from("pathologist_reports")
         .update({ patient_viewed_at: new Date().toISOString() })
         .eq("id", reportId)
         .eq("patient_id", user.id)
         .is("patient_viewed_at", null);
       if (error) console.error("Error marking report viewed:", error);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["patient-pathologist-reports", user?.id] });
     },
   });

   return {
     reports,
     isLoading,
     refetch,
     getReportSignedUrl,
     markReportViewed: markReportViewedMutation.mutate,
   };
 };