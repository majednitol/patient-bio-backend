import React from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useDoctorProfileCompletion } from "@/hooks/useDoctorProfileCompletion";
import { useNotifications } from "@/hooks/useNotifications";
import { useDoctorConversations } from "@/hooks/useDoctorConversations";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { cn } from "@/lib/utils";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HospitalSwitcher } from "./HospitalSwitcher";
import {
  LayoutDashboard,
  User,
  Users,
  Pill,
  QrCode,
  LogOut,
  Stethoscope,
  CalendarDays,
  Bell,
  BarChart3,
  Settings,
  ArrowRightLeft,
  UserCog,
  Microscope,
  Heart,
  ChevronDown,
  MessageSquare,
  FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

const overviewItems = [
  { title: "Dashboard", url: "/doctor", icon: LayoutDashboard },
  { title: "Profile", url: "/doctor/profile", icon: User },
  { title: "Analytics", url: "/doctor/analytics", icon: BarChart3 },
];

const clinicalItems = [
  { title: "My Patients", url: "/doctor/patients", icon: Users },
  { title: "Appointments", url: "/doctor/appointments", icon: CalendarDays },
  { title: "Prescriptions", url: "/doctor/prescriptions", icon: Pill },
  { title: "Messages", url: "/doctor/messages", icon: MessageSquare },
  { title: "Referrals", url: "/doctor/referrals", icon: ArrowRightLeft },
  { title: "Lab Reports", url: "/doctor/lab-reports", icon: Microscope },
];

const toolsItems = [
  { title: "Reports", url: "/doctor/reports", icon: FileText },
  { title: "My Staff", url: "/doctor/staff", icon: UserCog },
  { title: "Notifications", url: "/doctor/notifications", icon: Bell },
  { title: "My QR Code", url: "/doctor/qr-code", icon: QrCode },
  { title: "Settings", url: "/doctor/settings", icon: Settings },
];

const COLLAPSED_BY_DEFAULT = new Set(["Tools & Admin"]);

const DoctorSidebar = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useDoctorProfile();
  const { percentage: profileCompletion } = useDoctorProfileCompletion();
  const { unreadCount } = useNotifications();
  const { totalUnread: messageUnread } = useDoctorConversations();
  const { selectedHospitalId, setSelectedHospitalId } = useDoctorHospitalContext();
  const { isStaff } = useStaffAccess();
  const { logoUrl } = usePlatformSettings();
  const { state, setOpenMobile, isMobile, openMobile } = useSidebar();
  const isCollapsed = state === "collapsed" && !(isMobile && openMobile);

  const staffHiddenItems = ["Prescriptions", "My Staff", "Settings", "Analytics", "Referrals"];

  const filterItems = (items: typeof overviewItems) =>
    isStaff ? items.filter((item) => !staffHiddenItems.includes(item.title)) : items;

  const navGroups = [
    { label: "Overview", items: filterItems(overviewItems) },
    { label: "Clinical", items: filterItems(clinicalItems) },
    { label: "Tools & Admin", items: filterItems(toolsItems) },
  ].filter((g) => g.items.length > 0);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/doctors/login");
  };

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "DR";

  const isActive = (path: string) => {
    if (path === "/doctor") return location.pathname === "/doctor";
    return location.pathname.startsWith(path);
  };

  const getBadgeInfo = (item: { title: string; url: string }): { hasBadge: boolean; count?: number; text?: string } => {
    if (item.title === "Profile" && profileCompletion < 100) return { hasBadge: true, text: `${profileCompletion}%` };
    if (item.title === "Notifications" && unreadCount > 0) return { hasBadge: true, count: unreadCount };
    if (item.title === "Messages" && messageUnread > 0) return { hasBadge: true, count: messageUnread };
    return { hasBadge: false };
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-primary/10 dark:border-primary/20">
      <SidebarHeader className="bg-gradient-to-r from-primary to-primary/80 p-3 sm:p-4">
        <Link to="/doctor" className="flex items-center gap-3" onClick={handleLinkClick}>
          {logoUrl ? (
            <img src={logoUrl} alt="Platform logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
          )}
          {!isCollapsed && (
            <span className="text-white font-bold text-lg">Doctor Portal</span>
          )}
        </Link>
        {!isStaff && !isCollapsed && (
          <div className="mt-3">
            <HospitalSwitcher
              selectedHospitalId={selectedHospitalId}
              onSelectHospital={setSelectedHospitalId}
              className="w-full justify-start"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-card px-2 py-3">
        {navGroups.map((group) => {
          const isCollapsibleGroup = COLLAPSED_BY_DEFAULT.has(group.label);
          const hasActiveItem = group.items.some((item) => isActive(item.url));

          const groupContent = (
            <SidebarMenu>
              {group.items.map((item) => {
                const active = isActive(item.url);
                const badge = getBadgeInfo(item);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          active
                            ? "bg-primary/10 dark:bg-primary/20 text-primary font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          active ? "bg-primary/15 dark:bg-primary/25" : "bg-transparent"
                        )}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </div>
                        <span className="flex-1">{item.title}</span>
                        {badge.hasBadge && badge.text && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-amber-500 text-white text-xs font-medium px-1.5 shadow-sm">
                            {badge.text}
                          </span>
                        )}
                        {badge.hasBadge && badge.count && (
                          <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1.5 animate-pulse shadow-sm">
                            {badge.count > 99 ? "99+" : badge.count}
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

      <SidebarFooter className="bg-card border-t border-primary/10 dark:border-primary/20 p-3 sm:p-4">
        {!isCollapsed && (
          <div className="mb-3 px-2 py-2 rounded-lg bg-primary/5 dark:bg-primary/10">
            <p className="text-xs text-muted-foreground">Logged in as</p>
            <div className="flex items-center gap-3 mt-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || "Doctor"}
                </p>
                <p className="text-xs text-primary dark:text-primary/80">Doctor Portal</p>
              </div>
            </div>
          </div>
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
});

export default DoctorSidebar;
