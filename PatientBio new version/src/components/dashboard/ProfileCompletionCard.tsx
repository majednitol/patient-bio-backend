import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { Link } from "react-router-dom";
import {
  User, CheckCircle2, Circle, ArrowRight, Heart, FileText,
  Users, ClipboardList,
} from "lucide-react";
import { EmergencyHealthCard } from "./EmergencyHealthCard";
import { useTranslation } from "react-i18next";

// Map each missing field to the page/section where users can fill it
const FIELD_ROUTE_MAP: Record<string, string> = {
  "Name": "/dashboard/profile",
  "Profile Photo": "/dashboard/profile",
  "Date of Birth": "/dashboard/profile",
  "Gender": "/dashboard/profile",
  "Phone Number": "/dashboard/profile",
  "Address": "/dashboard/profile",
  "Weight": "/dashboard/health-data",
  "Blood Group": "/dashboard/health-data",
  "Height": "/dashboard/health-data",
  "Allergies": "/dashboard/health-data",
  "Medications": "/dashboard/health-data",
  "Emergency Contact": "/dashboard/health-data",
  "Emergency Phone": "/dashboard/health-data",
  "Clinical Records": "/dashboard/clinical-records",
  "Health Records": "/dashboard/records",
  "Connected Doctor": "/dashboard/doctors",
};

const FIELD_CATEGORY: Record<string, string> = {
  "Name": "basic",
  "Profile Photo": "basic",
  "Date of Birth": "basic",
  "Gender": "basic",
  "Phone Number": "basic",
  "Address": "basic",
  "Weight": "health",
  "Blood Group": "health",
  "Height": "health",
  "Allergies": "health",
  "Medications": "health",
  "Emergency Contact": "health",
  "Emergency Phone": "health",
  "Clinical Records": "clinical",
  "Health Records": "engagement",
  "Connected Doctor": "engagement",
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; route: string }> = {
  basic: { label: "Basic Information", icon: User, route: "/dashboard/profile" },
  health: { label: "Health Data", icon: Heart, route: "/dashboard/health-data" },
  clinical: { label: "Clinical Records", icon: ClipboardList, route: "/dashboard/clinical-records" },
  engagement: { label: "Engagement", icon: Users, route: "/dashboard/doctors" },
};

export const ProfileCompletionCard = React.memo(() => {
  const { t } = useTranslation();
  const { data: metrics, isLoading } = useProfileCompletion();

  if (isLoading || !metrics) {
    return null;
  }

  // Show Emergency Health Card when profile is 100% complete
  if (metrics.percentage === 100) {
    return <EmergencyHealthCard />;
  }

  // Group missing fields by category
  const missingByCategory = metrics.missingFields.reduce<Record<string, string[]>>((acc, field) => {
    const cat = FIELD_CATEGORY[field] || "basic";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(field);
    return acc;
  }, {});

  const categoryOrder = ["basic", "health", "clinical", "engagement"];
  const activeMissingCategories = categoryOrder.filter((cat) => missingByCategory[cat]?.length);

  return (
    <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent dark:border-primary/20 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">{t("profileCompletion.completeProfile")}</CardTitle>
          </div>
          <div className="text-2xl font-bold text-primary">{metrics.percentage}%</div>
        </div>
        <CardDescription>
          {t("profileCompletion.completeMoreFields", { count: metrics.missingFields.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <Progress value={metrics.percentage} className="h-2.5" />
          <p className="text-xs text-muted-foreground">
            {t("profileCompletion.fieldsCompleted", { completed: metrics.completedFields.length, total: metrics.totalFields })}
          </p>
        </div>

        {/* Missing categories as actionable cards */}
        {activeMissingCategories.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("profileCompletion.missingInfo", "What's missing")}:</p>
            <div className="space-y-2">
              {activeMissingCategories.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const fields = missingByCategory[cat];
                const Icon = config.icon;

                return (
                  <Link key={cat} to={config.route} className="block">
                    <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group cursor-pointer border border-transparent hover:border-primary/20 press-feedback">
                      <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 text-primary shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">{config.label}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                          {fields.join(", ")}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs text-primary hover:text-primary gap-1 whitespace-nowrap">
                        {t("profileCompletion.complete", "Complete")}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Fields - collapsed summary */}
        {metrics.completedFields.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("common.completed", "Completed")}:</p>
            <div className="flex flex-wrap gap-1.5">
              {metrics.completedFields.map((field) => (
                <div
                  key={field}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs text-primary"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {field}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
