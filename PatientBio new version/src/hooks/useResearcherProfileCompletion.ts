import { useMemo } from "react";
import { useResearcherProfile } from "./useResearcherProfile";

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

export const useResearcherProfileCompletion = (): ProfileCompletion => {
  const { profile } = useResearcherProfile();

  return useMemo(() => {
    const fields: ProfileField[] = [
      {
        key: "full_name",
        label: "Full Name",
        isComplete: !!profile?.full_name && profile.full_name.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "institution_name",
        label: "Institution Name",
        isComplete: !!profile?.institution_name && profile.institution_name.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "institution_type",
        label: "Institution Type",
        isComplete: !!profile?.institution_type && profile.institution_type.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "department",
        label: "Department",
        isComplete: !!profile?.department && profile.department.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "research_focus",
        label: "Research Focus Area",
        isComplete: !!profile?.research_focus && profile.research_focus.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "license_number",
        label: "License/ID Number",
        isComplete: !!profile?.license_number && profile.license_number.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "phone",
        label: "Phone Number",
        isComplete: !!profile?.phone && profile.phone.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "email",
        label: "Email Address",
        isComplete: !!profile?.email && profile.email.trim().length > 0,
        link: "/researcher/profile",
      },
      {
        key: "avatar_url",
        label: "Profile Photo",
        isComplete: !!profile?.avatar_url,
        link: "/researcher/profile",
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
