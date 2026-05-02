import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePatientHealthData, useUpdatePatientAccess } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions, Prescription } from "@/hooks/usePrescriptions";
import { AutoBriefCard } from "./AutoBriefCard";
import { PatientHistoryTimeline } from "./PatientHistoryTimeline";
import { PatientNotesSection } from "./PatientNotesSection";
import { VitalsTrendSparkline } from "./VitalsTrendSparkline";
import { PatientHealthScoreCard } from "./PatientHealthScoreCard";
import { PrescriptionViewDialog } from "./PrescriptionViewDialog";
import { format } from "date-fns";
import {
  Loader2,
  User,
  Phone,
  Calendar,
  Droplets,
  AlertTriangle,
  Pill,
  Heart,
  AlertCircle,
  Clock,
  StickyNote,
  Activity,
  Eye,
} from "lucide-react";

interface PatientDetailsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    patient_id: string;
    display_name: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
  } | null;
}

type TabType = "details" | "vitals" | "timeline" | "notes";

export function PatientDetailsSidebar({ open, onOpenChange, patient }: PatientDetailsSidebarProps) {
  const { data, isLoading, error } = usePatientHealthData(open ? patient?.patient_id || null : null);
  const { data: prescriptions } = useDoctorPrescriptions(open ? patient?.patient_id || undefined : undefined);
  const updateAccess = useUpdatePatientAccess();
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [viewRx, setViewRx] = useState<Prescription | null>(null);

  useEffect(() => {
    if (open && patient?.patient_id) {
      updateAccess.mutate(patient.patient_id);
    }
  }, [open, patient?.patient_id]);

  const calculateAge = (dob: string | null | undefined) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const age = calculateAge(patient?.date_of_birth || data?.profile?.date_of_birth);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-[100vw] sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                {data?.profile?.avatar_url && (
                  <AvatarImage src={data.profile.avatar_url} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {patient?.display_name?.[0]?.toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base truncate">
                  {patient?.display_name || "Patient"}
                </SheetTitle>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {data?.profile?.gender && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      {data.profile.gender}
                    </Badge>
                  )}
                  {age && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      {age}y
                    </Badge>
                  )}
                  {data?.healthData?.blood_group && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      <Droplets className="h-2.5 w-2.5 mr-0.5" />
                      {data.healthData.blood_group}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="text-sm">Failed to load patient data</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="flex-1 flex flex-col min-h-0">
              <div className="px-4 pt-2">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="details" className="text-[11px] gap-1">
                    <Heart className="h-3 w-3" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger value="vitals" className="text-[11px] gap-1">
                    <Activity className="h-3 w-3" />
                    Vitals
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-[11px] gap-1">
                    <Clock className="h-3 w-3" />
                    Hx
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-[11px] gap-1">
                    <StickyNote className="h-3 w-3" />
                    Notes
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 px-4 pb-4 pt-2">
                <TabsContent value="details" className="mt-0 space-y-3">
                  {/* AI Pre-Brief */}
                  {patient && (
                    <AutoBriefCard
                      patientId={patient.patient_id}
                      enabled={open}
                    />
                  )}
                  {/* Contact */}
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Name</p>
                          <p className="font-medium text-xs">{data?.profile?.display_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Phone</p>
                          <p className="font-medium text-xs">{data?.profile?.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">DOB</p>
                          <p className="font-medium text-xs">
                            {data?.profile?.date_of_birth
                              ? format(new Date(data.profile.date_of_birth), "MMM d, yyyy")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Gender</p>
                          <p className="font-medium text-xs">{data?.profile?.gender || "—"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Health Score */}
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <PatientHealthScoreCard patientId={patient?.patient_id || ""} />
                    </CardContent>
                  </Card>

                  {/* Allergies */}
                  {data?.healthData?.health_allergies && data.healthData.health_allergies.toLowerCase() !== "none" && (
                    <Card className="border-destructive/30 bg-destructive/5">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          <p className="text-xs font-semibold text-destructive">Allergies</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {data.healthData.health_allergies.split(/[,;]/).map((a, i) => (
                            <Badge key={i} variant="destructive" className="text-[10px]">{a.trim()}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Health info */}
                  <Card>
                    <CardContent className="pt-3 pb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase">Blood</p>
                          <p className="font-medium">{data?.healthData?.blood_group || "—"}</p>
                        </div>
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase">Height</p>
                          <p className="font-medium">{data?.healthData?.height || "—"}</p>
                        </div>
                      </div>
                      {data?.healthData?.chronic_diseases && data.healthData.chronic_diseases.toLowerCase() !== "none" && (
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase">Chronic</p>
                          <p className="text-xs">{data.healthData.chronic_diseases}</p>
                        </div>
                      )}
                      {data?.healthData?.current_medications && (
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-[10px] text-muted-foreground uppercase">Medications</p>
                          <p className="text-xs">{data.healthData.current_medications}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Rx */}
                  {prescriptions && prescriptions.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="text-xs flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5 text-primary" />
                          Recent Prescriptions ({prescriptions.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 space-y-1.5">
                        {prescriptions.slice(0, 3).map((rx) => (
                          <div
                            key={rx.id}
                            className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setViewRx(rx)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{rx.diagnosis || "Prescription"}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(rx.created_at), "MMM d")} · {rx.medications.length} med{rx.medications.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="vitals" className="mt-0">
                  <VitalsTrendSparkline patientId={patient?.patient_id} />
                </TabsContent>

                <TabsContent value="timeline" className="mt-0">
                  <PatientHistoryTimeline
                    prescriptions={prescriptions || []}
                    records={data?.records || []}
                    onViewPrescription={(rx) => setViewRx(rx)}
                  />
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  {patient && <PatientNotesSection patientId={patient.patient_id} />}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>

      {viewRx && (
        <PrescriptionViewDialog
          open={!!viewRx}
          onOpenChange={(o) => !o && setViewRx(null)}
          prescription={viewRx}
        />
      )}
    </>
  );
}
