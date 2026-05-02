import { LayoutDashboard, Users, UserCog, FileText, Mail, LogOut, Share2, Activity, Building2, Settings, History, Shield, ShieldCheck, FileCheck, ChevronDown, BookOpen, HardDrive, Hash, Newspaper, TrendingUp } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { state, setOpenMobile, isMobile, openMobile } = useSidebar();
  const collapsed = state === "collapsed" && !(isMobile && openMobile);
  const { logoUrl } = usePlatformSettings();
  const { t } = useTranslation();

  const menuItems = [
    { title: t("adminSidebar.dashboard"), url: "/admin", icon: LayoutDashboard },
    { title: t("adminSidebar.users"), url: "/admin/users", icon: Users },
    { title: t("adminSidebar.hospitals"), url: "/admin/hospitals", icon: Building2 },
    { title: t("adminSidebar.team"), url: "/admin/team", icon: UserCog },
    { title: t("adminSidebar.content"), url: "/admin/content", icon: FileText },
    { title: t("adminSidebar.messages"), url: "/admin/messages", icon: Mail },
    { title: t("adminSidebar.settings"), url: "/admin/settings", icon: Settings },
    { title: t("adminSidebar.guidelines"), url: "/admin/guidelines", icon: BookOpen },
    { title: t("adminSidebar.blog", "Blog"), url: "/admin/blog", icon: Newspaper },
  ];

  const analyticsItems = [
    { title: t("adminSidebar.sharedData"), url: "/admin/shared-data", icon: Share2 },
    { title: t("adminSidebar.diseaseAnalytics"), url: "/admin/disease-analytics", icon: Activity },
    { title: t("adminSidebar.systemHealth"), url: "/admin/system-health", icon: Activity },
    { title: "Doctor Demand", url: "/admin/doctor-demand", icon: TrendingUp },
  ];

  const securityItems = [
    { title: t("adminSidebar.verifications"), url: "/admin/verifications", icon: ShieldCheck },
    { title: t("adminSidebar.auditLogs"), url: "/admin/audit-logs", icon: History },
    { title: t("adminSidebar.compliance"), url: "/admin/compliance", icon: FileCheck },
    { title: "Blockchain Explorer", url: "/admin/blockchain-explorer", icon: Hash },
    { title: "Data Backup", url: "/admin/backup", icon: HardDrive },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("adminSidebar.signedOut"));
    navigate("/");
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-border">
      <SidebarHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Platform logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm">
              <Shield className="h-6 w-6 text-white" />
            </div>
          )}
          {!collapsed && (
            <span className="text-white font-bold text-lg">{t("adminSidebar.adminPortal")}</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-card px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("adminSidebar.management")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          active
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          active ? "bg-purple-600/15 dark:bg-purple-600/30" : "bg-transparent"
                        )}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </div>
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("adminSidebar.analytics")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          active
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          active ? "bg-purple-600/15 dark:bg-purple-600/30" : "bg-transparent"
                        )}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </div>
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("adminSidebar.security")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {securityItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          active
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-muted/30 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          active ? "bg-purple-600/15 dark:bg-purple-600/30" : "bg-transparent"
                        )}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </div>
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-card border-t border-border p-4">
        {!collapsed && user?.email && (
          <div className="mb-3 px-2 py-2 rounded-lg bg-purple-50/50 dark:bg-purple-900/20">
            <p className="text-xs text-muted-foreground">{t("adminSidebar.loggedInAs")}</p>
            <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">{t("adminSidebar.adminPortal")}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>{t("adminSidebar.signOut")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}