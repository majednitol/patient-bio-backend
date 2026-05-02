import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyMembers, RELATIONSHIP_OPTIONS } from "@/hooks/useFamilyMembers";
import { useDoctorConnections } from "@/hooks/useDoctorConnections";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import ShareWithDoctorDialog from "@/components/dashboard/ShareWithDoctorDialog";
import {
  ArrowLeft,
  User,
  Heart,
  Baby,
  ShieldCheck,
  FileText,
  Pill,
  Calendar,
  Share2,
  Activity,
  Droplets,
  AlertTriangle,
  Phone,
  Cake,
  Copy,
} from "lucide-react";
import { format, differenceInYears, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";

const FamilyMemberProfilePage = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: familyMembers } = useFamilyMembers();
  const { doctors: doctorConnections, isLoading: doctorsLoading } = useDoctorConnections();

  const member = familyMembers?.find(
    (m) => m.patient_id === memberId && m.account_holder_id === user?.id
  );

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["family-member-profile", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, date_of_birth, gender, phone, avatar_url, patient_passport_id, created_at, updated_at")
        .eq("user_id", memberId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId && !!member,
  });

  const { data: healthData } = useQuery({
    queryKey: ["family-health-data", memberId],
    queryFn: async () => {
      const { data } = await supabase
        .from("health_data")
        .select("blood_group, health_allergies")
        .eq("user_id", memberId!)
        .single();
      return data;
    },
    enabled: !!memberId && !!member,
  });

  const { data: healthRecords } = useQuery({
    queryKey: ["family-health-records", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_records")
        .select("id, title, category, disease_category, uploaded_at")
        .eq("user_id", memberId!)
        .order("uploaded_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!memberId && !!member,
  });

  const { data: prescriptions } = useQuery({
    queryKey: ["family-prescriptions", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, diagnosis, medications, created_at, doctor_id")
        .eq("patient_id", memberId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!memberId && !!member,
  });

  const { data: appointments } = useQuery({
    queryKey: ["family-appointments", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, end_time, status, reason, doctor_id")
        .eq("patient_id", memberId!)
        .order("appointment_date", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!memberId && !!member,
  });

  const { data: labReports } = useQuery({
    queryKey: ["family-lab-reports", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pathologist_reports")
        .select("id, report_name, report_type, has_abnormal_values, created_at, is_shared_with_patient")
        .eq("patient_id", memberId!)
        .eq("is_shared_with_patient", true)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!memberId && !!member,
  });

  if (!member) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/family")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Family
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Member Not Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This family member doesn't exist or you don't have access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const getRelationshipLabel = (value: string) =>
    RELATIONSHIP_OPTIONS.find((r) => r.value === value)?.label || value;

  const getRelIcon = (rel: string) => {
    switch (rel) {
      case "child": return Baby;
      case "parent":
      case "guardian": return ShieldCheck;
      case "spouse": return Heart;
      default: return User;
    }
  };

  const RelIcon = getRelIcon(member.relationship);
  const age = profile?.date_of_birth
    ? differenceInYears(new Date(), parseISO(profile.date_of_birth))
    : null;

  const copyPassportId = () => {
    if (profile?.patient_passport_id) {
      navigator.clipboard.writeText(profile.patient_passport_id);
      toast.success("Health Passport ID copied");
    }
  };

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Button variant="ghost" onClick={() => navigate("/dashboard/family")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Family Members
      </Button>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl">
                <RelIcon className="h-7 w-7" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{profile?.display_name || "Unknown"}</h1>
                <Badge variant="secondary">{getRelationshipLabel(member.relationship)}</Badge>
                {member.can_manage_records && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <FileText className="h-3 w-3" /> Managed
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {profile?.patient_passport_id && (
                  <button
                    onClick={copyPassportId}
                    className="flex items-center gap-1.5 font-mono hover:text-foreground transition-colors"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    {profile.patient_passport_id}
                    <Copy className="h-3 w-3" />
                  </button>
                )}
                {age !== null && (
                  <span className="flex items-center gap-1.5">
                    <Cake className="h-3.5 w-3.5" /> {age} years
                  </span>
                )}
                {profile?.gender && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {profile.gender}
                  </span>
                )}
                {profile?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {profile.phone}
                  </span>
                )}
              </div>

              {/* Health at a Glance */}
              <div className="flex flex-wrap gap-3 mt-4">
                {healthData?.blood_group && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Droplets className="h-3 w-3 text-destructive" /> {healthData.blood_group}
                  </Badge>
                )}
                {healthData?.health_allergies && (
                  <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
                    <AlertTriangle className="h-3 w-3" /> {healthData.health_allergies}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <ShareWithDoctorDialog
                doctors={doctorConnections || []}
                doctorsLoading={doctorsLoading}
                patientId={member.patient_id}
                patientName={profile?.display_name || "Family Member"}
                trigger={
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" /> Share
                  </Button>
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{healthRecords?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Health Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Pill className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{prescriptions?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Prescriptions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{appointments?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{labReports?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Lab Reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Health Records */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Health Records
            </CardTitle>
            <CardDescription>Uploaded medical documents</CardDescription>
          </CardHeader>
          <CardContent>
            {healthRecords && healthRecords.length > 0 ? (
              <div className="space-y-2">
                {healthRecords.slice(0, 5).map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {rec.category && <Badge variant="outline" className="text-xs mr-1">{rec.category}</Badge>}
                        {format(new Date(rec.uploaded_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No records yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" /> Prescriptions
            </CardTitle>
            <CardDescription>Medications and diagnoses</CardDescription>
          </CardHeader>
          <CardContent>
            {prescriptions && prescriptions.length > 0 ? (
              <div className="space-y-2">
                {prescriptions.slice(0, 5).map((rx) => {
                  const meds = Array.isArray(rx.medications) ? rx.medications : [];
                  return (
                    <div key={rx.id} className="p-2 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium">{rx.diagnosis || "Prescription"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {meds.length} medication{meds.length !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(rx.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No prescriptions yet</p>
            )}
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Appointments
            </CardTitle>
            <CardDescription>Scheduled and past visits</CardDescription>
          </CardHeader>
          <CardContent>
            {appointments && appointments.length > 0 ? (
              <div className="space-y-2">
                {appointments.slice(0, 5).map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {format(new Date(appt.appointment_date), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.start_time} - {appt.end_time}
                        {appt.reason && ` • ${appt.reason}`}
                      </p>
                    </div>
                    <Badge
                      variant={appt.status === "completed" ? "default" : appt.status === "cancelled" ? "destructive" : "secondary"}
                      className="text-xs flex-shrink-0"
                    >
                      {appt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No appointments yet</p>
            )}
          </CardContent>
        </Card>

        {/* Lab Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Lab Reports
            </CardTitle>
            <CardDescription>Shared diagnostic results</CardDescription>
          </CardHeader>
          <CardContent>
            {labReports && labReports.length > 0 ? (
              <div className="space-y-2">
                {labReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{report.report_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {report.report_type && <Badge variant="outline" className="text-xs mr-1">{report.report_type}</Badge>}
                        {format(new Date(report.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    {report.has_abnormal_values && (
                      <Badge variant="destructive" className="text-xs flex-shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Abnormal
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No lab reports yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FamilyMemberProfilePage;
