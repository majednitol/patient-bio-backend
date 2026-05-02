import { useTranslation } from "react-i18next";
import { FlaskConical } from "lucide-react";
import { BaseProfileCompletionCard } from "@/components/shared/BaseProfileCompletionCard";
import { useResearcherProfileCompletion } from "@/hooks/useResearcherProfileCompletion";

export const ResearcherProfileCompletionCard = () => {
  const { t } = useTranslation();
  const { percentage, completedCount, totalCount, missingFields } = useResearcherProfileCompletion();

  return (
    <BaseProfileCompletionCard
      title={t("profileCompletion.completeProfile")}
      icon={FlaskConical}
      percentage={percentage}
      completedCount={completedCount}
      totalCount={totalCount}
      missingFields={missingFields}
      profileLink="/researcher/profile#profile-completion"
      colorScheme="amber"
    />
  );
};