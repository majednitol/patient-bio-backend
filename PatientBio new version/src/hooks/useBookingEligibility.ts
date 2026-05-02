import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface BookingEligibility {
  isEligible: boolean;
  missingProfileFields: string[];
  missingHealthFields: string[];
  isLoading: boolean;
}

export const useBookingEligibility = (): BookingEligibility => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [missingHealthFields, setMissingHealthFields] = useState<string[]>([]);

  useEffect(() => {
    const checkEligibility = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [profileRes, healthRes] = await Promise.all([
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
        ]);

        const profileMissing: string[] = [];
        const profile = profileRes.data;
        if (!profile?.display_name) profileMissing.push("Display Name");
        if (!profile?.date_of_birth) profileMissing.push("Date of Birth");
        if (!profile?.gender) profileMissing.push("Gender");
        if (!profile?.phone) profileMissing.push("Phone Number");

        const healthMissing: string[] = [];
        const health = healthRes.data;
        if (!health?.blood_group) healthMissing.push("Blood Group");
        if (!health?.emergency_contact_name) healthMissing.push("Emergency Contact Name");
        if (!health?.emergency_contact_phone) healthMissing.push("Emergency Contact Phone");

        setMissingProfileFields(profileMissing);
        setMissingHealthFields(healthMissing);
      } catch (err) {
        console.error("Error checking booking eligibility:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkEligibility();
  }, [user]);

  return {
    isEligible: missingProfileFields.length === 0 && missingHealthFields.length === 0,
    missingProfileFields,
    missingHealthFields,
    isLoading,
  };
};
