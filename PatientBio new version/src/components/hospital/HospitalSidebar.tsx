import { LayoutDashboard, Users, UserPlus, Settings, Building2, Stethoscope, Pill, CalendarDays, Clock, Bed, Receipt, UserCheck, BarChart3, LogOut, FolderKanban, CalendarCheck, Upload, FlaskConical, CalendarClock, Siren, ArrowRightLeft, ChevronDown, Heart } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Hospital } from "@/types/hospital";
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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface HospitalSidebarProps {
  hospital: Hospital;
  isAdmin: boolean;
  isDoctor?: boolean;
}

const COLLAPSED_BY_DEFAULT = new Set(["Staff & Admin", "Doctor Portal"]);

export function HospitalSidebar({ hospital, isAdmin, isDoctor }: HospitalSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
  const queryClient = useQueryClient();
  const collapsed = state === "collapsed" && !(isMobile && openMobile);
  const { logoUrl: platformLogoUrl } = usePlatformSettings();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const baseUrl = `/hospital/${hospital.id}`;

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/");
  };

  // Prefetch data on hover for instant navigation
  const handlePrefetch = (url: string) => {
    if (url.includes("/schedules")) {
      queryClient.prefetchQuery({
        queryKey: ["hospital-doctor-schedule-combined", hospital.id],
        queryFn: async () => {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          return { doctors: [], availability: [], timeOff: [] }; // Minimal prefetch trigger
        },
        staleTime: STALE_TIMES.REALTIME,
      });
    } else if (url.includes("/admissions")) {
      queryClient.prefetchQuery({
        queryKey: ["admissions", hospital.id, undefined],
        queryFn: async () => {
          const { data } = await supabase
            .from("admissions")
            .select(`*, bed:beds(*, ward:wards(*)), patient_profile:user_profiles!admissions_patient_id_fkey(display_name, phone), doctor_profile:doctor_profiles!admissions_admitting_doctor_id_fkey(full_name, specialty)`)
            .eq("hospital_id", hospital.id)
            .order("admission_date", { ascending: false });
          return data;
        },
        staleTime: STALE_TIMES.REALTIME,
      });
    } else if (url.includes("/billing")) {
      queryClient.prefetchQuery({
        queryKey: ["invoices", hospital.id, undefined],
        queryFn: async () => {
          const { data } = await supabase
            .from("invoices")
            .select(`*, items:invoice_items(*), patient_profile:user_profiles!invoices_patient_id_fkey(display_name, phone)`)
            .eq("hospital_id", hospital.id)
            .order("created_at", { ascending: false });
          return data;
        },
        staleTime: STALE_TIMES.REALTIME,
      });
    }
  };

  const navGroups = [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", url: baseUrl, icon: LayoutDashboard },
        { title: "Analytics", url: `${baseUrl}/analytics`, icon: BarChart3 },
      ],
    },
    {
      label: "Clinical",
      items: [
        { title: "Appointments", url: `${baseUrl}/appointments`, icon: CalendarDays },
        { title: "Doctor Schedules", url: `${baseUrl}/schedules`, icon: CalendarCheck },
        { title: "Lab Orders", url: `${baseUrl}/lab-orders`, icon: FlaskConical },
        { title: "Emergency Triage", url: `${baseUrl}/emergency-triage`, icon: Siren },
        { title: "Dept. Referrals", url: `${baseUrl}/referrals`, icon: ArrowRightLeft },
      ],
    },
    {
      label: "Facility",
      items: [
        { title: "Wards & Beds", url: `${baseUrl}/wards`, icon: Bed },
        { title: "Admissions", url: `${baseUrl}/admissions`, icon: UserCheck },
        { title: "Billing", url: `${baseUrl}/billing`, icon: Receipt },
      ],
    },
    {
      label: "Staff & Admin",
      items: [
        { title: "Staff", url: `${baseUrl}/staff`, icon: Users },
        { title: "Departments", url: `${baseUrl}/departments`, icon: FolderKanban },
        { title: "Staff Shifts", url: `${baseUrl}/shifts`, icon: CalendarClock },
        ...(isAdmin
          ? [
              { title: "Applications", url: `${baseUrl}/applications`, icon: UserPlus },
              { title: "Import Data", url: `${baseUrl}/import`, icon: Upload },
              { title: "Settings", url: `${baseUrl}/settings`, icon: Settings },
            ]
          : []),
      ],
    },
    ...(isDoctor
      ? [
          {
            label: "Doctor Portal",
            items: [
              { title: "My Patients", url: `${baseUrl}/patients`, icon: Stethoscope },
              { title: "Prescriptions", url: `${baseUrl}/prescriptions`, icon: Pill },
              { title: "My Availability", url: `${baseUrl}/availability`, icon: Clock },
            ],
          },
        ]
      : []),
  ];

  const isActive = (path: string) => {
    if (path === baseUrl) {
      return location.pathname === baseUrl;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-blue-100 dark:border-blue-800/30">
      <SidebarHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex items-center gap-3">
          {platformLogoUrl ? (
            <img src={platformLogoUrl} alt="Platform logo" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
          ) : hospital.logo_url ? (
            <img src={hospital.logo_url} alt={hospital.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0 shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          )}
          {!collapsed && (
            <span className="text-white font-bold text-lg">Hospital Portal</span>
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
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link
                        to={item.url}
                        onMouseEnter={() => handlePrefetch(item.url)}
                        onClick={handleLinkClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                          active
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium shadow-sm"
                            : "text-muted-foreground hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:text-foreground"
                        )}
                      >
                        <div className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          active ? "bg-blue-100 dark:bg-blue-800/50" : "bg-transparent"
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
          );

          if (isCollapsibleGroup && !collapsed) {
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

      <SidebarFooter className="bg-card border-t border-blue-100 dark:border-blue-800/30 p-4">
        {!collapsed && (
          <div className="mb-3 px-2 py-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/20">
            <p className="text-xs text-muted-foreground">Logged in as</p>
            <p className="text-sm font-medium text-foreground truncate">{hospital.name}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Hospital Portal</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
