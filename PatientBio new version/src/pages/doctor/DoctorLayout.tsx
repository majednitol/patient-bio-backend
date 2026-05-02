import { useEffect, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ContentLoader } from "@/components/ui/ContentLoader";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { DoctorHospitalProvider, useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { useDoctorHospitals } from "@/hooks/useDoctorHospitals";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import DoctorSidebar from "@/components/doctor/DoctorSidebar";
import { DoctorMobileBottomNav } from "@/components/doctor/DoctorMobileBottomNav";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";
import GlobalSearchDialog from "@/components/GlobalSearchDialog";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDoctorPresence } from "@/hooks/useDoctorPresence";


const routeTitles: Record<string, string> = {
  "/doctor": "Dashboard",
  "/doctor/patients": "Patients",
  "/doctor/appointments": "Appointments",
  "/doctor/prescriptions": "Prescriptions",
  "/doctor/analytics": "Analytics",
  "/doctor/lab-reports": "Lab Reports",
  "/doctor/profile": "Profile",
  "/doctor/settings": "Settings",
  "/doctor/staff": "Staff",
  "/doctor/messages": "Messages",
};

function DoctorLayoutHeader() {
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { data: hospitals = [] } = useDoctorHospitals();
  const selectedHospital = hospitals.find((h) => h.hospital_id === selectedHospitalId);
  const location = useLocation();

  const pageTitle = routeTitles[location.pathname] || "Doctor Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-11 sm:h-14 md:h-16 shrink-0 items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur-md px-3 sm:px-4 md:px-6 lg:px-8 safe-area-top">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4 hidden sm:block" />
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold sm:font-normal sm:text-base text-foreground sm:text-muted-foreground truncate">
          {pageTitle}
        </span>
        {selectedHospital ? (
          <Badge variant="outline" className="gap-1.5 text-xs hidden sm:inline-flex">
            <Building2 className="h-3 w-3" />
            {selectedHospital.hospital.name}
          </Badge>
        ) : null}
      </div>
      <NotificationBell />
      <GlobalSearchDialog />
    </header>
  );
}

const DoctorLayoutInner = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: doctorProfile, isLoading: profileLoading } = useDoctorProfile();
  const { isStaff, isLoading: staffLoading } = useStaffAccess();

  // Track online presence
  useDoctorPresence();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/doctors/login", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !profileLoading && !staffLoading && user && !doctorProfile && !isStaff) {
      navigate("/doctor/onboarding", { replace: true });
    }
  }, [user, authLoading, profileLoading, staffLoading, doctorProfile, isStaff, navigate]);

  // Prefetch key data when auth is confirmed — aligned with hook queryKeys
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user?.id || !doctorProfile) return;
    
    // Prefetch appointments — matches useDoctorAppointments queryKey
    queryClient.prefetchQuery({
      queryKey: ["appointments", undefined, user.id, undefined, undefined, undefined],
      queryFn: async () => {
        const { data } = await supabase
          .from("appointments")
          .select(`
            id, doctor_id, patient_id, hospital_id, appointment_date, start_time, end_time, status, reason, notes, created_at, cancelled_at, cancelled_by, checked_in_at, consultation_started_at, consultation_ended_at, parent_appointment_id, recurrence_pattern, recurrence_end_date,
            doctor_profile:doctor_profiles!appointments_doctor_id_fkey(full_name, specialty, avatar_url),
            patient_profile:user_profiles!appointments_patient_id_fkey(display_name, phone, avatar_url),
            hospital:hospitals(id, name)
          `)
          .eq("doctor_id", user.id)
          .order("appointment_date")
          .order("start_time")
          .limit(200);
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch patients — matches useDoctorPatients queryKey
    queryClient.prefetchQuery({
      queryKey: ["doctor-patients", user.id],
      queryFn: async () => {
        const { data: accessRecords } = await supabase
          .from("doctor_patient_access")
          .select("id, doctor_id, patient_id, access_token_id, granted_at, last_accessed_at, is_active")
          .eq("doctor_id", user.id)
          .eq("is_active", true)
          .order("granted_at", { ascending: false });
        if (!accessRecords?.length) return [];
        const patientIds = accessRecords.map((r) => r.patient_id);
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, display_name, date_of_birth, gender, phone, avatar_url")
          .in("user_id", patientIds);
        return accessRecords.map((access) => {
          const profile = profiles?.find((p) => p.user_id === access.patient_id);
          return { ...access, patient_profile: profile || null, display_name: profile?.display_name || null };
        });
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [user?.id, doctorProfile, queryClient]);

  if (authLoading || profileLoading || staffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || (!doctorProfile && !isStaff)) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <DoctorSidebar />
        <SidebarInset className="flex-1 min-w-0">
          <DoctorLayoutHeader />
          <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 pb-20 lg:pb-10">
            <Suspense fallback={<ContentLoader />}>
              <div className="animate-fade-in">
                <Outlet />
              </div>
            </Suspense>
          </main>
        </SidebarInset>
        <DoctorMobileBottomNav />
      </div>
    </SidebarProvider>
  );
};

const DoctorLayout = () => (
  <DoctorHospitalProvider>
    <DoctorLayoutInner />
  </DoctorHospitalProvider>
);

export default DoctorLayout;
