import { Microscope } from "lucide-react";
import { BaseProfileCompletionCard } from "@/components/shared/BaseProfileCompletionCard";
import { usePathologistProfileCompletion } from "@/hooks/usePathologistProfileCompletion";

export const PathologistProfileCompletionCard = () => {
  const { percentage, completedCount, totalCount, missingFields } = usePathologistProfileCompletion();

  return (
    <BaseProfileCompletionCard
      title="Complete Your Profile"
      icon={Microscope}
      percentage={percentage}
      completedCount={completedCount}
      totalCount={totalCount}
      missingFields={missingFields}
      profileLink="/pathologist/profile#profile-completion"
      colorScheme="teal"
    />
  );
};
