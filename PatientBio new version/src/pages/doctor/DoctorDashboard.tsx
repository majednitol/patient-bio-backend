import { useState, useMemo, lazy, Suspense } from "react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { useAuth } from "@/contexts/AuthContext";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";
import { useDoctorPatients, useLookupPatientByCode, useGrantPatientAccess } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions } from "@/hooks/usePrescriptions";
import { useDoctorAppointments } from "@/hooks/useAppointments";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { useDoctorHospitals } from "@/hooks/useDoctorHospitals";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { StaffDashboard } from "@/components/doctor/StaffDashboard";
import { DoctorProfileCompletionCard } from "@/components/doctor/DoctorProfileCompletionCard";
import { TodayAgendaCard } from "@/components/doctor/TodayAgendaCard";
import { PatientQueueCard } from "@/components/doctor/PatientQueueCard";
const BulkRenewalCard = lazy(() => import("@/components/doctor/BulkRenewalCard").then(m => ({ default: m.BulkRenewalCard })));
const MissedFollowUpsCard = lazy(() => import("@/components/doctor/MissedFollowUpsCard").then(m => ({ default: m.MissedFollowUpsCard })));
const ChronicPatientRegistryCard = lazy(() => import("@/components/doctor/ChronicPatientRegistryCard").then(m => ({ default: m.ChronicPatientRegistryCard })));
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PWAInstallBanner } from "@/components/doctor/PWAInstallBanner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  User,
  Mail,
  Phone,
  Award,
  Stethoscope,
  Clock,
  BadgeCheck,
  Edit,
  Users,
  Pill,
  QrCode,
  TrendingUp,
  Calendar,
  UserPlus,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { format, startOfToday } from "date-fns";

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { isStaff, effectiveDoctorId } = useStaffAccess();
  const { data: profile } = useDoctorProfile(effectiveDoctorId || undefined);
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { data: hospitals = [] } = useDoctorHospitals();
  const { data: patients } = useDoctorPatients(effectiveDoctorId || undefined);
  const { data: prescriptions } = useDoctorPrescriptions(undefined, effectiveDoctorId || undefined);
  const { appointments } = useDoctorAppointments(selectedHospitalId || undefined, effectiveDoctorId || undefined);
  const specialtyConfig = useMemo(() => getSpecialtyConfig(profile?.specialty), [profile?.specialty]);

  // All hooks must be called before conditional returns
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [patientCode, setPatientCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const lookupPatient = useLookupPatientByCode();
  const grantAccess = useGrantPatientAccess();

  // Staff users get a task-oriented dashboard
  if (isStaff) {
    return <StaffDashboard />;
  }

  // Show skeleton while initial data loads
  const isInitialLoading = !profile && !patients;
  if (isInitialLoading) {
    return <PageSkeleton type="dashboard" />;
  }

  const doctorId = user?.id?.substring(0, 8).toUpperCase() || "--------";
  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "DR";

  // Calculate statistics
  const totalPatients = patients?.length || 0;
  const totalPrescriptions = prescriptions?.length || 0;
  const activePrescriptions = prescriptions?.filter((rx) => rx.is_active)?.length || 0;

  // Get recent patients (last 5) - memoized
  const recentPatients = useMemo(() => patients?.slice(0, 5) || [], [patients]);

  const handleLookup = async () => {
    if (patientCode.length < 8) {
      toast.error("Please enter a valid 8-character Patient ID");
      return;
    }

    setIsLookingUp(true);
    try {
      const result = await lookupPatient.mutateAsync(patientCode);
      setLookupResult(result);
    } catch (error) {
      setLookupResult(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddPatient = async () => {
    if (!lookupResult?.patient_id || !user?.id) return;

    try {
      await grantAccess.mutateAsync({
        doctorId: effectiveDoctorId!,
        patientId: lookupResult.patient_id,
      });
      setAddDialogOpen(false);
      setPatientCode("");
      setLookupResult(null);
      toast.success("Patient added successfully!");
    } catch (error) {
      // Error handled in hook
    }
  };

  const resetDialog = () => {
    setPatientCode("");
    setLookupResult(null);
  };

  const quickActions = useMemo(() => [
    {
      title: "Add Patient",
      description: "Add a new patient by ID",
      icon: UserPlus,
      color: "bg-primary/10 text-primary",
      onClick: () => setAddDialogOpen(true),
    },
    {
      title: "My Patients",
      description: "View and manage patient records",
      icon: Users,
      href: "/doctor/patients",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Appointments",
      description: "Manage schedule and visits",
      icon: Calendar,
      href: "/doctor/appointments",
      color: "bg-amber-500/10 text-amber-600",
    },
    {
      title: "Prescriptions",
      description: "View all issued prescriptions",
      icon: Pill,
      href: "/doctor/prescriptions",
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "My QR Code",
      description: "Share with patients to connect",
      icon: QrCode,
      href: "/doctor/qr-code",
      color: "bg-purple-500/10 text-purple-600",
    },
  ], []);

  // Filter prescriptions by hospital context - memoized
  const contextPrescriptions = useMemo(() => selectedHospitalId
    ? prescriptions?.filter((rx: any) => rx.hospital_id === selectedHospitalId)
    : prescriptions, [prescriptions, selectedHospitalId]);
  const contextActivePrescriptions = useMemo(() => contextPrescriptions?.filter((rx: any) => rx.is_active)?.length || 0, [contextPrescriptions]);

  // Workload calculations (needed for stats and banner)
  const todayStr = format(startOfToday(), "yyyy-MM-dd");
  const todayAppts = appointments.filter(a => a.appointment_date === todayStr);
  const pendingAppts = todayAppts.filter(a => a.status === "scheduled").length;
  const urgentAppts = todayAppts.filter(a => a.appointment_type === "urgent" || a.appointment_type === "emergency").length;
  const pendingActionsCount = pendingAppts +
    (prescriptions?.filter((rx: any) => rx.is_active && !rx.is_signed)?.length || 0);

  const stats = useMemo(() => [
    {
      title: "Total Patients",
      value: totalPatients,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      href: "/doctor/patients",
    },
    {
      title: "Today's Appts",
      value: todayAppts.length,
      icon: Calendar,
      color: "text-accent-foreground",
      bgColor: "bg-accent/10",
      href: "/doctor/appointments",
    },
    {
      title: "Active Rx",
      value: contextActivePrescriptions,
      icon: Pill,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      href: "/doctor/prescriptions",
    },
    {
      title: "Pending Actions",
      value: pendingActionsCount,
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
      href: "/doctor/appointments",
    },
  ], [totalPatients, todayAppts.length, contextActivePrescriptions, pendingActionsCount]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const selectedHospital = hospitals.find((h) => h.hospital_id === selectedHospitalId);

  // Time-of-day gradient theming
  const hour = new Date().getHours();
  const timeGradient = hour < 12
    ? "from-primary via-primary/80 to-amber-500/60" // warm morning
    : hour < 17
      ? "from-primary to-primary/70" // neutral afternoon
      : "from-primary via-primary/80 to-indigo-600/60"; // cool evening

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* PWA Install Prompt - mobile only */}
      <PWAInstallBanner />
      {/* Welcome Banner - Enhanced with workload pulse */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className={`bg-gradient-to-r ${timeGradient} p-3 sm:p-6`}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-sm sm:text-2xl font-bold text-white truncate">
                {getGreeting()}, {profile?.full_name?.split(" ")[0] || "Doctor"} 👋
              </h1>
              <p className="text-[10px] sm:text-sm text-white/70 hidden sm:block">
                {profile?.specialty || "General"} {profile?.license_number ? `• ${profile.license_number}` : ""}
              </p>
              {/* Workload pulse */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Badge className="bg-white/20 text-white border-0 text-[10px] sm:text-xs backdrop-blur-sm">
                  {todayAppts.length} appointments
                </Badge>
                {pendingAppts > 0 && (
                  <Badge className="bg-amber-400/30 text-white border-0 text-[10px] sm:text-xs backdrop-blur-sm">
                    {pendingAppts} pending
                  </Badge>
                )}
                {urgentAppts > 0 && (
                  <Badge className="bg-destructive/40 text-white border-0 text-[10px] sm:text-xs backdrop-blur-sm">
                    {urgentAppts} urgent
                  </Badge>
                )}
                {/* Hospital context on mobile */}
                {selectedHospital && (
                  <Badge className="bg-white/15 text-white border-0 text-[10px] backdrop-blur-sm sm:hidden">
                    {selectedHospital.hospital?.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedHospital && (
                <Badge variant="outline" className="border-white/30 bg-white/15 text-white backdrop-blur-sm text-[10px] sm:text-xs hidden sm:flex">
                  {selectedHospital.hospital?.name}
                </Badge>
              )}
              {profile?.is_verified ? (
                <Badge variant="outline" className="border-white/30 bg-white/15 text-white backdrop-blur-sm w-fit text-[10px] sm:text-xs shrink-0">
                  <BadgeCheck className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Row - Horizontal scroll on mobile, 4-col grid on desktop */}
      <div className="relative">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible">
          {stats.map((stat) => (
            <Link key={stat.title} to={stat.href} className="snap-start shrink-0 w-[120px] sm:w-auto">
              <Card className="hover:shadow-md active:scale-95 transition-all cursor-pointer h-full group">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className={`h-9 w-9 rounded-lg ${stat.bgColor} flex items-center justify-center mx-auto mb-1 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                  </div>
                  <AnimatedCounter value={stat.value} className="text-xl sm:text-2xl font-bold" />
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stat.title}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Specialty Focus Section */}
      {specialtyConfig.dashboardHighlights.length > 0 && profile?.specialty && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5" />
            {profile.specialty} Focus
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {specialtyConfig.dashboardHighlights.map((highlight) => (
              <Card key={highlight.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium truncate">{highlight.label}</p>
                  <p className="text-[10px] text-muted-foreground">{highlight.filterType.replace(/_/g, ' ')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {specialtyConfig.clinicalFocus.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {specialtyConfig.clinicalFocus.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] sm:text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Two-column desktop layout - single column mobile with reordered sections */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left Column - Operational */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          <TodayAgendaCard />
          <PatientQueueCard />

          {/* Quick Actions - 2x2 grid on mobile, list on desktop (moved up for mobile) */}
          <div className="sm:hidden">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => {
                const content = (
                  <Card
                    key={action.title}
                    className="active:scale-95 transition-transform cursor-pointer h-full"
                    onClick={action.onClick}
                  >
                    <CardContent className="p-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[90px]">
                      <div
                        className={`h-10 w-10 rounded-xl ${action.color} flex items-center justify-center`}
                      >
                        <action.icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-medium text-xs leading-tight">{action.title}</h3>
                    </CardContent>
                  </Card>
                );
                return action.href ? (
                  <Link key={action.title} to={action.href}>{content}</Link>
                ) : (
                  <div key={action.title}>{content}</div>
                );
              })}
            </div>
          </div>

          <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
            <BulkRenewalCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
            <ChronicPatientRegistryCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
            <MissedFollowUpsCard />
          </Suspense>
        </div>

        {/* Right Column - Summary / Navigation (desktop) */}
        <div className="space-y-4 sm:space-y-6">
          <DoctorProfileCompletionCard />

          {/* Quick Actions - list style on desktop only */}
          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid gap-2">
              {quickActions.map((action) => {
                const content = (
                  <Card
                    key={action.title}
                    className="hover:shadow-md transition-shadow cursor-pointer h-full"
                    onClick={action.onClick}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{action.title}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {action.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
                return action.href ? (
                  <Link key={action.title} to={action.href}>{content}</Link>
                ) : (
                  <div key={action.title}>{content}</div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Section */}
      <Collapsible open={bottomOpen} onOpenChange={setBottomOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground h-9 sm:h-10">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${bottomOpen ? "rotate-180" : ""}`} />
            {bottomOpen ? "Hide" : "Show"} Doctor Info
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          {/* Compact Doctor Info */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                <Avatar className="h-10 w-10 sm:h-14 sm:w-14 shrink-0">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-sm sm:text-lg bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base truncate">{profile?.full_name || "—"}</h3>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">ID: {doctorId}</Badge>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 mt-1 text-[10px] sm:text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" />{profile?.specialty || "—"}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{profile?.experience_years ? `${profile.experience_years}y` : "—"}</span>
                    <span className="flex items-center gap-1"><Award className="h-3 w-3" />{profile?.license_number || "—"}</span>
                  </div>
                </div>
                {!isStaff && (
                  <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
                    <Link to="/doctor/profile"><Edit className="h-3.5 w-3.5 mr-1.5" />Edit</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Patients */}
          {recentPatients.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  Recent Patients
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8" asChild>
                  <Link to="/doctor/patients">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 sm:space-y-2">
                  {recentPatients.map((patient: any) => (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-2 sm:p-2.5 border rounded-lg gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Avatar className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] sm:text-sm">
                            {patient.display_name?.[0]?.toUpperCase() || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">
                            {patient.display_name || "Unknown Patient"}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                            {patient.granted_at
                              ? format(new Date(patient.granted_at), "MMM d")
                              : "Recent"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={patient.is_active ? "default" : "secondary"} className="text-[10px] sm:text-xs flex-shrink-0">
                        {patient.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Add Patient Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) resetDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient by ID</DialogTitle>
            <DialogDescription>
              Enter the patient's 8-character ID to add them to your patient list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient-code">Patient ID</Label>
              <div className="flex gap-2">
                <Input
                  id="patient-code"
                  placeholder="e.g., ABCD1234"
                  value={patientCode}
                  onChange={(e) => {
                    setPatientCode(e.target.value.toUpperCase());
                    setLookupResult(null);
                  }}
                  maxLength={8}
                  className="uppercase"
                />
                <Button
                  onClick={handleLookup}
                  disabled={patientCode.length < 8 || isLookingUp}
                >
                  {isLookingUp ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {lookupResult && (
              <div className="rounded-lg border p-4">
                {lookupResult.found ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-700">Patient Found</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {lookupResult.display_name?.[0]?.toUpperCase() || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{lookupResult.display_name || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          {lookupResult.gender && `${lookupResult.gender}`}
                          {lookupResult.age && `, ${lookupResult.age} years old`}
                        </p>
                      </div>
                    </div>
                    {lookupResult.already_connected ? (
                      <Badge variant="secondary">Already in your patient list</Badge>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={handleAddPatient}
                        disabled={grantAccess.isPending}
                      >
                        {grantAccess.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        Add to My Patients
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    <span>No patient found with this ID</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorDashboard;
