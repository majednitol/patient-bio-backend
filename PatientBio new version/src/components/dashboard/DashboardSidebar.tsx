import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, User, Heart, FileText, Upload, Send, Users, QrCode, LogOut, Sparkles,
  CalendarDays, Inbox, Wallet, BarChart3, Bell, Activity, Shield, Globe, Webhook, Microscope, Settings, FlaskConical,
  Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useHealthDataCompletion } from "@/hooks/useHealthDataCompletion";
import { useHealthTrendsCompletion } from "@/hooks/useHealthTrendsCompletion";
import { useClinicalCompleteness } from "@/components/clinical/ClinicalCompletenessRing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useDataRequests } from "@/hooks/useDataRequests";
import { useUnseenTransactions } from "@/hooks/useUnseenTransactions";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useTranslation } from "react-i18next";

const KEYBOARD_SHORTCUTS: Record<string, string> = {
  "/dashboard": "⌘1",
  "/dashboard/profile": "⌘2",
  "/dashboard/prescriptions": "⌘3",
  "/dashboard/upload": "⌘U",
  "/dashboard/share": "⌘S",
};

const PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/dashboard/DashboardHome"),
  "/dashboard/profile": () => import("@/pages/dashboard/ProfilePage"),
  "/dashboard/health-data": () => import("@/pages/dashboard/HealthDataPage"),
  "/dashboard/trends": () => import("@/pages/dashboard/HealthTrendsPage"),
  "/dashboard/prescriptions": () => import("@/pages/dashboard/PrescriptionsPage"),
  "/dashboard/lab-reports": () => import("@/pages/dashboard/PatientLabReportsPage"),
  "/dashboard/upload": () => import("@/pages/dashboard/UploadPage"),
  "/dashboard/share": () => import("@/pages/dashboard/ShareDataPage"),
  "/dashboard/requests": () => import("@/pages/dashboard/DataRequestsPage"),
  "/dashboard/consents": () => import("@/pages/dashboard/ConsentManagementPage"),
  "/dashboard/access-analytics": () => import("@/pages/dashboard/AccessAnalyticsPage"),
  "/dashboard/subscriptions": () => import("@/pages/dashboard/FHIRSubscriptionsPage"),
  "/dashboard/international": () => import("@/pages/dashboard/InternationalDataPage"),
  "/dashboard/doctors": () => import("@/pages/dashboard/MyDoctorsPage"),
  "/dashboard/pathologists": () => import("@/pages/dashboard/MyPathologistsPage"),
  "/dashboard/appointments": () => import("@/pages/dashboard/AppointmentsPage"),
  "/dashboard/family": () => import("@/pages/dashboard/FamilyMembersPage"),
  "/dashboard/wallet": () => import("@/pages/dashboard/WalletPage"),
  "/dashboard/notifications": () => import("@/pages/dashboard/NotificationsPage"),
  "/dashboard/qr-code": () => import("@/pages/dashboard/QRCodePage"),
  "/dashboard/settings": () => import("@/pages/dashboard/SettingsPage"),
  "/dashboard/anonymous-sharing": () => import("@/pages/dashboard/AnonymousSharingPage"),
  "/dashboard/clinical-records": () => import("@/pages/dashboard/ClinicalRecordsPage"),
};

const prefetchedRoutes = new Set<string>();
const handlePrefetch = (url: string) => {
  if (prefetchedRoutes.has(url)) return;
  const loader = PREFETCH_MAP[url];
  if (loader) { prefetchedRoutes.add(url); loader(); }
};

const VISITED_PAGES_KEY = "patient-bio-visited-pages";
const getVisitedPages = (): Set<string> => {
  try { const stored = localStorage.getItem(VISITED_PAGES_KEY); return stored ? new Set(JSON.parse(stored)) : new Set(["/dashboard"]); } catch { return new Set(["/dashboard"]); }
};
const markPageVisited = (url: string) => {
  const visited = getVisitedPages(); visited.add(url); localStorage.setItem(VISITED_PAGES_KEY, JSON.stringify([...visited]));
};

export const DashboardSidebar = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const { pendingCount } = useDataRequests();
  const { unseenCount: unseenWalletCount } = useUnseenTransactions();
  const { data: profileMetrics } = useProfileCompletion();
  const { percentage: healthDataPct, isLoading: hdLoading } = useHealthDataCompletion();
  const { percentage: healthTrendsPct, isLoading: htLoading } = useHealthTrendsCompletion();
  const { score: clinicalPct, isLoading: clLoading } = useClinicalCompleteness();
  const isCollapsed = state === "collapsed";
  const { logoUrl } = usePlatformSettings();
  const [visitedPages, setVisitedPages] = useState<Set<string>>(getVisitedPages);

  // Collapsible groups use translated labels — need a stable key
  const COLLAPSED_BY_DEFAULT = new Set(["interoperability", "account"]);

  const navGroups = [
    { key: "main", label: t("sidebar.main"), items: [
      { title: t("sidebar.dashboard"), url: "/dashboard", icon: Home },
    ]},
    { key: "myProfile", label: t("sidebar.myProfile"), items: [
      { title: t("sidebar.basicInfo"), url: "/dashboard/profile", icon: User, tourId: "tour-profile-link" },
      { title: t("sidebar.healthData"), url: "/dashboard/health-data", icon: Heart },
      { title: t("sidebar.healthTrends"), url: "/dashboard/trends", icon: Activity, tourId: "tour-health-trends-link" },
      { title: t("sidebar.clinicalRecords", "Clinical Records"), url: "/dashboard/clinical-records", icon: FileText },
    ]},
    { key: "medicalRecords", label: t("sidebar.medicalRecords"), items: [
      { title: t("sidebar.prescriptions"), url: "/dashboard/prescriptions", icon: FileText },
      { title: t("sidebar.labReports"), url: "/dashboard/lab-reports", icon: Microscope },
      { title: t("sidebar.uploadFile"), url: "/dashboard/upload", icon: Upload, tourId: "tour-upload-link" },
    ]},
    { key: "dataSharing", label: t("sidebar.dataSharing"), items: [
      { title: t("sidebar.shareData"), url: "/dashboard/share", icon: Send, tourId: "tour-share-link" },
      { title: t("sidebar.dataRequests"), url: "/dashboard/requests", icon: Inbox },
      { title: t("sidebar.consentMgmt"), url: "/dashboard/consents", icon: Shield },
      { title: t("sidebar.anonymousSharing"), url: "/dashboard/anonymous-sharing", icon: FlaskConical },
    ]},
    { key: "interoperability", label: t("sidebar.interoperability"), items: [
      { title: t("sidebar.accessAnalytics"), url: "/dashboard/access-analytics", icon: BarChart3 },
      { title: t("sidebar.fhirSubs"), url: "/dashboard/subscriptions", icon: Webhook },
      { title: t("sidebar.international"), url: "/dashboard/international", icon: Globe },
    ]},
    { key: "connections", label: t("sidebar.connections"), items: [
      { title: t("sidebar.findDoctor", "Find a Doctor"), url: "/dashboard/find-doctor", icon: Search },
      { title: t("sidebar.myDoctors"), url: "/dashboard/doctors", icon: Users },
      { title: t("sidebar.myPathologists"), url: "/dashboard/pathologists", icon: Microscope },
      { title: t("sidebar.appointments"), url: "/dashboard/appointments", icon: CalendarDays, tourId: "tour-appointments-link" },
      { title: t("sidebar.familyMembers"), url: "/dashboard/family", icon: Heart },
    ]},
    { key: "account", label: t("sidebar.account"), items: [
      { title: t("sidebar.myWallet"), url: "/dashboard/wallet", icon: Wallet },
      { title: t("sidebar.notifications"), url: "/dashboard/notifications", icon: Bell },
      { title: t("sidebar.healthPassport"), url: "/dashboard/qr-code", icon: Shield, tourId: "tour-qr-link" },
      { title: t("sidebar.settings"), url: "/dashboard/settings", icon: Settings },
    ]},
  ];

  useEffect(() => { markPageVisited(location.pathname); setVisitedPages(getVisitedPages()); }, [location.pathname]);

  const isActive = (path: string) => path === "/dashboard" ? location.pathname === "/dashboard" : location.pathname.startsWith(path);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: t("auth.signedOut"), description: t("auth.signedOutDesc") });
  };

  const handleNavClick = () => { setOpenMobile(false); };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 dark:border-border/60 lg:w-72">
      <SidebarHeader className="bg-gradient-to-br from-primary to-secondary p-3 sm:p-4 overflow-hidden">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Platform logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
          )}
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-white font-bold text-base sm:text-lg">Patient Bio</span>
              <span className="text-white/70 text-xs truncate">{user?.email}</span>
            </div>
          )}
          {!isCollapsed && (
            <div className="flex-shrink-0 [&_button]:text-white [&_button:hover]:bg-white/20 hidden sm:block">
              <NotificationBell />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-card">
        {navGroups.map((group) => {
          const isCollapsibleGroup = COLLAPSED_BY_DEFAULT.has(group.key);
          const hasActiveItem = group.items.some((item) => isActive(item.url));

          const groupContent = (
            <SidebarMenu>
              {group.items.map((item) => {
                const hasBadge = item.url === "/dashboard/requests" && pendingCount > 0;
                const hasWalletBadge = item.url === "/dashboard/wallet" && unseenWalletCount > 0;
                const hasProfileBadge = item.url === "/dashboard/profile" && profileMetrics && profileMetrics.percentage < 100;
                const completionBadgeMap: Record<string, number | undefined> = {
                  "/dashboard/health-data": !hdLoading ? healthDataPct : undefined,
                  "/dashboard/trends": !htLoading ? healthTrendsPct : undefined,
                  "/dashboard/clinical-records": !clLoading ? clinicalPct : undefined,
                };
                const completionPct = completionBadgeMap[item.url];
                const hasCompletionBadge = completionPct !== undefined && completionPct < 100;
                const shortcut = KEYBOARD_SHORTCUTS[item.url];
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} onClick={handleNavClick} onMouseEnter={() => handlePrefetch(item.url)} onTouchStart={() => handlePrefetch(item.url)} data-tour-id={item.tourId}
                        className={cn("flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg transition-colors touch-target",
                          isActive(item.url) ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80"
                        )}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {shortcut && !isCollapsed && <span className="hidden lg:inline-flex text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded font-mono">{shortcut}</span>}
                        {hasBadge && <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs font-medium px-1">{pendingCount > 9 ? "9+" : pendingCount}</span>}
                        {hasWalletBadge && <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-xs font-medium px-1">{unseenWalletCount > 9 ? "9+" : unseenWalletCount}</span>}
                        {hasProfileBadge && <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-accent text-accent-foreground text-xs font-medium px-1">{profileMetrics.percentage}%</span>}
                        {hasCompletionBadge && <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-accent text-accent-foreground text-xs font-medium px-1">{completionPct}%</span>}
                        {!visitedPages.has(item.url) && !hasBadge && !hasWalletBadge && !hasProfileBadge && !hasCompletionBadge && <span className="h-2 w-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          );

          if (isCollapsibleGroup && !isCollapsed) {
            return (
              <SidebarGroup key={group.key}>
                <Collapsible defaultOpen={hasActiveItem}>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between w-full cursor-pointer hover:text-foreground transition-colors">
                      {group.label}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent><SidebarGroupContent>{groupContent}</SidebarGroupContent></CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={group.key}>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>{groupContent}</SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="bg-card border-t border-border/50 dark:border-border/60 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" className="justify-start gap-3 text-muted-foreground hover:text-destructive touch-target flex-shrink-0" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>{t("auth.signOut")}</span>}
          </Button>
          {!isCollapsed && (
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-[10px] font-bold"
              onClick={() => i18n.changeLanguage(i18n.language === "en" ? "bn" : "en")}
            >
              {i18n.language === "en" ? "BN" : "EN"}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
