import { useEffect, useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientHealthData, useUpdatePatientAccess } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions, Prescription, Medication } from "@/hooks/usePrescriptions";
import { PrescriptionViewDialog } from "./PrescriptionViewDialog";
import { CreatePrescriptionDialog, PrescriptionPrefillData } from "./CreatePrescriptionDialog";
import { PatientHistoryTimeline } from "./PatientHistoryTimeline";
import { PatientNotesSection } from "./PatientNotesSection";
import { ExportPatientButton } from "./ExportPatientButton";
import { VitalsTrendSparkline } from "./VitalsTrendSparkline";
import { PatientHealthScoreCard } from "@/components/doctor/PatientHealthScoreCard";
import { MedicationInteractionWarning } from "@/components/doctor/MedicationInteractionWarning";
import PatientIdentityBadge from "@/components/hospital/PatientIdentityBadge";
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
  FileText,
  AlertCircle,
  ClipboardList,
  Eye,
  Clock,
  StickyNote,
  Repeat,
  Activity,
  Shield,
  MessageSquare,
  Microscope,
  Send,
} from "lucide-react";
import { PatientRecordItem } from "./PatientRecordItem";
import { ChronicCarePlanCard } from "./ChronicCarePlanCard";

interface DoctorPatientDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: {
    patient_id: string;
    display_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
  } | null;
}

type TabType = "details" | "timeline" | "notes" | "vitals";

export const DoctorPatientDetailsDialog = ({
  open,
  onOpenChange,
  patient,
}: DoctorPatientDetailsDialogProps) => {
  const { data, isLoading, error } = usePatientHealthData(open ? patient?.patient_id || null : null);
  const { data: prescriptions, isLoading: prescriptionsLoading } = useDoctorPrescriptions(
    open ? patient?.patient_id || undefined : undefined
  );
  const updateAccess = useUpdatePatientAccess();

  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showPrescriptionView, setShowPrescriptionView] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [repeatData, setRepeatData] = useState<{ prefill: PrescriptionPrefillData } | null>(null);

  // Update last accessed when opening
  useEffect(() => {
    if (open && patient?.patient_id) {
      updateAccess.mutate(patient.patient_id);
    }
  }, [open, patient?.patient_id]);

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = patient?.date_of_birth ? calculateAge(patient.date_of_birth) : null;

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionView(true);
  };

  const handleRepeatPrescription = (prescription: Prescription) => {
    setRepeatData({
      prefill: {
        diagnosis: prescription.diagnosis || undefined,
        medications: prescription.medications.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          instructions: m.instructions,
        })),
        instructions: prescription.instructions || undefined,
      },
    });
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden">
          <ResponsiveDialogHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                  {data?.profile?.avatar_url && (
                    <AvatarImage src={data.profile.avatar_url} alt={patient?.display_name || "Patient"} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {patient?.display_name?.[0]?.toUpperCase() || "P"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <ResponsiveDialogTitle className="text-lg truncate">
                    {patient?.display_name || "Unknown Patient"}
                  </ResponsiveDialogTitle>
                  <ResponsiveDialogDescription className="text-left flex items-center gap-2 flex-wrap mt-1">
                    {patient?.gender && <span>{patient.gender}</span>}
                    {age && <span>• {age} years old</span>}
                    <PatientIdentityBadge
                      hasGhpid={!!data?.profile?.patient_passport_id}
                      hasPhone={!!data?.profile?.phone}
                    />
                  </ResponsiveDialogDescription>
                </div>
              </div>

              {/* Quick Actions Strip + Health Score */}
              {patient && (
                <div className="flex flex-col gap-2 pl-0 sm:pl-14">
                  <div className="flex items-center gap-3">
                    <PatientHealthScoreCard patientId={patient.patient_id} />
                    <ExportPatientButton patient={patient} />
                  </div>
                  {/* Consent-Based Access Notice */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Shield className="h-3 w-3 text-primary" />
                    <span>Records shared by patient consent</span>
                  </div>
                </div>
              )}
            </div>
          </ResponsiveDialogHeader>

          <ScrollArea className="max-h-[calc(90vh-140px)] -mr-2 pr-2 [&_[data-radix-scroll-area-scrollbar]]:w-1.5 [&_[data-radix-scroll-area-thumb]]:rounded-full [&_[data-radix-scroll-area-thumb]]:bg-border">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-3" />
                <p>Failed to load patient data</p>
                <p className="text-xs mt-1">The patient may have revoked access to their records.</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="details" className="text-xs sm:text-sm">
                    <Heart className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Details</span>
                  </TabsTrigger>
                  <TabsTrigger value="vitals" className="text-xs sm:text-sm">
                    <Activity className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Vitals</span>
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs sm:text-sm">
                    <Clock className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Timeline</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs sm:text-sm">
                    <StickyNote className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Notes</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="vitals" className="mt-0">
                  <VitalsTrendSparkline patientId={patient?.patient_id} />
                </TabsContent>

                <TabsContent value="timeline" className="mt-0">
                  <PatientHistoryTimeline
                    prescriptions={prescriptions || []}
                    records={data?.records || []}
                    onViewPrescription={handleViewPrescription}
                  />
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  {patient && (
                    <PatientNotesSection patientId={patient.patient_id} />
                  )}
                </TabsContent>

                <TabsContent value="details" className="mt-0">
                  <div className="space-y-6">
                    {/* Profile Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Profile Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Full Name</p>
                            <p className="font-medium">{data?.profile?.display_name || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Gender</p>
                            <p className="font-medium">{data?.profile?.gender || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Date of Birth
                            </p>
                            <p className="font-medium">
                              {data?.profile?.date_of_birth
                                ? format(new Date(data.profile.date_of_birth), "MMM d, yyyy")
                                : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              Phone
                            </p>
                            <p className="font-medium">{data?.profile?.phone || "—"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Health Data Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Health Information
                          <Badge variant="outline" className="ml-auto text-[10px] gap-1">
                            <Shield className="h-3 w-3" />
                            Patient-owned
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1">
                              <Droplets className="h-3 w-3" />
                              Blood Group
                            </p>
                            <p className="font-medium">
                              {data?.healthData?.blood_group ? (
                                <Badge variant="outline">{data.healthData.blood_group}</Badge>
                              ) : (
                                "—"
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Height</p>
                            <p className="font-medium">{data?.healthData?.height || "—"}</p>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div>
                            <p className="text-muted-foreground flex items-center gap-1 mb-1">
                              <AlertTriangle className="h-3 w-3" />
                              Allergies
                            </p>
                            <p className="text-sm">
                              {data?.healthData?.health_allergies || "None reported"}
                            </p>
                          </div>

                          <div>
                            <p className="text-muted-foreground flex items-center gap-1 mb-1">
                              <Pill className="h-3 w-3" />
                              Current Medications
                            </p>
                            <p className="text-sm">
                              {data?.healthData?.current_medications || "None reported"}
                            </p>
                          </div>

                          <div>
                            <p className="text-muted-foreground mb-1">Chronic Diseases</p>
                            <p className="text-sm">
                              {data?.healthData?.chronic_diseases || "None reported"}
                            </p>
                          </div>
                        </div>

                        {/* Chronic Care Plan Card */}
                        <ChronicCarePlanCard
                          patientId={patient?.patient_id || ""}
                          chronicDiseases={data?.healthData?.chronic_diseases}
                        />

                        <Separator />

                        <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Emergency Contact</p>
                            <p className="font-medium">
                              {data?.healthData?.emergency_contact_name || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Emergency Phone</p>
                            <p className="font-medium">
                              {data?.healthData?.emergency_contact_phone || "—"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Prescriptions Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardList className="h-4 w-4" />
                          My Prescriptions ({prescriptions?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Auto-check interactions across all active prescriptions */}
                        {prescriptions && prescriptions.filter(p => p.is_active).length > 0 && (() => {
                          const allMeds = prescriptions
                            .filter(p => p.is_active)
                            .flatMap(p => p.medications.map((m: any) => ({
                              name: m.medication_name || m.name,
                              dosage: m.dosage,
                              frequency: m.frequency,
                            })));
                          return allMeds.length >= 2 ? (
                            <MedicationInteractionWarning
                              medications={allMeds}
                              patientAllergies={data?.healthData?.health_allergies?.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)}
                              currentMedications={data?.healthData?.current_medications}
                              chronicConditions={data?.healthData?.chronic_diseases?.split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)}
                            />
                          ) : null;
                        })()}
                        {prescriptionsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : prescriptions && prescriptions.length > 0 ? (
                          <div className="space-y-2">
                            {prescriptions.map((prescription) => (
                              <div
                                key={prescription.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {prescription.diagnosis || "Prescription"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(prescription.created_at), "MMM d, yyyy")}
                                      {" • "}
                                      {prescription.medications.length} medication
                                      {prescription.medications.length !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                  <Badge 
                                    variant={prescription.is_active ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {prescription.is_active ? "Active" : "Done"}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewPrescription(prescription)}
                                    className="h-8 px-2"
                                  >
                                    <Eye className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">View</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRepeatPrescription(prescription)}
                                    className="h-8 px-2"
                                  >
                                    <Repeat className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">Repeat</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No prescriptions issued to this patient
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Health Records Section */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Health Records ({data?.records?.length || 0})
                          <Badge variant="outline" className="ml-auto text-[10px] gap-1">
                            <Shield className="h-3 w-3" />
                            Shared by consent
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {data?.records?.length > 0 ? (
                          <div className="space-y-2">
                            {data.records.map((record: any) => (
                              <PatientRecordItem key={record.id} record={record} />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">
                              No health records shared
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              The patient has not shared health records with you yet.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </ScrollArea>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Prescription View Dialog */}
      <PrescriptionViewDialog
        open={showPrescriptionView}
        onOpenChange={setShowPrescriptionView}
        prescription={selectedPrescription}
        patientName={patient?.display_name || undefined}
      />

      {/* Repeat Prescription Dialog */}
      {repeatData && patient && (
        <CreatePrescriptionDialog
          open={!!repeatData}
          onOpenChange={(open) => !open && setRepeatData(null)}
          patient={{ patient_id: patient.patient_id, display_name: patient.display_name }}
          initialData={repeatData.prefill}
        />
      )}
    </>
  );
};
