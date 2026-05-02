import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";

export interface PatientFeatureEligibility {
  isEligible: boolean;
  missingCategories: ('profile' | 'health' | 'clinical')[];
  missingProfileFields: string[];
  missingHealthFields: string[];
  hasClinicalRecords: boolean;
  isLoading: boolean;
  completedCount: number;
  totalCount: number;
}

export const usePatientFeatureEligibility = (): PatientFeatureEligibility => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["patient-feature-eligibility", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [profileRes, healthRes, clinicalRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("display_name, date_of_birth, gender, phone")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("health_data")
          .select("blood_group, emergency_contact_name, emergency_contact_phone")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("patient_clinical_investigations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const missingProfileFields: string[] = [];
      const profile = profileRes.data;
      if (!profile?.display_name) missingProfileFields.push("Display Name");
      if (!profile?.date_of_birth) missingProfileFields.push("Date of Birth");
      if (!profile?.gender) missingProfileFields.push("Gender");
      if (!profile?.phone) missingProfileFields.push("Phone Number");

      const missingHealthFields: string[] = [];
      const health = healthRes.data;
      if (!health?.blood_group) missingHealthFields.push("Blood Group");
      if (!health?.emergency_contact_name) missingHealthFields.push("Emergency Contact Name");
      if (!health?.emergency_contact_phone) missingHealthFields.push("Emergency Contact Phone");

      const hasClinicalRecords = (clinicalRes.count ?? 0) > 0;

      const missingCategories: ('profile' | 'health' | 'clinical')[] = [];
      if (missingProfileFields.length > 0) missingCategories.push('profile');
      if (missingHealthFields.length > 0) missingCategories.push('health');

      // Clinical records are tracked but NOT required for feature access
      const totalCount = 2;
      const completedCount = totalCount - missingCategories.length;

      return {
        missingCategories,
        missingProfileFields,
        missingHealthFields,
        hasClinicalRecords,
        isEligible: missingCategories.length === 0,
        completedCount,
        totalCount,
      };
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  if (isLoading || !data) {
    return {
      isEligible: false,
      missingCategories: [],
      missingProfileFields: [],
      missingHealthFields: [],
      hasClinicalRecords: false,
      isLoading: true,
      completedCount: 0,
      totalCount: 2,
    };
  }

  return { ...data, isLoading: false };
};
