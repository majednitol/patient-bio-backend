import { useEffect, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useResearcherProfile } from "@/hooks/useResearcherProfile";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ResearcherSidebar } from "@/components/researcher/ResearcherSidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";

const ResearcherLayout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { profile, isLoading: profileLoading } = useResearcherProfile();
  const queryClient = useQueryClient();

  // Prefetch dashboard data once auth is confirmed
  useEffect(() => {
    if (user?.id) {
      queryClient.prefetchQuery({
        queryKey: ["patient-researcher-shares-researcher", user.id],
        queryFn: async () => {
          const { data } = await supabase
            .from("patient_researcher_shares")
            .select("id, patient_id, researcher_id, disease_category, status, shared_at, expires_at")
            .eq("researcher_id", user.id)
            .order("shared_at", { ascending: false });
          return data || [];
        },
        staleTime: STALE_TIMES.STANDARD,
      });
      queryClient.prefetchQuery({
        queryKey: ["broadcast-requests", user.id],
        queryFn: async () => {
          const { data } = await supabase
            .from("research_broadcast_requests")
            .select("id, researcher_id, disease_category, status, patients_notified, patients_approved, patients_rejected, created_at")
            .eq("researcher_id", user.id)
            .order("created_at", { ascending: false });
          return data || [];
        },
        staleTime: STALE_TIMES.STANDARD,
      });
      queryClient.prefetchQuery({
        queryKey: ["cohort-analytics-profiles", user.id, 0],
        queryFn: async () => {
          return [];
        },
        staleTime: STALE_TIMES.STANDARD,
      });
    }
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/researcher/login");
      return;
    }

    if (!authLoading && !roleLoading && !profileLoading && user) {
      // If user has no researcher role or profile, redirect to onboarding
      if (role !== "researcher" && !profile) {
        navigate("/researcher/onboarding");
      }
    }
  }, [user, authLoading, role, roleLoading, profile, profileLoading, navigate]);

  if (authLoading || roleLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user || (!profile && role !== "researcher")) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <ResearcherSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="flex h-14 md:h-16 shrink-0 items-center gap-2 md:gap-4 border-b px-3 sm:px-4 md:px-6 lg:px-8">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 flex items-center">
              <span className="text-sm font-medium text-foreground sm:hidden">Research Portal</span>
            </div>
            <NotificationBell />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10">
            <div className="max-w-7xl mx-auto">
              <Suspense fallback={<ContentLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ResearcherLayout;
