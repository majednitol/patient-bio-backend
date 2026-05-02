import { useMemo } from "react";
import { useDoctorProfile } from "./useDoctorProfile";
import { useDoctorHospitals } from "./useDoctorHospitals";

interface ProfileField {
  key: string;
  label: string;
  isComplete: boolean;
  link?: string;
}

interface ProfileCompletion {
  percentage: number;
  completedCount: number;
  totalCount: number;
  fields: ProfileField[];
  missingFields: ProfileField[];
}

export const useDoctorProfileCompletion = (): ProfileCompletion => {
  const { data: profile } = useDoctorProfile();
  const { data: hospitals } = useDoctorHospitals();

  return useMemo(() => {
    const fields: ProfileField[] = [
      {
        key: "full_name",
        label: "Full Name",
        isComplete: !!profile?.full_name && profile.full_name.trim().length > 0,
        link: "/doctor/profile",
      },
      {
        key: "specialty",
        label: "Specialty",
        isComplete: !!profile?.specialty && profile.specialty.trim().length > 0,
        link: "/doctor/profile",
      },
      {
        key: "license_number",
        label: "License Number",
        isComplete: !!profile?.license_number && profile.license_number.trim().length > 0,
        link: "/doctor/profile",
      },
      {
        key: "phone",
        label: "Phone Number",
        isComplete: !!profile?.phone && profile.phone.trim().length > 0,
        link: "/doctor/profile",
      },
      {
        key: "qualification",
        label: "Qualification",
        isComplete: !!profile?.qualification && profile.qualification.trim().length > 0,
        link: "/doctor/profile",
      },
      {
        key: "experience_years",
        label: "Years of Experience",
        isComplete: profile?.experience_years !== null && profile?.experience_years !== undefined,
        link: "/doctor/profile",
      },
      {
        key: "bio",
        label: "Professional Bio",
        isComplete: !!profile?.bio && profile.bio.trim().length > 0,
        link: "/doctor/profile",
      },
      {
        key: "avatar_url",
        label: "Profile Photo",
        isComplete: !!profile?.avatar_url,
        link: "/doctor/profile",
      },
      {
        key: "languages_spoken",
        label: "Languages Spoken",
        isComplete: !!profile?.languages_spoken && profile.languages_spoken.length > 0,
        link: "/doctor/profile",
      },
      {
        key: "hospital_affiliation",
        label: "Hospital Affiliation",
        isComplete: hospitals && hospitals.length > 0,
        link: "/hospital/hospitals",
      },
    ];

    const completedCount = fields.filter((f) => f.isComplete).length;
    const totalCount = fields.length;
    const percentage = Math.round((completedCount / totalCount) * 100);
    const missingFields = fields.filter((f) => !f.isComplete);

    return {
      percentage,
      completedCount,
      totalCount,
      fields,
      missingFields,
    };
  }, [profile, hospitals]);
};
