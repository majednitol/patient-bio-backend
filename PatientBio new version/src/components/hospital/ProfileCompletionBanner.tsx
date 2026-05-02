import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { BaseProfileCompletionCard } from "@/components/shared/BaseProfileCompletionCard";
import { useHospitalProfileCompletion } from "@/hooks/useHospitalProfileCompletion";

export default function ProfileCompletionBanner() {
  const { t } = useTranslation();
  const { percentage, completedCount, totalCount, missingFields } = useHospitalProfileCompletion();

  if (percentage >= 80) {
    return null;
  }

  return (
    <BaseProfileCompletionCard
      title={t("profileCompletion.completeHospitalProfile")}
      icon={Building2}
      percentage={percentage}
      completedCount={completedCount}
      totalCount={totalCount}
      missingFields={missingFields}
      profileLink="/hospital/settings"
      colorScheme="purple"
    />
  );
}