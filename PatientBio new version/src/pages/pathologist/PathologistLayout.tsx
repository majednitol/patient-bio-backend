import { useEffect, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { usePathologistProfile } from "@/hooks/usePathologistProfile";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { PathologistSidebar } from "@/components/pathologist/PathologistSidebar";
import { DiagnosticNotificationBell } from "@/components/pathologist/DiagnosticNotificationBell";
import { Separator } from "@/components/ui/separator";
import { Loader2, Microscope } from "lucide-react";
import { format } from "date-fns";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { useQueryClient } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";

const PathologistLayout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { profile, isLoading: profileLoading } = usePathologistProfile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/pathologist/login");
      return;
    }

    if (!authLoading && !roleLoading && !profileLoading && user) {
      // If user has no pathologist role or profile, redirect to onboarding
      if (role !== "pathologist" && !profile) {
        navigate("/pathologist/onboarding");
      }
    }
  }, [user, authLoading, role, roleLoading, profile, profileLoading, navigate]);

  // Prefetch pathologist data
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user?.id || !profile) return;

    queryClient.prefetchQuery({
      queryKey: ["pathologist-shares", user.id],
      queryFn: async () => {
        const { data } = await supabase
          .from("doctor_pathologist_shares")
          .select("id, doctor_id, pathologist_id, patient_id, status, shared_at")
          .eq("pathologist_id", user.id)
          .eq("status", "pending");
        return data || [];
      },
      staleTime: STALE_TIMES.STANDARD,
    });
  }, [user?.id, profile, queryClient]);

  if (authLoading || roleLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-teal-50/30 dark:bg-gray-900">
        <div className="p-4 rounded-2xl diagnostic-gradient">
          <Microscope className="h-8 w-8 text-white animate-pulse" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-teal-600 dark:text-teal-400" />
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user || (!profile && role !== "pathologist")) {
    return null;
  }

  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <PathologistSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-teal-100 dark:border-teal-800/30 px-4 bg-card/50">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1 flex items-center gap-3">
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">
                  {profile?.lab_name || "Diagnostic Center"}
                </p>
                <p className="text-xs text-muted-foreground">{today}</p>
              </div>
            </div>
            <GlobalSearchDialog />
            <DiagnosticNotificationBell />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 bg-gray-50/50 dark:bg-gray-900/50">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PathologistLayout;
