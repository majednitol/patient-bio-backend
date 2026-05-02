import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BookableDoctor {
  id: string;
  full_name: string;
  specialty: string | null;
  avatar_url: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  has_availability: boolean;
  connection_type: "granted_access" | "hospital_doctor";
  qualification: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  practice_type: string;
  diseases_treated: string[] | null;
}

/**
 * Fetches doctors that a patient can book appointments with.
 * Priority: Doctors who have granted access to the patient + doctors with public availability
 */
export function useBookableDoctors() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bookable-doctors", user?.id],
    queryFn: async (): Promise<BookableDoctor[]> => {
      if (!user?.id) return [];

      // 1. Get doctors who have granted access to this patient
      const { data: accessData, error: accessError } = await supabase
        .from("doctor_patient_access")
        .select("doctor_id")
        .eq("patient_id", user.id)
        .eq("is_active", true);

      if (accessError) throw accessError;

      const connectedDoctorIds = accessData?.map((a) => a.doctor_id) || [];

      // 2. Get all doctors with availability (for public booking)
      const { data: availabilityData, error: availError } = await supabase
        .from("doctor_availability")
        .select("doctor_id, hospital_id")
        .eq("is_active", true);

      if (availError) throw availError;

      // Get unique doctor IDs from availability
      const doctorsWithAvailability = new Set(
        availabilityData?.map((a) => a.doctor_id) || []
      );

      // Combine both sets - prioritize connected doctors
      const allDoctorIds = [
        ...new Set([...connectedDoctorIds, ...Array.from(doctorsWithAvailability)]),
      ];

      if (allDoctorIds.length === 0) return [];

      // 3. Fetch doctor profiles
      const { data: profiles, error: profileError } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty, avatar_url, qualification, experience_years, consultation_fee, is_online, last_seen_at, practice_type, diseases_treated")
        .in("user_id", allDoctorIds);

      if (profileError) throw profileError;

      // 4. Get hospital affiliations
      const { data: staffData, error: staffError } = await supabase
        .from("hospital_staff")
        .select(`
          user_id,
          hospital_id,
          hospitals!inner(id, name)
        `)
        .in("user_id", allDoctorIds)
        .eq("is_active", true)
        .eq("role", "doctor");

      if (staffError) {
        console.error("Error fetching staff affiliations:", staffError);
      }

      // 5. Build bookable doctors list
      const result: BookableDoctor[] = [];

      for (const profile of profiles || []) {
        const isConnected = connectedDoctorIds.includes(profile.user_id);
        const hasAvailability = doctorsWithAvailability.has(profile.user_id);

        // Find hospital affiliation
        const staffRecord = staffData?.find((s) => s.user_id === profile.user_id);
        const hospital = staffRecord?.hospitals as unknown as { id: string; name: string } | undefined;

        result.push({
          id: profile.user_id,
          full_name: profile.full_name,
          specialty: profile.specialty,
          avatar_url: profile.avatar_url,
          hospital_id: hospital?.id || null,
          hospital_name: hospital?.name || null,
          has_availability: hasAvailability,
          connection_type: isConnected ? "granted_access" : "hospital_doctor",
          qualification: profile.qualification,
          experience_years: profile.experience_years,
          consultation_fee: profile.consultation_fee,
          practice_type: (profile as any).practice_type || 'private',
          diseases_treated: (profile as any).diseases_treated || null,
        });
      }

      // Sort: connected doctors first, then by name
      result.sort((a, b) => {
        if (a.connection_type === "granted_access" && b.connection_type !== "granted_access") return -1;
        if (a.connection_type !== "granted_access" && b.connection_type === "granted_access") return 1;
        return a.full_name.localeCompare(b.full_name);
      });

      return result;
    },
    enabled: !!user?.id,
  });
}
