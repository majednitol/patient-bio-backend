import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformCompletionStats } from "@/types/profileCompletion";

interface UserProfileData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface HealthData {
  user_id: string;
  blood_group: string | null;
  health_allergies: string | null;
  current_medications: string | null;
  emergency_contact_name: string | null;
}

interface DoctorProfile {
  user_id: string;
  full_name: string;
  specialty: string | null;
  license_number: string | null;
  phone: string | null;
  qualification: string | null;
  experience_years: number | null;
  bio: string | null;
  avatar_url: string | null;
}

interface PathologistProfile {
  user_id: string;
  full_name: string | null;
  lab_name: string | null;
  license_number: string | null;
  phone: string | null;
  email: string | null;
  lab_address: string | null;
  specialization_area: string | null;
  total_experience: number | null;
  avatar_url: string | null;
}

interface ResearcherProfile {
  user_id: string;
  full_name: string | null;
  institution_name: string | null;
  institution_type: string | null;
  department: string | null;
  research_focus: string | null;
  license_number: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface HospitalData {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  created_by: string | null;
}

function calculatePatientCompletion(
  profile: UserProfileData | undefined,
  health: HealthData | undefined
): number {
  const fields = [
    !!profile?.display_name,
    !!profile?.avatar_url,
    !!health?.blood_group,
    !!health?.health_allergies,
    !!health?.current_medications,
    !!health?.emergency_contact_name,
  ];
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

function calculateDoctorCompletion(profile: DoctorProfile): number {
  const fields = [
    !!profile.full_name?.trim(),
    !!profile.specialty?.trim(),
    !!profile.license_number?.trim(),
    !!profile.phone?.trim(),
    !!profile.qualification?.trim(),
    profile.experience_years !== null && profile.experience_years !== undefined,
    !!profile.bio?.trim(),
    !!profile.avatar_url,
  ];
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

function calculatePathologistCompletion(profile: PathologistProfile): number {
  const fields = [
    !!profile.full_name?.trim(),
    !!profile.lab_name?.trim(),
    !!profile.license_number?.trim(),
    !!profile.phone?.trim(),
    !!profile.email?.trim(),
    !!profile.lab_address?.trim(),
    !!profile.specialization_area?.trim(),
    profile.total_experience !== null && profile.total_experience !== undefined,
    !!profile.avatar_url,
  ];
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

function calculateResearcherCompletion(profile: ResearcherProfile): number {
  const fields = [
    !!profile.full_name?.trim(),
    !!profile.institution_name?.trim(),
    !!profile.institution_type?.trim(),
    !!profile.department?.trim(),
    !!profile.research_focus?.trim(),
    !!profile.license_number?.trim(),
    !!profile.phone?.trim(),
    !!profile.email?.trim(),
    !!profile.avatar_url,
  ];
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

function calculateHospitalCompletion(hospital: HospitalData): number {
  const fields = [
    !!hospital.name?.trim(),
    !!hospital.city?.trim(),
    !!hospital.phone?.trim(),
    !!hospital.email?.trim(),
    !!hospital.address?.trim(),
    !!hospital.description?.trim(),
  ];
  const completed = fields.filter(Boolean).length;
  return Math.round((completed / fields.length) * 100);
}

export const usePlatformCompletion = () => {
  return useQuery({
    queryKey: ["platform-completion-stats"],
    queryFn: async (): Promise<PlatformCompletionStats> => {
      // Fetch all profile data in parallel
      const [
        userProfilesRes,
        healthDataRes,
        doctorProfilesRes,
        pathologistProfilesRes,
        researcherProfilesRes,
        hospitalsRes,
        userRolesRes,
      ] = await Promise.all([
        supabase.from("user_profiles").select("user_id, display_name, avatar_url").limit(1000),
        supabase.from("health_data").select("user_id, blood_group, health_allergies, current_medications, emergency_contact_name").limit(1000),
        supabase.from("doctor_profiles").select("user_id, full_name, specialty, license_number, phone, qualification, experience_years, bio, avatar_url").limit(1000),
        supabase.from("pathologist_profiles").select("user_id, full_name, lab_name, license_number, phone, email, lab_address, specialization_area, total_experience, avatar_url").limit(1000),
        supabase.from("researcher_profiles").select("user_id, full_name, institution_name, institution_type, department, research_focus, license_number, phone, email, avatar_url").limit(1000),
        supabase.from("hospitals").select("id, name, city, phone, email, address, description, created_by").limit(1000),
        supabase.from("user_roles").select("user_id, role").limit(1000),
      ]);

      const userProfiles = (userProfilesRes.data || []) as UserProfileData[];
      const healthData = (healthDataRes.data || []) as HealthData[];
      const doctorProfiles = (doctorProfilesRes.data || []) as DoctorProfile[];
      const pathologistProfiles = (pathologistProfilesRes.data || []) as PathologistProfile[];
      const researcherProfiles = (researcherProfilesRes.data || []) as ResearcherProfile[];
      const hospitals = (hospitalsRes.data || []) as HospitalData[];
      const userRoles = userRolesRes.data || [];

      // Map user_ids to roles for faster lookup
      const roleMap = new Map<string, string>();
      userRoles.forEach((r) => roleMap.set(r.user_id, r.role));

      // Map user_ids to health data for patient completion calculation
      const healthMap = new Map<string, HealthData>();
      healthData.forEach((h) => healthMap.set(h.user_id, h));

      // Calculate completions by portal type
      const completions: { portalType: string; completion: number }[] = [];

      // Patients (role = "user")
      userProfiles.forEach((profile) => {
        const role = roleMap.get(profile.user_id);
        if (role === "user") {
          const health = healthMap.get(profile.user_id);
          completions.push({
            portalType: "patient",
            completion: calculatePatientCompletion(profile, health),
          });
        }
      });

      // Doctors
      doctorProfiles.forEach((profile) => {
        completions.push({
          portalType: "doctor",
          completion: calculateDoctorCompletion(profile),
        });
      });

      // Pathologists
      pathologistProfiles.forEach((profile) => {
        completions.push({
          portalType: "pathologist",
          completion: calculatePathologistCompletion(profile),
        });
      });

      // Researchers
      researcherProfiles.forEach((profile) => {
        completions.push({
          portalType: "researcher",
          completion: calculateResearcherCompletion(profile),
        });
      });

      // Hospitals
      hospitals.forEach((hospital) => {
        completions.push({
          portalType: "hospital",
          completion: calculateHospitalCompletion(hospital),
        });
      });

      // Aggregate stats
      const totalUsers = completions.length;
      const averageCompletion = totalUsers > 0
        ? Math.round(completions.reduce((sum, c) => sum + c.completion, 0) / totalUsers)
        : 0;
      const usersBelow50 = completions.filter((c) => c.completion < 50).length;
      const usersAt100 = completions.filter((c) => c.completion === 100).length;

      // By portal type
      const portalTypes = ["patient", "doctor", "pathologist", "researcher", "hospital"];
      const labels: Record<string, string> = {
        patient: "Patients",
        doctor: "Doctors",
        pathologist: "Pathologists",
        researcher: "Researchers",
        hospital: "Hospitals",
      };

      const byPortal = portalTypes.map((type) => {
        const portalCompletions = completions.filter((c) => c.portalType === type);
        const count = portalCompletions.length;
        const avg = count > 0
          ? Math.round(portalCompletions.reduce((sum, c) => sum + c.completion, 0) / count)
          : 0;
        return {
          portalType: type,
          label: labels[type],
          averageCompletion: avg,
          count,
        };
      }).filter((p) => p.count > 0);

      return {
        averageCompletion,
        usersBelow50,
        usersAt100,
        totalUsers,
        byPortal,
      };
    },
    staleTime: STALE_TIMES.STANDARD,
  });
};
