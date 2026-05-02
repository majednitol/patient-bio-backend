import React from "react";
import { UserCircle } from "lucide-react";
import { BaseProfileCompletionCard } from "@/components/shared/BaseProfileCompletionCard";
import { useDoctorProfileCompletion } from "@/hooks/useDoctorProfileCompletion";

export const DoctorProfileCompletionCard = React.memo(() => {
  const { percentage, completedCount, totalCount, missingFields } = useDoctorProfileCompletion();

  return (
    <BaseProfileCompletionCard
      title="Complete Your Profile"
      icon={UserCircle}
      percentage={percentage}
      completedCount={completedCount}
      totalCount={totalCount}
      missingFields={missingFields}
      profileLink="/doctor/profile#profile-completion"
      colorScheme="primary"
    />
  );
});
