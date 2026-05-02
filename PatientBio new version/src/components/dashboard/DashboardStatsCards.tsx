import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Users, Eye, Heart, TrendingUp, Clock } from "lucide-react";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { useDoctorConnections } from "@/hooks/useDoctorConnections";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { useHealthData } from "@/hooks/useHealthData";
import { useAccessAnalytics } from "@/hooks/useAccessAnalytics";
import { subDays, isAfter } from "date-fns";

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  link: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  loading?: boolean;
}

const StatsCard = ({ title, value, description, icon: Icon, link, trend, loading }: StatsCardProps) => {
  if (loading) {
    return (
      <Card className="hover:shadow-md transition-shadow dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-3 sm:p-6">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <Skeleton className="h-7 w-12 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow active:bg-muted/30 group dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <Link to={link}>
        <CardHeader className="flex flex-row items-center justify-between pb-0.5 sm:pb-2 p-2 sm:p-6">
          <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground pr-1 leading-tight">
            {title}
          </CardTitle>
          <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
        </CardHeader>
        <CardContent className="p-2 pt-0 sm:p-6 sm:pt-0">
          <div className="text-base sm:text-2xl font-bold">{value}</div>
          <p className="text-[9px] sm:text-xs text-muted-foreground mt-0 sm:mt-1 leading-tight">
            {description}
          </p>
          {trend && trend.value !== 0 && (
            <Badge
              variant="secondary"
              className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 sm:py-0.5 mt-1 inline-flex ${
                trend.positive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <TrendingUp className={`h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5 ${!trend.positive ? "rotate-180" : ""}`} />
              {trend.value} {trend.label}
            </Badge>
          )}
        </CardContent>
      </Link>
    </Card>
  );
};

export const DashboardStatsCards = React.memo(() => {
  const { t } = useTranslation();
  const { records, isLoading: recordsLoading } = useHealthRecords();
  const { doctors, isLoading: doctorsLoading } = useDoctorConnections();
  const { tokens } = useAccessTokens();
  const { healthData, loading: healthLoading } = useHealthData();
  const { analytics, isLoading: analyticsLoading } = useAccessAnalytics({ dateRange: "7" });

  const isLoading = recordsLoading || doctorsLoading || healthLoading || analyticsLoading;

  // Calculate this week's stats
  const oneWeekAgo = subDays(new Date(), 7);
  
  // Records uploaded this week
  const recordsThisWeek = records.filter(
    (r) => isAfter(new Date(r.uploaded_at || ""), oneWeekAgo)
  ).length;

  // Total views and views this week
  const totalViews = tokens.reduce((sum, t) => sum + (t.access_count || 0), 0);
  const activeLinks = tokens.filter(
    (t) => !t.is_revoked && new Date(t.expires_at) > new Date()
  ).length;

  // Accesses this week from analytics
  const accessesThisWeek = analytics.totalAccesses;

  const statsCards = [
    {
      title: t("statsCards.healthRecords"),
      value: records.length.toString(),
      description: records.length === 0 
        ? t("statsCards.noDocumentsYet") 
        : t("statsCards.documentsStored", { count: records.length }),
      icon: FileText,
      link: "/dashboard/prescriptions",
      trend: recordsThisWeek > 0 
        ? { value: recordsThisWeek, label: t("statsCards.thisWeek"), positive: true } 
        : undefined,
    },
    {
      title: t("statsCards.myDoctors"),
      value: doctors.length.toString(),
      description: doctors.length === 0 
        ? t("statsCards.noProvidersYet") 
        : t("statsCards.providersSaved", { count: doctors.length }),
      icon: Users,
      link: "/dashboard/doctors",
    },
    {
      title: t("statsCards.dataAccess"),
      value: totalViews.toString(),
      description: activeLinks > 0 
        ? t("statsCards.activeLink", { count: activeLinks }) 
        : t("statsCards.noViewsYet"),
      icon: Eye,
      link: "/dashboard/access-analytics",
      trend: accessesThisWeek > 0 
        ? { value: accessesThisWeek, label: t("statsCards.thisWeek"), positive: true } 
        : undefined,
    },
    {
      title: t("statsCards.healthData"),
      value: healthData ? t("statsCards.added") : t("statsCards.notSet"),
      description: healthData?.blood_group || t("statsCards.addYourDetails"),
      icon: Heart,
      link: "/dashboard/health-data",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4">
      {statsCards.map((card) => (
        <StatsCard key={card.title} {...card} loading={isLoading} />
      ))}
    </div>
  );
});
