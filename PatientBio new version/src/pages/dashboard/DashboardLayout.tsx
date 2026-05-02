import { useEffect, Suspense } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { ContextualFAB } from "@/components/dashboard/ContextualFAB";
import { SwipeBackIndicator } from "@/components/dashboard/SwipeBackIndicator";
import { OfflineBanner } from "@/components/dashboard/OfflineBanner";
import { SyncIndicator } from "@/components/dashboard/SyncIndicator";
import { CriticalAlertOverlay } from "@/components/dashboard/CriticalAlertOverlay";
import { AppointmentReminderBanner } from "@/components/dashboard/AppointmentReminderBanner";
import { BiometricPrompt } from "@/components/dashboard/BiometricPrompt";
import { AppLockScreen } from "@/components/dashboard/AppLockScreen";
import { useAppLock } from "@/hooks/useAppLock";
import { QuickEmergencyCard } from "@/components/dashboard/QuickEmergencyCard";
import OnboardingTour from "@/components/dashboard/OnboardingTour";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DashboardLayoutContent = () => {
  const location = useLocation();
  const { state } = useSidebar();
  const { t } = useTranslation();
  const { isLocked, unlock } = useAppLock();
  const isSidebarCollapsed = state === "collapsed";

  const getPageTitle = (pathname: string) => {
    const titles: Record<string, string> = {
      "/dashboard": t("pageTitles.dashboard"),
      "/dashboard/profile": t("pageTitles.myProfile"),
      "/dashboard/health-data": t("pageTitles.healthData"),
      "/dashboard/prescriptions": t("pageTitles.myRecords"),
      "/dashboard/upload": t("pageTitles.uploadRecord"),
      "/dashboard/share": t("pageTitles.shareData"),
      "/dashboard/requests": t("pageTitles.dataRequests"),
      "/dashboard/wallet": t("pageTitles.myWallet"),
      "/dashboard/doctors": t("pageTitles.myDoctors"),
      "/dashboard/appointments": t("pageTitles.appointments"),
      "/dashboard/qr-code": t("pageTitles.myQRCode"),
      "/dashboard/lab-reports": t("pageTitles.labReports"),
      "/dashboard/pathologists": t("pageTitles.myPathologists"),
      "/dashboard/trends": t("pageTitles.healthTrends"),
      "/dashboard/access-analytics": t("pageTitles.accessAnalytics"),
      "/dashboard/notifications": t("pageTitles.notifications"),
      "/dashboard/family": t("pageTitles.familyMembers"),
      "/dashboard/consents": t("pageTitles.consentManagement"),
      "/dashboard/subscriptions": t("pageTitles.fhirSubscriptions"),
      "/dashboard/international": t("pageTitles.internationalData"),
      "/dashboard/data-integrity": t("pageTitles.dataIntegrity"),
      "/dashboard/research-preferences": t("pageTitles.researchPreferences"),
      "/dashboard/health-score": t("pageTitles.healthScore", "Health Score"),
      "/dashboard/clinical-records": t("pageTitles.clinicalRecords", "Clinical Records"),
    };
    if (titles[pathname]) return titles[pathname];
    if (pathname.startsWith("/dashboard/family/")) return t("pageTitles.familyMember");
    return t("pageTitles.patientDashboard");
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen flex w-full">
      <DashboardSidebar />
      <main className="flex-1 bg-muted/30 min-w-0">
        {/* Offline Banner (mobile) */}
        <OfflineBanner />
        {/* Top bar with trigger */}
        <header className="sticky top-0 z-[5] bg-background/80 backdrop-blur-md border-b border-border/50 pl-1 pr-3 sm:pr-4 md:pr-6 lg:pr-8 py-1.5 sm:py-3 safe-area-top">
          <div className="flex items-center justify-between gap-2 sm:gap-3 min-h-[44px] lg:min-h-0">
            <div className="flex items-center gap-1 min-w-0">
              <SidebarTrigger className="touch-target flex-shrink-0 -ml-1" />
              <h1 className="text-sm sm:text-lg md:text-xl font-semibold truncate">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <SyncIndicator />
              <GlobalSearchDialog />
              <div className="sm:hidden">
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content area - centered on large screens with ultrawide support */}
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 pb-20 lg:pb-10 safe-area-bottom">
          {/* Appointment reminder banner (mobile, dashboard home only) */}
          {/* Appointment reminder banner (mobile, dashboard home only) */}
          <AppointmentReminderBanner />
          <div key={location.pathname}>
            <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <Suspense fallback={<ContentLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
        
        {/* Contextual Floating Action Button */}
        <ContextualFAB />
        
        {/* Swipe-to-go-back edge indicator (mobile) */}
        <SwipeBackIndicator />
        
        {/* Critical alert full-screen overlay */}
        <CriticalAlertOverlay />
        
        {/* Biometric enrollment prompt (mobile, one-time) */}
        <BiometricPrompt />
        
        {/* App Lock Screen overlay */}
        {isLocked && <AppLockScreen onUnlock={unlock} />}
      </main>
    </div>
  );
};

const DashboardLayout = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  // Prefetch key patient dashboard data
  useEffect(() => {
    if (!user?.id) return;

    queryClient.prefetchQuery({
      queryKey: ["user-profile", user.id],
      queryFn: async () => {
        const { data } = await supabase.from("user_profiles").select("id, user_id, display_name, avatar_url, date_of_birth, gender, location, phone, notification_email_enabled, patient_passport_id, created_at, updated_at").eq("user_id", user.id).maybeSingle();
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["health-records", user.id, 0],
      queryFn: async () => {
        const { data } = await supabase.from("health_records").select("id, user_id, title, category, disease_category, file_url, file_type, file_size, is_encrypted, encryption_salt, encryption_iv, record_date, provider_name, description, notes, uploaded_at").eq("user_id", user.id).order("uploaded_at", { ascending: false }).range(0, 49);
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["doctor-connections", user.id],
      queryFn: async () => {
        const { data } = await supabase.from("doctor_connections").select("id, user_id, doctor_name, specialty, hospital_clinic, email, phone").eq("user_id", user.id);
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [user?.id, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <DashboardLayoutContent />
      <OnboardingTour />
    </SidebarProvider>
  );
};

export default DashboardLayout;
