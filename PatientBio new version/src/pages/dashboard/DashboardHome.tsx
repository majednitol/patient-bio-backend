import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useHealthData } from "@/hooks/useHealthData";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { useDoctorConnections } from "@/hooks/useDoctorConnections";
import { useMedicationLogs } from "@/hooks/useMedicationLogs";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ProfileCompletionCard } from "@/components/dashboard/ProfileCompletionCard";
import { HealthScoreGauge } from "@/components/dashboard/HealthScoreGauge";
import { WelcomeWizard } from "@/components/dashboard/WelcomeWizard";
import { SyncConflictsCard } from "@/components/dashboard/SyncConflictsCard";
import { SyncActivityTimeline } from "@/components/dashboard/SyncActivityTimeline";
import { OfflineBanner } from "@/components/dashboard/OfflineBanner";
import { SyncStatusBadge } from "@/components/pwa/SyncStatusBadge";
import { SymptomPreScreener } from "@/components/dashboard/SymptomPreScreener";
import { WaitTimeHistoryBadge } from "@/components/dashboard/WaitTimeHistoryBadge";
import { ActiveAccessCard } from "@/components/dashboard/ActiveAccessCard";
import { DashboardStatsCards } from "@/components/dashboard/DashboardStatsCards";
import { PatientPWAInstallBanner } from "@/components/dashboard/PatientPWAInstallBanner";
import { StaggeredList, StaggeredItem } from "@/components/ui/StaggeredList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import {
  FileText,
  Upload,
  Share2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Pill,
  Copy,
  Droplets,
  AlertTriangle,
  Heart,
  CalendarDays,
  ChevronDown,
  Sparkles,
  MessageSquare,
  Download,
} from "lucide-react";

// Lazy-load below-the-fold heavy cards
const VisitSummaryCard = lazy(() => import("@/components/dashboard/VisitSummaryCard").then(m => ({ default: m.VisitSummaryCard })));
const PatientSpendingOverview = lazy(() => import("@/components/dashboard/PatientSpendingOverview").then(m => ({ default: m.PatientSpendingOverview })));
const CostForecastCard = lazy(() => import("@/components/dashboard/CostForecastCard").then(m => ({ default: m.CostForecastCard })));
const InsuranceCoverageCard = lazy(() => import("@/components/dashboard/InsuranceCoverageCard").then(m => ({ default: m.InsuranceCoverageCard })));

const CardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-56 mt-1" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-32 w-full" />
    </CardContent>
  </Card>
);

const FIRST_LOGIN_KEY = "patient-bio-first-login-done";

const DashboardHome = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [showWizard, setShowWizard] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const isFirstLogin = !localStorage.getItem(FIRST_LOGIN_KEY) || searchParams.get("firstLogin") === "true";
    if (isFirstLogin) {
      setShowWizard(true);
      localStorage.setItem(FIRST_LOGIN_KEY, "true");
      if (searchParams.get("firstLogin")) {
        searchParams.delete("firstLogin");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, []);
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const { toast } = useToast();
  const { healthData, loading: healthLoading } = useHealthData();
  const { records, isLoading: recordsLoading } = useHealthRecords();
  const { doctors, isLoading: doctorsLoading } = useDoctorConnections();
  const { getPendingCount, todayLogs } = useMedicationLogs();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.goodMorning");
    if (hour < 17) return t("dashboard.goodAfternoon");
    return t("dashboard.goodEvening");
  };

  const displayName = profileLoading ? null : (profile?.display_name || user?.email?.split("@")[0] || "there");

  const checklistLoading = profileLoading || healthLoading || recordsLoading || doctorsLoading;

  const checklistItems = [
    {
      id: "profile",
      label: t("dashboard.completeProfile"),
      completed: !!profile?.display_name,
      link: "/dashboard/profile",
    },
    {
      id: "health",
      label: t("dashboard.addHealthInfo"),
      completed: !!healthData?.blood_group,
      link: "/dashboard/health-data",
    },
    {
      id: "record",
      label: t("dashboard.uploadFirstRecord"),
      completed: records.length > 0,
      link: "/dashboard/upload",
    },
    {
      id: "doctor",
      label: t("dashboard.addFirstProvider"),
      completed: doctors.length > 0,
      link: "/dashboard/doctors",
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const progressPercent = (completedCount / checklistItems.length) * 100;
  const pendingMedCount = getPendingCount();

  const quickActions = [
    {
      title: t("triageEngine.title", "Find Best Doctor"),
      description: t("triageEngine.quickActionDesc", "AI-powered symptom triage & doctor matching"),
      icon: Sparkles,
      link: "/dashboard/find-best-doctor",
    },
    {
      title: t("dashboard.uploadRecord"),
      description: t("dashboard.uploadRecordDesc"),
      icon: Upload,
      link: "/dashboard/upload",
    },
    {
      title: t("dashboard.shareData"),
      description: t("dashboard.shareDataDesc"),
      icon: Share2,
      link: "/dashboard/share",
    },
    {
      title: t("dashboard.viewRecords"),
      description: t("dashboard.viewRecordsDesc"),
      icon: FileText,
      link: "/dashboard/prescriptions",
    },
    {
      title: t("mobileNav.appointments"),
      description: t("dashboard.quickActions"),
      icon: CalendarDays,
      link: "/dashboard/appointments",
    },
    {
      title: "Messages",
      description: "Chat with your doctors",
      icon: MessageSquare,
      link: "/dashboard/messages",
    },
    {
      title: "Health Summary",
      description: "Download your health PDF",
      icon: Download,
      link: "/dashboard/health-data",
    },
  ];

  const allergiesCount = healthData?.health_allergies
    ? healthData.health_allergies.split(",").filter(Boolean).length
    : 0;
  const medicationsCount = healthData?.current_medications
    ? healthData.current_medications.split(",").filter(Boolean).length
    : 0;

  const handleCopyPassportId = () => {
    if (profile?.patient_passport_id) {
      navigator.clipboard.writeText(profile.patient_passport_id);
      toast({ title: t("common.copied"), description: t("dashboard.copiedPassportId") });
    }
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="overflow-y-auto">
      <div className="space-y-3 sm:space-y-6 md:space-y-8 relative">
      <PatientPWAInstallBanner />
      <WelcomeWizard open={showWizard} onClose={() => setShowWizard(false)} />

      {/* Welcome Section */}
      <div className="animate-fade-in bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent rounded-xl sm:rounded-2xl p-2.5 sm:p-6 md:p-8">
        <div className="flex flex-col gap-1.5 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl md:text-3xl font-bold truncate">
              {getGreeting()}, {displayName ?? <Skeleton className="inline-block h-5 w-24 sm:h-7 sm:w-32 align-middle" />}! 👋
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-muted-foreground text-[10px] sm:text-base">
                {t("dashboard.healthAtGlance")}
              </p>
              <WaitTimeHistoryBadge />
               <OfflineBanner />
              <SyncStatusBadge />
            </div>
            {profile?.patient_passport_id && (
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[9px] sm:text-xs text-muted-foreground">{t("dashboard.passportId")}:</span>
                <code className="text-[9px] sm:text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{profile.patient_passport_id}</code>
                <button
                  onClick={handleCopyPassportId}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={t("dashboard.copyPassportId")}
                >
                  <Copy className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                </button>
              </div>
            )}
          </div>
          <Link to="/dashboard/upload" className="hidden sm:flex flex-col items-center gap-1 group w-full sm:w-auto">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-primary">{t("dashboard.uploadRecord")}</span>
          </Link>
        </div>
      </div>

      {/* Health at a Glance — press-feedback on mobile */}
      {healthLoading ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-1.5 sm:p-4 flex items-center gap-1.5 sm:gap-3">
              <Skeleton className="h-6 w-6 sm:h-10 sm:w-10 rounded-lg shrink-0" />
              <div className="min-w-0 space-y-1">
                <Skeleton className="h-2 w-8 sm:h-3 sm:w-12" />
                <Skeleton className="h-3 w-6 sm:h-5 sm:w-10" />
              </div>
            </Card>
          ))}
        </div>
      ) : healthData && (
        <StaggeredList className="grid grid-cols-3 gap-1.5 sm:gap-4" staggerDelay={0.06}>
          <StaggeredItem>
            <Card className="p-1.5 sm:p-4 flex items-center gap-1.5 sm:gap-3 press-feedback dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <div className="p-1 sm:p-2 rounded-lg bg-destructive/10">
                <Droplets className="h-3 w-3 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-xs text-muted-foreground">{t("dashboard.blood")}</p>
                <p className="font-semibold text-[11px] sm:text-base truncate">{healthData.blood_group || "—"}</p>
              </div>
            </Card>
          </StaggeredItem>
          <StaggeredItem>
            <Card className="p-1.5 sm:p-4 flex items-center gap-1.5 sm:gap-3 press-feedback dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <div className="p-1 sm:p-2 rounded-lg bg-accent/10">
                <AlertTriangle className="h-3 w-3 sm:h-5 sm:w-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-xs text-muted-foreground">{t("dashboard.allergies")}</p>
                <p className="font-semibold text-[11px] sm:text-base">{allergiesCount > 0 ? allergiesCount : t("common.none")}</p>
              </div>
            </Card>
          </StaggeredItem>
          <StaggeredItem>
            <Card className="p-1.5 sm:p-4 flex items-center gap-1.5 sm:gap-3 press-feedback dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <div className="p-1 sm:p-2 rounded-lg bg-primary/10">
                <Heart className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-xs text-muted-foreground">{t("dashboard.meds")}</p>
                <p className="font-semibold text-[11px] sm:text-base">{medicationsCount > 0 ? medicationsCount : t("common.none")}</p>
              </div>
            </Card>
          </StaggeredItem>
        </StaggeredList>
      )}

      {/* AI Symptom Pre-Screener */}
      <SymptomPreScreener />

      {/* Desktop Two-Column Layout */}
      <div className="desktop-two-col">
        {/* Main Content Column */}
        <div className="space-y-3 sm:space-y-6">
          <DashboardStatsCards />

          {/* Getting Started Checklist */}
          {checklistLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-2 w-full mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : completedCount < checklistItems.length ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
                <CardTitle className="text-sm sm:text-lg">{t("dashboard.gettingStarted")}</CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">
                  {t("dashboard.gettingStartedDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-1 sm:pt-2">
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-1.5 sm:h-2 mb-2 sm:mb-4">
                  <div
                    className="bg-gradient-to-r from-primary to-secondary h-1.5 sm:h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] sm:text-sm text-muted-foreground mb-2 sm:mb-4">
                  {completedCount} {t("common.of")} {checklistItems.length} {t("common.completed")}
                </p>

                {/* Checklist — horizontal snap-scroll on mobile, grid on desktop */}
                <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:pb-0 lg:mx-0 lg:px-0 scrollbar-none">
                  {checklistItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.link}
                      className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-background border border-border/50 hover:border-primary/50 transition-colors group press-feedback snap-start min-w-[200px] lg:min-w-0 flex-shrink-0 lg:flex-shrink"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span
                          className={cn(
                            "text-xs sm:text-base whitespace-nowrap lg:whitespace-normal",
                            item.completed
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          )}
                        >
                          {item.label}
                        </span>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-1.5" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Mobile: Show key sidebar cards inline */}
          <div className="lg:hidden space-y-3">
            <HealthScoreGauge />
            <ActiveAccessCard />
          </div>

          {/* Quick Actions — 2x2 grid on mobile, 4-col on desktop */}
          <div>
            <h2 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-4">{t("dashboard.quickActions")}</h2>
            <StaggeredList className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4" staggerDelay={0.05} initialDelay={0.1}>
              {quickActions.map((action) => (
                <StaggeredItem key={action.title}>
                  <Link to={action.link}>
                    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group press-feedback h-full dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                      <CardContent className="p-3 sm:p-6 flex flex-col items-center text-center">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center mb-1.5 sm:mb-3 group-hover:scale-110 transition-transform duration-200">
                          <action.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors text-xs sm:text-base leading-tight">
                          {action.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                          {action.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </StaggeredItem>
              ))}
            </StaggeredList>
          </div>

          {/* Recent Activity Feed */}
          <RecentActivityFeed />

          {/* Below-the-fold lazy-loaded cards */}
          <Suspense fallback={<CardSkeleton />}>
            <VisitSummaryCard />
          </Suspense>

          <Suspense fallback={<CardSkeleton />}>
            <PatientSpendingOverview />
          </Suspense>

          {/* Collapsible lower-priority cards on mobile */}
          {isMobile ? (
            <Collapsible open={showMore} onOpenChange={setShowMore}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center gap-2 text-muted-foreground">
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showMore && "rotate-180")} />
                  {showMore ? t("common.showLess", "Show less") : t("common.showMore", "Show more")}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3">
                <Suspense fallback={<CardSkeleton />}>
                  <CostForecastCard />
                </Suspense>
                <Suspense fallback={<CardSkeleton />}>
                  <InsuranceCoverageCard />
                </Suspense>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <>
              <Suspense fallback={<CardSkeleton />}>
                <CostForecastCard />
              </Suspense>
              <Suspense fallback={<CardSkeleton />}>
                <InsuranceCoverageCard />
              </Suspense>
            </>
          )}
        </div>

        {/* Right Sidebar Column (desktop only) */}
        <div className="hidden lg:block space-y-4 sm:space-y-6">
          <HealthScoreGauge />
          <ActiveAccessCard />
          <SyncConflictsCard />
          <SyncActivityTimeline />
          <ProfileCompletionCard />

          {todayLogs.length > 0 && (
            <Link to="/dashboard/trends">
              <Card className="hover:shadow-md transition-all border-primary/20 bg-primary/5 cursor-pointer dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {pendingMedCount > 0
                          ? t("dashboard.medicationsDue", { count: pendingMedCount })
                          : t("dashboard.allMedsTaken")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.scheduledToday", { count: todayLogs.length })}
                      </p>
                    </div>
                  </div>
                  {pendingMedCount > 0 && (
                    <Badge variant="default" className="bg-primary">
                      {pendingMedCount} {t("common.due")}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
      </div>
    </PullToRefresh>
  );
};

export default DashboardHome;
