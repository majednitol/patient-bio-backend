import { Link, useLocation } from "react-router-dom";
import {
  Home,
  User,
  FileText,
  Users,
  Send,
  Inbox,
  QrCode,
  LogOut,
  Activity,
  ClipboardList,
  Receipt,
  Microscope,
  Heart,
  Barcode,
  Building2,
  FileSpreadsheet,
  Share2,
  ChevronDown,
  Upload,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { usePathologistProfile } from "@/hooks/usePathologistProfile";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { usePatientPathologistShares } from "@/hooks/usePatientPathologistShares";
import { useLabOrdersForPathologist } from "@/hooks/useLabOrdersForPathologist";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/pathologist", icon: Home },
      { title: "Analytics", url: "/pathologist/analytics", icon: Activity },
    ],
  },
  {
    label: "Lab Operations",
    items: [
      { title: "Hospital Orders", url: "/pathologist/hospital-orders", icon: Inbox },
      { title: "Sample Tracking", url: "/pathologist/sample-tracking", icon: Barcode },
      { title: "Bulk Results", url: "/pathologist/bulk-results", icon: FileSpreadsheet },
      { title: "Billing", url: "/pathologist/billing", icon: Receipt },
    ],
  },
  {
    label: "Reports & Data",
    items: [
      { title: "My Reports", url: "/pathologist/reports", icon: FileText },
      { title: "Test Catalog", url: "/pathologist/catalog", icon: ClipboardList },
      { title: "Import Data", url: "/pathologist/import", icon: Upload },
    ],
  },
  {
    label: "Data Sharing",
    items: [
      { title: "Data From Doctors", url: "/pathologist/from-doctors", icon: Inbox },
      { title: "Share to Doctors", url: "/pathologist/to-doctors", icon: Send },
      { title: "Patient Shares", url: "/pathologist/patient-shares", icon: Share2 },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profile", url: "/pathologist/profile", icon: User },
      { title: "My Patients", url: "/pathologist/patients", icon: Users },
      { title: "My QR Code", url: "/pathologist/qr-code", icon: QrCode },
    ],
  },
];

const COLLAPSED_BY_DEFAULT = new Set(["Account"]);

export const PathologistSidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();
  const { state, setOpenMobile, isMobile, openMobile } = useSidebar();
  const { profile } = usePathologistProfile();
  const { pendingCount } = useDoctorPathologistShares();
  const { pendingCount: patientSharesPending } = usePatientPathologistShares();
  const { pendingCount: hospitalOrdersCount } = useLabOrdersForPathologist();
  const isCollapsed = state === "collapsed" && !(isMobile && openMobile);
  const { logoUrl } = usePlatformSettings();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.log("Sign out completed");
    }
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    window.location.href = "/";
  };

  const isActive = (path: string) => {
    if (path === "/pathologist") {
      return location.pathname === "/pathologist";
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const getBadgeInfo = (url: string): { hasBadge: boolean; count: number } => {
    if (url === "/pathologist/from-doctors" && pendingCount > 0) return { hasBadge: true, count: pendingCount };
    if (url === "/pathologist/hospital-orders" && hospitalOrdersCount > 0) return { hasBadge: true, count: hospitalOrdersCount };
    if (url === "/pathologist/patient-shares" && patientSharesPending > 0) return { hasBadge: true, count: patientSharesPending };
    return { hasBadge: false, count: 0 };
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-teal-100 dark:border-teal-800/30">
      <SidebarHeader className="diagnostic-gradient p-4">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Platform logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm">
              <Microscope className="h-6 w-6 text-white" />
            </div>
          )}
          {!isCollapsed && (
            <span className="text-white font-bold text-lg">Diagnostic Center</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-card px-2 py-3">
        {navGroups.map((group) => {
          const isCollapsibleGroup = COLLAPSED_BY_DEFAULT.has(group.label);
          const hasActiveItem = group.items.some((item) => isActive(item.url));

          const groupContent = (
            <SidebarMenu>
              {group.items.map((item) => {
                const { hasBadge, count } = getBadgeInfo(item.url);
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          active
                            ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-teal-50/50 dark:hover:bg-teal-900/20 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          active ? "bg-teal-100 dark:bg-teal-800/50" : "bg-transparent"
                        )}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </div>
                        <span className="flex-1">{item.title}</span>
                        {hasBadge && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-green-600 text-white text-xs font-medium px-1.5 shadow-sm">
                            {count > 9 ? "9+" : count}
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
              <SidebarGroup key={group.label}>
                <Collapsible defaultOpen={hasActiveItem}>
                  <CollapsibleTrigger className="w-full">
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between w-full cursor-pointer hover:text-foreground transition-colors">
                      {group.label}
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
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>{groupContent}</SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="bg-card border-t border-teal-100 dark:border-teal-800/30 p-4">
        {!isCollapsed && (
          <>
            {/* Quick Stats Strip */}
            <div className="flex items-center gap-1.5 mb-3">
              <Link
                to="/pathologist/hospital-orders"
                onClick={handleNavClick}
                className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
              >
                <Building2 className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">{hospitalOrdersCount}</span>
              </Link>
              <Link
                to="/pathologist/from-doctors"
                onClick={handleNavClick}
                className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
              >
                <Inbox className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-300">{pendingCount}</span>
              </Link>
              <Link
                to="/pathologist/patient-shares"
                onClick={handleNavClick}
                className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Share2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{patientSharesPending}</span>
              </Link>
            </div>

            {profile?.full_name && (
              <div className="mb-3 px-2 py-2 rounded-lg bg-teal-50/50 dark:bg-teal-900/20">
                <p className="text-xs text-muted-foreground">Logged in as</p>
                <p className="text-sm font-medium text-foreground truncate">{profile.full_name}</p>
                <p className="text-xs text-teal-600 dark:text-teal-400 truncate">{profile.lab_name || "Diagnostic Center"}</p>
              </div>
            )}
          </>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
