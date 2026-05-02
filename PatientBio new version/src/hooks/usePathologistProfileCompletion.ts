import { useMemo } from "react";
import { usePathologistProfile } from "./usePathologistProfile";

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

export const usePathologistProfileCompletion = (): ProfileCompletion => {
  const { profile } = usePathologistProfile();

  return useMemo(() => {
    const fields: ProfileField[] = [
      {
        key: "full_name",
        label: "Full Name",
        isComplete: !!profile?.full_name && profile.full_name.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "lab_name",
        label: "Lab/Center Name",
        isComplete: !!profile?.lab_name && profile.lab_name.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "license_number",
        label: "License Number",
        isComplete: !!profile?.license_number && profile.license_number.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "phone",
        label: "Phone Number",
        isComplete: !!profile?.phone && profile.phone.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "email",
        label: "Email Address",
        isComplete: !!profile?.email && profile.email.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "lab_address",
        label: "Lab Address",
        isComplete: !!profile?.lab_address && profile.lab_address.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "specialization_area",
        label: "Specialization Area",
        isComplete: !!profile?.specialization_area && profile.specialization_area.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "total_experience",
        label: "Years of Experience",
        isComplete: profile?.total_experience !== null && profile?.total_experience !== undefined,
        link: "/pathologist/profile",
      },
      {
        key: "avatar_url",
        label: "Profile Photo",
        isComplete: !!profile?.avatar_url,
        link: "/pathologist/profile",
      },
      {
        key: "certifications",
        label: "Certifications",
        isComplete: !!(profile as any)?.certifications && (profile as any).certifications.trim().length > 0,
        link: "/pathologist/profile",
      },
      {
        key: "lab_hours",
        label: "Lab Operating Hours",
        isComplete: !!(profile as any)?.lab_hours,
        link: "/pathologist/profile",
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
  }, [profile]);
};
