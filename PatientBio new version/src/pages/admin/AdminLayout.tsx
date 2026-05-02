import { Suspense } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();

  // Show loading while checking auth and role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not logged in
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Redirect to home if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <header className="flex h-12 sm:h-14 md:h-16 items-center gap-2 sm:gap-4 border-b border-border dark:border-border/60 bg-background px-3 sm:px-4 md:px-6 lg:px-8">
            <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9" />
            <div className="flex-1" />
            <AdminNotificationBell />
            <GlobalSearchDialog />
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
}
