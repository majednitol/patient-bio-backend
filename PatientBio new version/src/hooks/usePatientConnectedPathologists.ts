import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ConnectedPathologist {
  id: string;
  full_name: string;
  lab_name: string | null;
  specialization_area: string | null;
  avatar_url: string | null;
  reportCount: number;
}

export const usePatientConnectedPathologists = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["patient-connected-pathologists", user?.id],
    queryFn: async (): Promise<ConnectedPathologist[]> => {
      if (!user?.id) return [];

      // Get all reports shared with this patient
      const { data: reports, error } = await supabase
        .from("pathologist_reports")
        .select("pathologist_id")
        .eq("patient_id", user.id)
        .eq("is_shared_with_patient", true);

      if (error || !reports?.length) return [];

      // Count reports per pathologist
      const countMap = new Map<string, number>();
      reports.forEach((r) => {
        countMap.set(r.pathologist_id, (countMap.get(r.pathologist_id) || 0) + 1);
      });

      const pathologistIds = Array.from(countMap.keys());

      const { data: profiles } = await supabase
        .from("pathologist_profiles")
        .select("user_id, full_name, lab_name, specialization_area, avatar_url")
        .in("user_id", pathologistIds);

      return (profiles || []).map((p) => ({
        id: p.user_id,
        full_name: p.full_name,
        lab_name: p.lab_name,
        specialization_area: p.specialization_area,
        avatar_url: p.avatar_url,
        reportCount: countMap.get(p.user_id) || 0,
      }));
    },
    enabled: !!user?.id,
  });
};
