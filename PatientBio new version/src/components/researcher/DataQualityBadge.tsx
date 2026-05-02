import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface DataQualityBadgeProps {
  share: {
    disease_category: string | null;
    research_purpose: string | null;
    is_anonymized: boolean;
    status: string;
    viewed_at: string | null;
    completed_at: string | null;
    expires_at: string | null;
  };
}

export const computeQualityScore = (share: DataQualityBadgeProps["share"], t: (key: string) => string): {
  score: number;
  label: string;
  details: string[];
} => {
  let score = 0;
  const details: string[] = [];

  if (share.disease_category && share.disease_category !== "general") {
    score += 20;
    details.push("✓ " + t("dataQuality.diseaseCategorySpecified"));
  } else {
    details.push("✗ " + t("dataQuality.noDiseaseCat"));
  }

  if (share.research_purpose) {
    score += 15;
    details.push("✓ " + t("dataQuality.researchPurposeDefined"));
  } else {
    details.push("✗ " + t("dataQuality.noResearchPurpose"));
  }

  if (!share.expires_at || new Date(share.expires_at) > new Date()) {
    score += 20;
    details.push("✓ " + t("dataQuality.dataAccessActive"));
  } else {
    details.push("✗ " + t("dataQuality.dataAccessExpired"));
  }

  if (share.status === "completed") {
    score += 25;
    details.push("✓ " + t("dataQuality.dataFullyReviewed"));
  } else if (share.status === "viewed") {
    score += 15;
    details.push("◑ " + t("dataQuality.dataPartiallyReviewed"));
  } else {
    details.push("✗ " + t("dataQuality.dataNotReviewed"));
  }

  score += 20;
  details.push("✓ " + (share.is_anonymized ? t("dataQuality.anonymizedSafe") : t("dataQuality.identifiedRicher")));

  const label = score >= 80 ? t("dataQuality.high") : score >= 50 ? t("dataQuality.medium") : t("dataQuality.low");
  return { score, label, details };
};

const DataQualityBadge = ({ share }: DataQualityBadgeProps) => {
  const { t } = useTranslation();
  const { score, label, details } = computeQualityScore(share, t);

  const Icon = score >= 80 ? ShieldCheck : score >= 50 ? ShieldAlert : ShieldX;
  const variant = score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1 cursor-help">
            <Icon className="h-3 w-3" />
            {label} ({score}%)
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="font-medium mb-1">{t("dataQuality.dataQualityLabel", { score })}</p>
          <ul className="text-xs space-y-0.5">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DataQualityBadge;