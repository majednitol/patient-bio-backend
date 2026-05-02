import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  QrCode, 
  LogOut, 
  FlaskConical,
  Users,
  Upload,
  BarChart3,
  TrendingUp,
  Sparkles,
  ChevronDown,
  BookOpen,
  GitCompareArrows,
  ShieldCheck,
  ClipboardList,
  Globe,
  Key,
  Brain,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useResearcherProfile } from "@/hooks/useResearcherProfile";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COLLAPSED_BY_DEFAULT = new Set(["account"]);

export const ResearcherSidebar = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { state, setOpenMobile, isMobile, openMobile } = useSidebar();
  const { profile } = useResearcherProfile();
  const { pendingCount } = usePatientResearcherShares();
  const isCollapsed = state === "collapsed" && !(isMobile && openMobile);
  const { logoUrl } = usePlatformSettings();

  const navGroups = [
    {
      labelKey: "overview",
      items: [
        { titleKey: "dashboard", url: "/researcher", icon: LayoutDashboard },
        { titleKey: "analytics", url: "/researcher/analytics", icon: BarChart3 },
        { titleKey: "crossStudyAnalytics", url: "/researcher/cross-study-analytics", icon: TrendingUp },
      ],
    },
    {
      labelKey: "research",
      items: [
        { titleKey: "researchData", url: "/researcher/data", icon: FileText },
        { titleKey: "studyProtocols", url: "/researcher/studies", icon: ClipboardList },
        { titleKey: "studyNotes", url: "/researcher/notes", icon: BookOpen },
        { titleKey: "cohortBuilder", url: "/researcher/cohort", icon: Users },
        { titleKey: "cohortComparison", url: "/researcher/cohort-compare", icon: GitCompareArrows },
        { titleKey: "dataQuality", url: "/researcher/data-quality", icon: ShieldCheck },
        { titleKey: "visualizationStudio", url: "/researcher/visualization", icon: Sparkles },
        { titleKey: "publicationTracker", url: "/researcher/publications", icon: FileText },
        { titleKey: "globalDataPool", url: "/researcher/global-pool", icon: Globe },
        { titleKey: "dataCatalog", url: "/researcher/data-catalog", icon: Globe },
        { titleKey: "dataGovernance", url: "/researcher/data-governance", icon: ShieldCheck },
        { titleKey: "literatureSearch", url: "/researcher/literature", icon: BookOpen },
        { titleKey: "outcomePredictor", url: "/researcher/outcome-predictor", icon: Brain },
        { titleKey: "collaboration", url: "/researcher/collaboration", icon: MessageSquare },
      ],
    },
    {
      labelKey: "tools",
      items: [
        { titleKey: "importData", url: "/researcher/import", icon: Upload },
        { titleKey: "apiAccess", url: "/researcher/api-access", icon: Key },
        { titleKey: "qrCode", url: "/researcher/qr-code", icon: QrCode },
      ],
    },
    {
      labelKey: "account",
      items: [
        { titleKey: "profile", url: "/researcher/profile", icon: User },
      ],
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log("Sign out completed");
    }
    toast({
      title: t("researcherSidebar.signedOut"),
      description: t("researcherSidebar.signedOutDesc"),
    });
    window.location.href = "/";
  };

  const isActive = (path: string) => {
    if (path === "/researcher") {
      return location.pathname === "/researcher";
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-research-muted dark:border-research-primary/30">
      <SidebarHeader className="bg-gradient-to-r from-research-primary to-accent p-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Platform logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm">
              <FlaskConical className="h-6 w-6 text-white" />
            </div>
          )}
          {!isCollapsed && (
            <span className="text-white font-bold text-lg">{t("researcherSidebar.researchLab")}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-card px-2 py-3">
        {navGroups.map((group) => {
          const isCollapsibleGroup = COLLAPSED_BY_DEFAULT.has(group.labelKey);
          const hasActiveItem = group.items.some((item) => isActive(item.url));
          const groupLabel = t(`researcherSidebar.${group.labelKey}`);

          const groupContent = (
            <SidebarMenu>
              {group.items.map((item) => {
                const active = isActive(item.url);
                const title = t(`researcherSidebar.${item.titleKey}`);
                const showBadge = item.titleKey === "researchData" && pendingCount > 0;
                return (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild isActive={active} tooltip={title}>
                      <Link
                        to={item.url}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          active
                            ? "bg-research-muted dark:bg-research-primary/30 text-research-primary dark:text-accent font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-research-muted/50 dark:hover:bg-research-primary/20 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          active ? "bg-research-primary/15 dark:bg-research-primary/50" : "bg-transparent"
                        )}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </div>
                        <span className="flex-1">{title}</span>
                        {showBadge && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-research-primary text-white text-xs font-medium px-1.5 shadow-sm">
                            {pendingCount > 9 ? "9+" : pendingCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          );

          if (isCollapsibleGroup && !isCollapsed) {
            return (
              <SidebarGroup key={group.labelKey}>
                <Collapsible defaultOpen={hasActiveItem}>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between w-full cursor-pointer hover:text-foreground transition-colors">
                      {groupLabel}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarGroupContent>{groupContent}</SidebarGroupContent>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {groupLabel}
              </SidebarGroupLabel>
              <SidebarGroupContent>{groupContent}</SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="bg-card border-t border-research-muted dark:border-research-primary/30 p-4">
        {!isCollapsed && profile?.full_name && (
          <div className="mb-3 px-2 py-2 rounded-lg bg-research-muted/50 dark:bg-research-primary/20">
            <p className="text-xs text-muted-foreground">{t("researcherSidebar.loggedInAs")}</p>
            <p className="text-sm font-medium text-foreground truncate">{profile.full_name}</p>
            <p className="text-xs text-research-primary dark:text-accent">{t("researcherSidebar.researchLab")}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>{t("researcherSidebar.signOut")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};