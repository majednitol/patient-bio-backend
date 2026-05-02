import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Circle, ArrowRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileField } from "@/types/profileCompletion";

interface BaseProfileCompletionCardProps {
  title?: string;
  icon: LucideIcon;
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: ProfileField[];
  profileLink: string;
  colorScheme?: "primary" | "teal" | "amber" | "purple" | "blue";
  maxDisplayedFields?: number;
}

const colorStyles = {
  primary: {
    card: "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent",
    icon: "text-primary",
    percentage: "text-primary",
    progress: "",
    button: "",
  },
  teal: {
    card: "border-teal-200 dark:border-teal-800/50 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-900/10",
    icon: "text-teal-600 dark:text-teal-400",
    percentage: "text-teal-600 dark:text-teal-400",
    progress: "[&>div]:bg-teal-600",
    button: "bg-teal-600 hover:bg-teal-700 text-white",
  },
  amber: {
    card: "border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10",
    icon: "text-amber-600 dark:text-amber-400",
    percentage: "text-amber-600 dark:text-amber-400",
    progress: "[&>div]:bg-amber-600",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  purple: {
    card: "border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10",
    icon: "text-purple-600 dark:text-purple-400",
    percentage: "text-purple-600 dark:text-purple-400",
    progress: "[&>div]:bg-purple-600",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
  },
  blue: {
    card: "border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-900/10",
    icon: "text-blue-600 dark:text-blue-400",
    percentage: "text-blue-600 dark:text-blue-400",
    progress: "[&>div]:bg-blue-600",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export const BaseProfileCompletionCard = ({
  title,
  icon: Icon,
  percentage,
  completedCount,
  totalCount,
  missingFields,
  profileLink,
  colorScheme = "primary",
  maxDisplayedFields = 3,
}: BaseProfileCompletionCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (percentage === 100) {
    return null;
  }

  const styles = colorStyles[colorScheme];
  const displayMissingFields = missingFields.slice(0, maxDisplayedFields);
  const remainingCount = missingFields.length - maxDisplayedFields;

  return (
    <Card className={cn(styles.card)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", styles.icon)} />
            <CardTitle className="text-lg">{title || t("profileCompletion.completeProfile")}</CardTitle>
          </div>
          <span className={cn("text-2xl font-bold", styles.percentage)}>
            {percentage}%
          </span>
        </div>
        <CardDescription>
          {t("profileCompletion.fieldsCompleted", { completed: completedCount, total: totalCount })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percentage} className={cn("h-2", styles.progress)} />

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("profileCompletion.missingInfo")}
          </p>
          <ul className="space-y-1.5">
            {displayMissingFields.map((field) => (
              <li key={field.key} className="flex items-center gap-2 text-sm">
                <Circle className="h-3 w-3 text-muted-foreground" />
                <span>{field.label}</span>
              </li>
            ))}
            {remainingCount > 0 && (
              <li className="text-sm text-muted-foreground pl-5">
                {t("profileCompletion.moreFields", { count: remainingCount })}
              </li>
            )}
          </ul>
        </div>

        <Button className={cn("w-full", styles.button)} onClick={() => navigate(profileLink)}>
          {t("profileCompletion.profileSettings")}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};