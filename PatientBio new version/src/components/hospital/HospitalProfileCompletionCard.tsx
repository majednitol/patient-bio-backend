import { Building2 } from "lucide-react";
import { BaseProfileCompletionCard } from "@/components/shared/BaseProfileCompletionCard";
import { useHospitalProfileCompletion } from "@/hooks/useHospitalProfileCompletion";

export const HospitalProfileCompletionCard = () => {
  const { percentage, completedCount, totalCount, missingFields } = useHospitalProfileCompletion();

  return (
    <BaseProfileCompletionCard
      title="Complete Hospital Profile"
      icon={Building2}
      percentage={percentage}
      completedCount={completedCount}
      totalCount={totalCount}
      missingFields={missingFields}
      profileLink="/hospital/settings"
      colorScheme="purple"
    />
  );
};
