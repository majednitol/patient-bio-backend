import { useMemo } from "react";
import { useMyHospitals } from "./useHospitals";
import type { ProfileCompletionMetrics, ProfileField } from "@/types/profileCompletion";

export const useHospitalProfileCompletion = (): ProfileCompletionMetrics => {
  const { data: myHospitals } = useMyHospitals();
  const hospital = myHospitals?.[0]?.hospital;

  return useMemo(() => {
    const fields: ProfileField[] = [
      {
        key: "name",
        label: "Hospital Name",
        isComplete: !!hospital?.name && hospital.name.trim().length > 0,
        link: "/hospital/settings",
        priority: "high",
      },
      {
        key: "city",
        label: "City",
        isComplete: !!hospital?.city && hospital.city.trim().length > 0,
        link: "/hospital/settings",
        priority: "high",
      },
      {
        key: "phone",
        label: "Phone Number",
        isComplete: !!hospital?.phone && hospital.phone.trim().length > 0,
        link: "/hospital/settings",
        priority: "high",
      },
      {
        key: "email",
        label: "Email Address",
        isComplete: !!hospital?.email && hospital.email.trim().length > 0,
        link: "/hospital/settings",
        priority: "medium",
      },
      {
        key: "address",
        label: "Street Address",
        isComplete: !!hospital?.address && hospital.address.trim().length > 0,
        link: "/hospital/settings",
        priority: "medium",
      },
      {
        key: "description",
        label: "Description",
        isComplete: !!hospital?.description && hospital.description.trim().length > 0,
        link: "/hospital/settings",
        priority: "low",
      },
      {
        key: "logo_url",
        label: "Hospital Logo",
        isComplete: !!hospital?.logo_url,
        link: "/hospital/settings",
        priority: "low",
      },
      {
        key: "website",
        label: "Website",
        isComplete: !!hospital?.website && hospital.website.trim().length > 0,
        link: "/hospital/settings",
        priority: "low",
      },
    ];

    const completedCount = fields.filter((f) => f.isComplete).length;
    const totalCount = fields.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const missingFields = fields.filter((f) => !f.isComplete);

    return {
      percentage,
      completedCount,
      totalCount,
      fields,
      missingFields,
    };
  }, [hospital]);
};
