import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformCompletion } from "@/hooks/usePlatformCompletion";
import { Users, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const portalColors: Record<string, string> = {
  patient: "bg-blue-500",
  doctor: "bg-green-500",
  pathologist: "bg-teal-500",
  researcher: "bg-amber-500",
  hospital: "bg-purple-500",
};

export const PlatformCompletionCard = () => {
  const { data: stats, isLoading } = usePlatformCompletion();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t("platformCompletion.profileCompletenessHealth")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("platformCompletion.platformWideMetrics")}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-primary">
              {stats.averageCompletion}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("platformCompletion.avgCompletion")}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {stats.totalUsers}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("platformCompletion.totalProfiles")}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl sm:text-3xl font-bold text-green-600">
                {stats.usersAt100}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("platformCompletion.complete")}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-2xl sm:text-3xl font-bold text-amber-600">
                {stats.usersBelow50}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("platformCompletion.below50")}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t("platformCompletion.completionByPortal")}
          </h4>
          <div className="space-y-3">
            {stats.byPortal.map((portal) => (
              <div key={portal.portalType} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        portalColors[portal.portalType] || "bg-gray-500"
                      )}
                    />
                    <span className="font-medium">{portal.label}</span>
                    <span className="text-muted-foreground">
                      ({portal.count})
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-semibold",
                      portal.averageCompletion >= 80
                        ? "text-green-600"
                        : portal.averageCompletion >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                    )}
                  >
                    {portal.averageCompletion}%
                  </span>
                </div>
                <Progress
                  value={portal.averageCompletion}
                  className={cn(
                    "h-2",
                    portal.averageCompletion >= 80
                      ? "[&>div]:bg-green-500"
                      : portal.averageCompletion >= 50
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-red-500"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};