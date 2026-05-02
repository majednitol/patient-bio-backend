import { Suspense } from "react";
import { Outlet, Navigate, useParams } from "react-router-dom";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { HospitalSidebar } from "@/components/hospital/HospitalSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsHospitalAdmin, useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useHospital } from "@/hooks/useHospitals";
import { Loader2 } from "lucide-react";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";

export default function HospitalLayout() {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { data: hospital, isLoading: hospitalLoading } = useHospital(hospitalId);
  const { data: isAdmin, isLoading: adminLoading } = useIsHospitalAdmin(hospitalId);
  const { data: staffMembers } = useHospitalStaff(hospitalId);

  const isLoading = authLoading || hospitalLoading || adminLoading;

  // Check if current user is a doctor at this hospital
  const currentUserStaff = staffMembers?.find(s => s.user_id === user?.id);
  const isDoctor = currentUserStaff?.role === 'doctor' || currentUserStaff?.role === 'admin';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading hospital...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hospital) {
    return <Navigate to="/hospitals" replace />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <HospitalSidebar hospital={hospital} isAdmin={isAdmin || false} isDoctor={isDoctor} />
        <SidebarInset className="flex-1 min-w-0">
          <header className="flex h-12 sm:h-14 md:h-16 items-center gap-2 sm:gap-4 border-b border-border dark:border-border/60 bg-background px-3 sm:px-4 md:px-6 lg:px-8">
            <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-semibold truncate">
                {hospital.name}
              </h1>
            </div>
            <GlobalSearchDialog />
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10">
            <div className="max-w-7xl mx-auto">
              <Suspense fallback={<ContentLoader />}>
                <Outlet context={{ hospital, isAdmin, isDoctor }} />
              </Suspense>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
