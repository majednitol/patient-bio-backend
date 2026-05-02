import { formatDoctorName } from "@/utils/formatDoctorName";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TodayAgendaCard } from "@/components/doctor/TodayAgendaCard";
import { PatientQueueCard } from "@/components/doctor/PatientQueueCard";
import { QuickVitalsForm } from "@/components/doctor/QuickVitalsForm";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useDoctorAppointments } from "@/hooks/useAppointments";
import { useDoctorPatients, useLookupPatientByCode, useGrantPatientAccess } from "@/hooks/useDoctorPatients";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { usePatientCheckIn } from "@/hooks/usePatientCheckIn";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useStaffPermission } from "@/hooks/useStaffPermission";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Users,
  UserPlus,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  Activity,
  MapPinCheck,
  Stethoscope,
  ClipboardCheck,
} from "lucide-react";

export function StaffDashboard() {
  const { staffRecord, effectiveDoctorId } = useStaffAccess();
  const { hasPermission } = useStaffPermission();
  const { data: doctorProfile } = useDoctorProfile(effectiveDoctorId || undefined);
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { appointments } = useDoctorAppointments(
    selectedHospitalId || undefined,
    effectiveDoctorId || undefined
  );
  const checkIn = usePatientCheckIn();

  // Add patient dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [patientCode, setPatientCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const lookupPatient = useLookupPatientByCode();
  const grantAccess = useGrantPatientAccess();

  // Vitals dialog
  const [vitalsPatient, setVitalsPatient] = useState<{
    id: string;
    name: string;
    appointmentId?: string;
  } | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayAppointments = appointments
    .filter((a: any) => a.appointment_date === todayStr && a.status !== "cancelled")
    .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

  const pendingCheckIns = todayAppointments.filter(
    (a: any) => (a.status === "confirmed" || a.status === "scheduled") && !a.checked_in_at
  );
  const arrivedCount = todayAppointments.filter((a: any) => !!a.checked_in_at).length;
  const completedCount = todayAppointments.filter((a: any) => a.status === "completed").length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleLookup = async () => {
    if (patientCode.length < 8) {
      toast.error("Please enter a valid 8-character Patient ID");
      return;
    }
    setIsLookingUp(true);
    try {
      const result = await lookupPatient.mutateAsync(patientCode);
      setLookupResult(result);
    } catch {
      setLookupResult(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddPatient = async () => {
    if (!lookupResult?.patient_id || !effectiveDoctorId) return;
    try {
      await grantAccess.mutateAsync({
        doctorId: effectiveDoctorId,
        patientId: lookupResult.patient_id,
      });
      setAddDialogOpen(false);
      setPatientCode("");
      setLookupResult(null);
      toast.success("Patient added successfully!");
    } catch (error) {
      toast.error("Failed to add patient. Please try again.");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
          {getGreeting()}, {staffRecord?.full_name?.split(" ")[0] || "Staff"}! 👋
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Staff dashboard for <span className="font-medium text-foreground">{formatDoctorName(doctorProfile?.full_name, "...")}</span>
          {doctorProfile?.specialty && (
            <span className="ml-1">· {doctorProfile.specialty}</span>
          )}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{todayAppointments.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Today's Appts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{pendingCheckIns.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Pending Check-ins</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <MapPinCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{arrivedCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Arrived</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold">{completedCount}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-3 sm:gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column - Operational */}
        <div className="space-y-3 sm:space-y-6 min-w-0">
          {/* Patient Queue */}
          {hasPermission("view_appointments") && <PatientQueueCard />}

          {/* Pending Check-ins */}
          {hasPermission("check_in_patients") && pendingCheckIns.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    Pending Check-ins
                  </span>
                  <Badge variant="outline">{pendingCheckIns.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingCheckIns.map((apt: any) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {apt.patient_profile?.display_name?.[0]?.toUpperCase() || "P"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {apt.patient_profile?.display_name || "Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {apt.start_time?.slice(0, 5)}
                          {apt.reason && <> · {apt.reason}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPermission("record_vitals") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1"
                          onClick={() =>
                            setVitalsPatient({
                              id: apt.patient_id,
                              name: apt.patient_profile?.display_name || "Patient",
                              appointmentId: apt.id,
                            })
                          }
                        >
                          <Activity className="h-3 w-3" />
                          Vitals
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="text-xs h-7 gap-1"
                        onClick={() => checkIn.mutate(apt.id)}
                        disabled={checkIn.isPending}
                      >
                        {checkIn.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <MapPinCheck className="h-3 w-3" />
                        )}
                        Check In
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Today's Full Schedule */}
          {hasPermission("view_appointments") && <TodayAgendaCard />}
        </div>

        {/* Right Column - Quick Actions & Vitals */}
        <div className="space-y-3 sm:space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {hasPermission("add_patients") && (
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">Add Patient</p>
                    <p className="text-xs text-muted-foreground">Register by Patient ID</p>
                  </div>
                </Button>
              )}
              {hasPermission("view_patients") && (
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  asChild
                >
                  <Link to="/doctor/patients">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">All Patients</p>
                      <p className="text-xs text-muted-foreground">View patient list</p>
                    </div>
                  </Link>
                </Button>
              )}
              {hasPermission("view_appointments") && (
                <Button
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  asChild
                >
                  <Link to="/doctor/appointments">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Appointments</p>
                      <p className="text-xs text-muted-foreground">Manage schedule</p>
                    </div>
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Inline Vitals for arrived patients */}
          {hasPermission("record_vitals") && todayAppointments
            .filter((a: any) => a.checked_in_at && a.status !== "completed")
            .slice(0, 3)
            .map((apt: any) => (
              <Card key={apt.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    {apt.patient_profile?.display_name || "Patient"}
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {apt.start_time?.slice(0, 5)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QuickVitalsForm
                    patientId={apt.patient_id}
                    appointmentId={apt.id}
                    hospitalId={apt.hospital_id}
                  />
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Vitals Dialog */}
      {vitalsPatient && (
        <Dialog open={!!vitalsPatient} onOpenChange={(open) => !open && setVitalsPatient(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Record Vitals — {vitalsPatient.name}
              </DialogTitle>
            </DialogHeader>
            <QuickVitalsForm
              patientId={vitalsPatient.id}
              appointmentId={vitalsPatient.appointmentId}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Patient Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setPatientCode("");
            setLookupResult(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient by ID</DialogTitle>
            <DialogDescription>
              Enter the patient's 8-character ID to add them to {formatDoctorName(doctorProfile?.full_name)}'s patient list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-patient-code">Patient ID</Label>
              <div className="flex gap-2">
                <Input
                  id="staff-patient-code"
                  placeholder="e.g., ABCD1234"
                  value={patientCode}
                  onChange={(e) => {
                    setPatientCode(e.target.value.toUpperCase());
                    setLookupResult(null);
                  }}
                  maxLength={8}
                  className="uppercase"
                />
                <Button onClick={handleLookup} disabled={patientCode.length < 8 || isLookingUp}>
                  {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
                    <p className="font-medium">{lookupResult.display_name || "Unknown"}</p>
                    {lookupResult.already_connected ? (
                      <Badge variant="secondary">Already in patient list</Badge>
                    ) : (
                      <Button className="w-full" onClick={handleAddPatient} disabled={grantAccess.isPending}>
                        {grantAccess.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Add Patient
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-destructive">
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
}
