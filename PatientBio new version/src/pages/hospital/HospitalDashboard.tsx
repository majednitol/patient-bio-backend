import { formatDoctorName } from "@/utils/formatDoctorName";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Hospital } from "@/types/hospital";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useHospitalApplications } from "@/hooks/useDoctorApplications";
import { useAdmissions } from "@/hooks/useAdmissions";
import { useHospitalAppointments } from "@/hooks/useAppointments";
import { useBeds } from "@/hooks/useWards";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, UserPlus, CheckCircle, Building2, Bed, Calendar,
  LogIn, LogOut, DollarSign, Clock, Stethoscope,
  FileText, ClipboardPlus, CalendarDays, UserRoundPlus, FlaskConical,
} from "lucide-react";
import ProfileCompletionBanner from "@/components/hospital/ProfileCompletionBanner";
import HospitalDashboardActivityFeed from "@/components/hospital/HospitalDashboardActivityFeed";
import MergeCandidatesCard from "@/components/hospital/MergeCandidatesCard";
import MergeHistoryCard from "@/components/hospital/MergeHistoryCard";
import HospitalWardOccupancyCard from "@/components/hospital/HospitalWardOccupancyCard";
import OverdueDischargeAlertCard from "@/components/hospital/OverdueDischargeAlertCard";
import BedOccupancyTrendChart from "@/components/hospital/BedOccupancyTrendChart";
import RevenueTrendChart from "@/components/hospital/RevenueTrendChart";
import DepartmentLoadHeatmap from "@/components/hospital/DepartmentLoadHeatmap";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

export default function HospitalDashboard() {
  const { hospital, isAdmin } = useOutletContext<HospitalContext>();
  const navigate = useNavigate();
  const { data: staff } = useHospitalStaff(hospital.id);
  const { data: applications } = useHospitalApplications(hospital.id);
  const { data: admissions } = useAdmissions(hospital.id);
  const { appointments } = useHospitalAppointments(hospital.id);
  const { data: beds } = useBeds(hospital.id);
  // Lightweight invoice query for revenue stats only
  const { data: invoices } = useQuery({
    queryKey: ["dashboard-invoices", hospital.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_date, total_amount, amount_paid, status")
        .eq("hospital_id", hospital.id);
      if (error) throw error;
      return data;
    },
    enabled: !!hospital.id,
  });

  // Doctor availability for today - fetch separately then join
  const todayDow = new Date().getDay(); // 0=Sun
  const { data: doctorsOnDuty } = useQuery({
    queryKey: ["doctors-on-duty", hospital.id, todayDow],
    queryFn: async () => {
      const { data: availability, error: avError } = await supabase
        .from("doctor_availability")
        .select("id, doctor_id, start_time, end_time")
        .eq("hospital_id", hospital.id)
        .eq("day_of_week", todayDow)
        .eq("is_active", true)
        .order("start_time");
      if (avError) throw avError;
      if (!availability?.length) return [];

      const doctorIds = [...new Set(availability.map((a) => a.doctor_id))];
      const { data: doctors, error: drError } = await supabase
        .from("doctor_profiles")
        .select("user_id, full_name, specialty")
        .in("user_id", doctorIds);
      if (drError) throw drError;

      const doctorMap = new Map(doctors?.map((d) => [d.user_id, d]) || []);
      return availability.map((slot) => ({
        ...slot,
        doctor: doctorMap.get(slot.doctor_id) || null,
      }));
    },
    enabled: !!hospital.id,
  });

  const pendingApplications = applications?.filter((a) => a.status === "pending") || [];
  const doctorCount = staff?.filter((s) => s.role === "doctor").length || 0;
  const totalStaff = staff?.length || 0;

  // Today's date boundaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysAdmissions = admissions?.filter((a) => {
    const d = new Date(a.admission_date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime() && a.status === "admitted";
  }) || [];

  const todaysDischarges = admissions?.filter((a) => {
    if (!a.actual_discharge) return false;
    const d = new Date(a.actual_discharge);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }) || [];

  const todaysAppointments = appointments?.filter((a) => {
    const d = new Date(a.appointment_date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime() && a.status === "scheduled";
  }) || [];

  // Upcoming appointments (next 5 today, sorted by start_time)
  const now = new Date();
  const upcomingAppointments = todaysAppointments
    .filter((a) => {
      const [h, m] = (a.start_time || "00:00").split(":").map(Number);
      const aptTime = new Date(today);
      aptTime.setHours(h, m);
      return aptTime >= now;
    })
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""))
    .slice(0, 5);

  // Bed occupancy
  const occupiedBeds = beds?.filter((b) => b.status === "occupied").length || 0;
  const totalBeds = beds?.length || 0;
  const bedOccupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // Revenue calculations
  const todaysRevenue = invoices?.reduce((sum, inv) => {
    const invDate = new Date(inv.invoice_date);
    invDate.setHours(0, 0, 0, 0);
    if (invDate.getTime() === today.getTime() && inv.status === "paid") {
      return sum + inv.amount_paid;
    }
    return sum;
  }, 0) || 0;

  const pendingCollections = invoices?.reduce((sum, inv) => {
    if (inv.status === "pending" || inv.status === "partial") {
      return sum + (inv.total_amount - inv.amount_paid);
    }
    return sum;
  }, 0) || 0;

  const formatCurrency = (amount: number) =>
    `৳${amount.toLocaleString("en-BD")}`;

  // Activity feed
  const activities: any[] = [
    ...todaysAdmissions.map((adm) => ({
      id: `adm-${adm.id}`, type: "admission" as const,
      title: "Patient Admitted",
      description: `${adm.patient_profile?.display_name || "Patient"} admitted to ${adm.bed?.ward?.name || "ward"}`,
      timestamp: adm.admission_date, icon: null,
    })),
    ...todaysDischarges.map((adm) => ({
      id: `dis-${adm.id}`, type: "discharge" as const,
      title: "Patient Discharged",
      description: `${adm.patient_profile?.display_name || "Patient"} discharged from ${adm.bed?.ward?.name || "ward"}`,
      timestamp: adm.actual_discharge || new Date().toISOString(), icon: null,
    })),
    ...todaysAppointments.map((apt) => ({
      id: `apt-${apt.id}`, type: "appointment" as const,
      title: "Appointment Scheduled",
      description: `${apt.patient_profile?.display_name || "Patient"} with Dr. ${apt.doctor_profile?.full_name || "Doctor"}`,
      timestamp: apt.appointment_date, icon: null,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const stats = [
    { title: "Total Staff", value: totalStaff, icon: Users, color: "text-blue-600", bgColor: "bg-blue-500/10" },
    { title: "Doctors", value: doctorCount, icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-500/10" },
    { title: "Today's Admissions", value: todaysAdmissions.length, icon: LogIn, color: "text-indigo-600", bgColor: "bg-indigo-500/10" },
    { title: "Today's Discharges", value: todaysDischarges.length, icon: LogOut, color: "text-emerald-600", bgColor: "bg-emerald-500/10" },
    { title: "Today's Appointments", value: todaysAppointments.length, icon: Calendar, color: "text-purple-600", bgColor: "bg-purple-500/10" },
    { title: "Bed Occupancy", value: `${bedOccupancyPercent}%`, icon: Bed, color: "text-red-600", bgColor: "bg-red-500/10" },
    { title: "Today's Revenue", value: formatCurrency(todaysRevenue), icon: DollarSign, color: "text-teal-600", bgColor: "bg-teal-500/10" },
    { title: "Pending Collections", value: formatCurrency(pendingCollections), icon: Clock, color: "text-orange-600", bgColor: "bg-orange-500/10" },
  ];

  const quickActions = [
    { label: "Admit Patient", icon: ClipboardPlus, path: `/hospital/${hospital.id}/admissions` },
    { label: "New Invoice", icon: FileText, path: `/hospital/${hospital.id}/billing` },
    { label: "Register Patient", icon: UserRoundPlus, path: `/hospital/${hospital.id}/patients` },
    { label: "View Schedule", icon: CalendarDays, path: `/hospital/${hospital.id}/schedules` },
    { label: "Lab Orders", icon: FlaskConical, path: `/hospital/${hospital.id}/lab-orders` },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner - Pathologist style */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-xs sm:text-sm text-white/80">Hospital Dashboard</p>
              <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                {hospital.name}
              </h1>
            </div>
            <Badge variant="outline" className="border-white/30 bg-white/15 text-white backdrop-blur-sm w-fit text-[10px] sm:text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {hospital.city || "Hospital"}
            </Badge>
          </div>
        </div>
        {(hospital.registration_number || hospital.description) && (
          <div className="px-4 sm:px-6 py-2 bg-muted/50 border-t">
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {hospital.registration_number && `Reg: ${hospital.registration_number}`}
              {hospital.registration_number && hospital.description && " • "}
              {hospital.description}
            </p>
          </div>
        )}
      </Card>

      {isAdmin && <ProfileCompletionBanner />}

      {/* Overdue Discharge Alert */}
      <OverdueDischargeAlertCard hospitalId={hospital.id} />

      {/* Quick Actions */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="gap-1.5 sm:gap-2 text-[10px] sm:text-sm h-9 sm:h-auto w-full sm:w-auto"
              onClick={() => navigate(action.path)}
            >
              <action.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{action.label}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Stats Grid - Pathologist style: 2-col mobile, 4-col desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <div className="flex items-center gap-2 sm:hidden">
                  <div className={`h-8 w-8 rounded-full ${stat.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-lg font-bold leading-none">{stat.value}</p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`hidden sm:flex h-10 w-10 rounded-full ${stat.bgColor} items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts - Occupancy Trend + Revenue */}
      {isAdmin && (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
          <BedOccupancyTrendChart hospitalId={hospital.id} />
          <RevenueTrendChart hospitalId={hospital.id} />
        </div>
      )}

      {/* Department Load Heatmap */}
      {isAdmin && <DepartmentLoadHeatmap hospitalId={hospital.id} />}

      {/* Ward Occupancy + Doctors on Duty (side by side) */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        <HospitalWardOccupancyCard hospitalId={hospital.id} />

        {/* Staff on Duty Today */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Staff on Duty Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Doctors */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Doctors ({doctorsOnDuty?.length || 0})
              </p>
              {!doctorsOnDuty?.length ? (
                <p className="text-sm text-muted-foreground">No doctors scheduled</p>
              ) : (
                <div className="space-y-1">
                  {doctorsOnDuty.map((slot: any) => (
                    <div key={slot.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{slot.doctor?.full_name || "Doctor"}</p>
                        <p className="text-xs text-muted-foreground">{slot.doctor?.specialty || "General"}</p>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">
                        {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Other Staff */}
            {(() => {
              const nurses = staff?.filter((s) => s.role === "nurse" && s.is_active) || [];
              const receptionists = staff?.filter((s) => s.role === "receptionist" && s.is_active) || [];
              return (
                <>
                  {nurses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Nurses ({nurses.length})
                      </p>
                      <div className="space-y-1">
                        {nurses.slice(0, 5).map((n) => (
                          <div key={n.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium">{n.user_profile?.display_name || "Nurse"}</p>
                            <span className="text-xs text-muted-foreground capitalize">{n.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {receptionists.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Receptionists ({receptionists.length})
                      </p>
                      <div className="space-y-1">
                        {receptionists.slice(0, 3).map((r) => (
                          <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium">{r.user_profile?.display_name || "Receptionist"}</p>
                            <span className="text-xs text-muted-foreground capitalize">{r.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Appointments
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/hospital/${hospital.id}/appointments`)}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{apt.patient_profile?.display_name || "Patient"}</p>
                    <p className="text-xs text-muted-foreground">
                      with {formatDoctorName(apt.doctor_profile?.full_name, "Doctor")}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {apt.start_time?.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Applications */}
      {isAdmin && pendingApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Pending Applications
            </CardTitle>
            <CardDescription>
              {pendingApplications.length} doctor{pendingApplications.length !== 1 ? "s" : ""} awaiting approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApplications.slice(0, 5).map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{app.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {app.specialty || "General"} • {app.experience_years || 0} years exp.
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(app.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && <MergeCandidatesCard hospitalId={hospital.id} />}
      {isAdmin && <MergeHistoryCard />}
      {isAdmin && <HospitalDashboardActivityFeed activities={activities} isLoading={!admissions || !appointments || !beds} />}
    </div>
  );
}
