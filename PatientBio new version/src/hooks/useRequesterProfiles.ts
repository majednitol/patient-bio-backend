import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RequesterProfile {
  id: string;
  name: string;
  organization: string | null;
  specialty: string | null;
}

/**
 * Resolves requester names and organizations from their profile tables
 */
export function useRequesterProfiles(
  requests: Array<{ requester_id: string; requester_type: string }>
) {
  const uniqueRequesters = requests.reduce<Record<string, Set<string>>>((acc, r) => {
    if (!acc[r.requester_type]) acc[r.requester_type] = new Set();
    acc[r.requester_type].add(r.requester_id);
    return acc;
  }, {});

  return useQuery({
    queryKey: [
      "requester-profiles",
      JSON.stringify(
        Object.fromEntries(Object.entries(uniqueRequesters).map(([k, v]) => [k, [...v]]))
      ),
    ],
    queryFn: async (): Promise<Record<string, RequesterProfile>> => {
      const profileMap: Record<string, RequesterProfile> = {};

      // Doctors
      const doctorIds = [...(uniqueRequesters["doctor"] || [])];
      if (doctorIds.length > 0) {
        const { data } = await supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty")
          .in("user_id", doctorIds);
        data?.forEach((p) => {
          profileMap[p.user_id] = { id: p.user_id, name: p.full_name, organization: null, specialty: p.specialty };
        });
      }

      // Pathologists
      const pathIds = [...(uniqueRequesters["pathologist"] || [])];
      if (pathIds.length > 0) {
        const { data } = await supabase
          .from("pathologist_profiles")
          .select("user_id, full_name, lab_name, specialization_area")
          .in("user_id", pathIds);
        data?.forEach((p) => {
          profileMap[p.user_id] = { id: p.user_id, name: p.full_name, organization: p.lab_name, specialty: p.specialization_area };
        });
      }

      // Researchers
      const researcherIds = [...(uniqueRequesters["researcher"] || [])];
      if (researcherIds.length > 0) {
        const { data } = await supabase
          .from("researcher_profiles")
          .select("user_id, full_name, institution_name, research_focus")
          .in("user_id", researcherIds);
        data?.forEach((p) => {
          profileMap[p.user_id] = { id: p.user_id, name: p.full_name, organization: p.institution_name, specialty: p.research_focus };
        });
      }

      return profileMap;
    },
    enabled: requests.length > 0,
  });
}
