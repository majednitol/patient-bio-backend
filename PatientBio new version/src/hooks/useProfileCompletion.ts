import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompletionMetrics {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  totalFields: number;
}

export const useProfileCompletion = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile-completion", user?.id],
    queryFn: async (): Promise<CompletionMetrics> => {
      if (!user?.id) return { percentage: 0, completedFields: [], missingFields: [], totalFields: 0 };

      const [profileRes, healthRes, recordCountRes, doctorCountRes, clinicalCountRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("display_name, avatar_url, date_of_birth, gender, phone, address, weight")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("health_data")
          .select("blood_group, height, health_allergies, current_medications, emergency_contact_name, emergency_contact_phone")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("health_records")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("doctor_connections")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("patient_clinical_investigations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const completedFields: string[] = [];
      const missingFields: string[] = [];

      // Basic Information (5 fields)
      const profile = profileRes.data;
      if (profile?.display_name) completedFields.push("Name");
      else missingFields.push("Name");

      if (profile?.avatar_url) completedFields.push("Profile Photo");
      else missingFields.push("Profile Photo");

      if (profile?.date_of_birth) completedFields.push("Date of Birth");
      else missingFields.push("Date of Birth");

      if (profile?.gender) completedFields.push("Gender");
      else missingFields.push("Gender");

      if (profile?.phone) completedFields.push("Phone Number");
      else missingFields.push("Phone Number");

      if (profile?.address) completedFields.push("Address");
      else missingFields.push("Address");

      if (profile?.weight) completedFields.push("Weight");
      else missingFields.push("Weight");

      // Health Data (6 fields)
      const health = healthRes.data;
      if (health?.blood_group) completedFields.push("Blood Group");
      else missingFields.push("Blood Group");

      if (health?.height) completedFields.push("Height");
      else missingFields.push("Height");

      if (health?.health_allergies) completedFields.push("Allergies");
      else missingFields.push("Allergies");

      if (health?.current_medications) completedFields.push("Medications");
      else missingFields.push("Medications");

      if (health?.emergency_contact_name) completedFields.push("Emergency Contact");
      else missingFields.push("Emergency Contact");

      if (health?.emergency_contact_phone) completedFields.push("Emergency Phone");
      else missingFields.push("Emergency Phone");

      // Clinical Records (1 field)
      if ((clinicalCountRes.count ?? 0) > 0) completedFields.push("Clinical Records");
      else missingFields.push("Clinical Records");

      // Engagement (2 fields)
      if ((recordCountRes.count ?? 0) > 0) completedFields.push("Health Records");
      else missingFields.push("Health Records");

      if ((doctorCountRes.count ?? 0) > 0) completedFields.push("Connected Doctor");
      else missingFields.push("Connected Doctor");

      const totalFields = completedFields.length + missingFields.length;
      const percentage = totalFields > 0 ? Math.round((completedFields.length / totalFields) * 100) : 0;

      return {
        percentage,
        completedFields,
        missingFields,
        totalFields,
      };
    },
    enabled: !!user?.id,
  });
};
