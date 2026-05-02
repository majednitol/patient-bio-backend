import { formatDoctorName } from "@/utils/formatDoctorName";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { useAdmissions, useAdmissionMutations, Admission } from "@/hooks/useAdmissions";
import { useAvailableBeds } from "@/hooks/useWards";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { UserPlus, Bed, Clock, LogOut, ArrowRightLeft, FileText, Pill, User, FlaskConical, Search, AlertTriangle, Activity } from "lucide-react";
import PatientLookupInput from "@/components/hospital/PatientLookupInput";
import QuickPatientRegisterDialog from "@/components/hospital/QuickPatientRegisterDialog";
import TransferPatientDialog from "@/components/hospital/TransferPatientDialog";
import { format, differenceInDays } from "date-fns";
import DischargeSummaryDialog from "@/components/hospital/DischargeSummaryDialog";
import DischargeChecklistDialog from "@/components/hospital/DischargeChecklistDialog";
import OrderLabTestDialog from "@/components/hospital/OrderLabTestDialog";
import AdmissionMedicationsDialog from "@/components/hospital/AdmissionMedicationsDialog";
import PatientDetailsDialog from "@/components/hospital/PatientDetailsDialog";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
  isDoctor?: boolean;
}

export default function HospitalAdmissionsPage() {
  const { hospital, isAdmin, isDoctor } = useOutletContext<HospitalContext>();
  const { user } = useAuth();
  // Use single query for all admissions, filter client-side (removes duplicate query)
  const { data: allAdmissions, isLoading } = useAdmissions(hospital.id);
  const currentAdmissions = allAdmissions?.filter((a) => a.status === "admitted") || [];
  const { data: availableBeds } = useAvailableBeds(hospital.id);
  const { data: staff } = useHospitalStaff(hospital.id);
  const { createAdmission, dischargePatient, transferBed } = useAdmissionMutations(hospital.id);

  const [admitDialogOpen, setAdmitDialogOpen] = useState(false);
  const [dischargeDialogOpen, setDischargeDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [medicationsDialogOpen, setMedicationsDialogOpen] = useState(false);
  const [patientHistoryDialogOpen, setPatientHistoryDialogOpen] = useState(false);
  const [labOrderDialogOpen, setLabOrderDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [newAdmission, setNewAdmission] = useState({
    patient_id: "",
    bed_id: "",
    admitting_doctor_id: "",
    admission_reason: "",
    diagnosis: "",
    expected_discharge: "",
  });

  

  const doctors = staff?.filter((s) => s.role === "doctor") || [];

  const handleAdmit = async () => {
    await createAdmission.mutateAsync({
      patient_id: newAdmission.patient_id,
      bed_id: newAdmission.bed_id,
      admitting_doctor_id: newAdmission.admitting_doctor_id,
      admission_reason: newAdmission.admission_reason || undefined,
      diagnosis: newAdmission.diagnosis || undefined,
      expected_discharge: newAdmission.expected_discharge || undefined,
    });
    setAdmitDialogOpen(false);
    setNewAdmission({
      patient_id: "",
      bed_id: "",
      admitting_doctor_id: "",
      admission_reason: "",
      diagnosis: "",
      expected_discharge: "",
    });
  };

  const handleDischarge = async (notes: string) => {
    if (!selectedAdmission || !user) return;
    await dischargePatient.mutateAsync({
      admissionId: selectedAdmission.id,
      dischargeNotes: notes || undefined,
      dischargedBy: user.id,
    });
    setDischargeDialogOpen(false);
    setSelectedAdmission(null);
  };

  const openDischargeDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setDischargeDialogOpen(true);
  };

  const openTransferDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setTransferDialogOpen(true);
  };

  const openSummaryDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setSummaryDialogOpen(true);
  };

  const openMedicationsDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setMedicationsDialogOpen(true);
  };

  const openPatientHistoryDialog = (patientId: string) => {
    setSelectedPatientId(patientId);
    setPatientHistoryDialogOpen(true);
  };

  const openLabOrderDialog = (admission: Admission) => {
    setSelectedAdmission(admission);
    setLabOrderDialogOpen(true);
  };

  const getStayDuration = (admissionDate: string) => {
    const days = differenceInDays(new Date(), new Date(admissionDate));
    return days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`;
  };

  const isOverdue = (admission: Admission) => {
    if (admission.status !== "admitted" || !admission.expected_discharge) return false;
    return new Date(admission.expected_discharge) < new Date();
  };

  const renderAdmissionCard = (admission: Admission) => (
    <Card key={admission.id} className={isOverdue(admission) ? "border-destructive/50" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">
                {admission.patient_profile?.display_name || "Unknown Patient"}
              </h3>
              <Badge variant={admission.status === "admitted" ? "default" : "secondary"}>
                {admission.status}
              </Badge>
              {isOverdue(admission) && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue Discharge
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {admission.bed?.ward?.name || "No Ward"}, Bed {admission.bed?.bed_number || "N/A"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDoctorName(admission.doctor_profile?.full_name, "Unknown")} • {admission.doctor_profile?.specialty || "General"}
            </p>
            {admission.diagnosis && (
              <p className="text-sm">
                <span className="text-muted-foreground">Diagnosis:</span> {admission.diagnosis}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getStayDuration(admission.admission_date)}
              </span>
              {admission.expected_discharge && (
                <span>Expected: {format(new Date(admission.expected_discharge), "MMM d, yyyy")}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* View Patient History button - always available */}
            <Button variant="ghost" size="sm" onClick={() => openPatientHistoryDialog(admission.patient_id)}>
              <User className="h-4 w-4 mr-1" />
              History
            </Button>
            {/* View Summary button for discharged patients */}
            {admission.status === "discharged" && (
              <Button variant="outline" size="sm" onClick={() => openSummaryDialog(admission)}>
                <FileText className="h-4 w-4 mr-1" />
                Summary
              </Button>
            )}
            {/* Actions for admitted patients */}
            {admission.status === "admitted" && (isAdmin || isDoctor) && (
              <>
                <Button variant="outline" size="sm" onClick={() => openLabOrderDialog(admission)}>
                  <FlaskConical className="h-4 w-4 mr-1" />
                  Lab Tests
                </Button>
                <Button variant="outline" size="sm" onClick={() => openTransferDialog(admission)}>
                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                  Transfer
                </Button>
                <Button variant="outline" size="sm" onClick={() => openMedicationsDialog(admission)}>
                  <Pill className="h-4 w-4 mr-1" />
                  Medications
                </Button>
                <Button variant="outline" size="sm" onClick={() => openDischargeDialog(admission)}>
                  <LogOut className="h-4 w-4 mr-1" />
                  Discharge
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Search filter function
  const matchesSearch = (admission: Admission) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (admission.patient_profile?.display_name || "").toLowerCase().includes(q) ||
      (admission.diagnosis || "").toLowerCase().includes(q) ||
      (admission.doctor_profile?.full_name || "").toLowerCase().includes(q)
    );
  };

  // Calculate filtered data before hooks
  const dischargedToday = allAdmissions?.filter(
    (a) => a.status === "discharged" && a.actual_discharge &&
      format(new Date(a.actual_discharge), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ) || [];

  const filteredCurrent = currentAdmissions.filter(matchesSearch);
  const filteredDischargedToday = dischargedToday.filter(matchesSearch);
  const filteredAll = (allAdmissions || []).filter(matchesSearch);

  // Avg length of stay for discharged patients
  const dischargedAdmissions = allAdmissions?.filter((a) => a.status === "discharged" && a.actual_discharge) || [];
  const avgLOS = dischargedAdmissions.length > 0
    ? Math.round(dischargedAdmissions.reduce((sum, a) => sum + differenceInDays(new Date(a.actual_discharge!), new Date(a.admission_date)), 0) / dischargedAdmissions.length)
    : 0;

  const overdueCount = currentAdmissions.filter(isOverdue).length;

  // Pagination hooks MUST be called before any early returns
  const currentPagination = usePagination({ data: filteredCurrent, itemsPerPage: 10 });
  const dischargedTodayPagination = usePagination({ data: filteredDischargedToday, itemsPerPage: 10 });
  const allPagination = usePagination({ data: filteredAll, itemsPerPage: 10 });

  if (isLoading) {
    return <PageSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">In-Patient Admissions</h1>
          <p className="text-muted-foreground">Manage patient admissions and discharges</p>
        </div>
        {(isAdmin || isDoctor) && (
          <Dialog open={admitDialogOpen} onOpenChange={setAdmitDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Admit Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Admit New Patient</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <PatientLookupInput
                  value={newAdmission.patient_id}
                  onChange={(patient_id) => setNewAdmission({ ...newAdmission, patient_id })}
                  label="Patient"
                  onRegisterNew={() => setRegisterDialogOpen(true)}
                />
                <div className="space-y-2">
                  <Label>Assign Bed</Label>
                  <Select
                    value={newAdmission.bed_id}
                    onValueChange={(v) => setNewAdmission({ ...newAdmission, bed_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select available bed" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBeds?.map((bed) => (
                        <SelectItem key={bed.id} value={bed.id}>
                          {bed.ward?.name} - Bed {bed.bed_number} (৳{bed.daily_rate}/day)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Admitting Doctor</Label>
                  <Select
                    value={newAdmission.admitting_doctor_id}
                    onValueChange={(v) => setNewAdmission({ ...newAdmission, admitting_doctor_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.user_id}>
                          {doc.doctor_profile?.full_name || "Unknown"} - {doc.doctor_profile?.specialty || "General"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Admission Reason</Label>
                  <Textarea
                    value={newAdmission.admission_reason}
                    onChange={(e) => setNewAdmission({ ...newAdmission, admission_reason: e.target.value })}
                    placeholder="Reason for admission"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Diagnosis</Label>
                  <Input
                    value={newAdmission.diagnosis}
                    onChange={(e) => setNewAdmission({ ...newAdmission, diagnosis: e.target.value })}
                    placeholder="Diagnosis"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected Discharge Date</Label>
                  <Input
                    type="date"
                    value={newAdmission.expected_discharge}
                    onChange={(e) => setNewAdmission({ ...newAdmission, expected_discharge: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAdmitDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAdmit}
                  disabled={!newAdmission.patient_id || !newAdmission.bed_id || !newAdmission.admitting_doctor_id}
                >
                  Admit Patient
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient, doctor, or diagnosis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-3xl font-bold">{currentAdmissions?.length || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bed className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Beds</p>
                <p className="text-3xl font-bold text-green-600">{availableBeds?.length || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Bed className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Discharged Today</p>
                <p className="text-3xl font-bold text-blue-600">{dischargedToday.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Stay</p>
                <p className="text-3xl font-bold">{avgLOS}<span className="text-base font-normal text-muted-foreground ml-1">days</span></p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        {overdueCount > 0 && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-3xl font-bold text-destructive">{overdueCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admissions Tabs */}
      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current ({filteredCurrent.length})</TabsTrigger>
          <TabsTrigger value="discharged-today">Discharged Today ({filteredDischargedToday.length})</TabsTrigger>
          <TabsTrigger value="all">All Admissions</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          {currentAdmissions?.length === 0 ? (
            <InlineEmptyState
              icon={Bed}
              title="No current admissions"
              description="All beds are currently available. Admit a patient to get started."
              action={(isAdmin || isDoctor) ? {
                label: "Admit Patient",
                onClick: () => setAdmitDialogOpen(true),
                icon: UserPlus
              } : undefined}
            />
          ) : (
            <>
              {currentPagination.paginatedData.map(renderAdmissionCard)}
              <DataTablePagination
                currentPage={currentPagination.currentPage}
                totalPages={currentPagination.totalPages}
                onPageChange={currentPagination.goToPage}
                hasNextPage={currentPagination.hasNextPage}
                hasPrevPage={currentPagination.hasPrevPage}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="discharged-today" className="space-y-4 mt-4">
          {dischargedToday.length === 0 ? (
            <InlineEmptyState
              icon={LogOut}
              title="No discharges today"
              description="No patients have been discharged today. Discharged patients will appear here."
            />
          ) : (
            <>
              {dischargedTodayPagination.paginatedData.map(renderAdmissionCard)}
              <DataTablePagination
                currentPage={dischargedTodayPagination.currentPage}
                totalPages={dischargedTodayPagination.totalPages}
                onPageChange={dischargedTodayPagination.goToPage}
                hasNextPage={dischargedTodayPagination.hasNextPage}
                hasPrevPage={dischargedTodayPagination.hasPrevPage}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4 mt-4">
          {allAdmissions?.length === 0 ? (
            <InlineEmptyState
              icon={Bed}
              title="No admissions yet"
              description="Your hospital's admission history will appear here once you start admitting patients."
              action={(isAdmin || isDoctor) ? {
                label: "Admit First Patient",
                onClick: () => setAdmitDialogOpen(true),
                icon: UserPlus
              } : undefined}
            />
          ) : (
            <>
              {allPagination.paginatedData.map(renderAdmissionCard)}
              <DataTablePagination
                currentPage={allPagination.currentPage}
                totalPages={allPagination.totalPages}
                onPageChange={allPagination.goToPage}
                hasNextPage={allPagination.hasNextPage}
                hasPrevPage={allPagination.hasPrevPage}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Discharge Checklist Dialog */}
      <DischargeChecklistDialog
        admission={selectedAdmission}
        hospitalId={hospital.id}
        open={dischargeDialogOpen}
        onOpenChange={setDischargeDialogOpen}
        onConfirmDischarge={handleDischarge}
      />

      {/* Transfer Dialog */}
      <TransferPatientDialog
        admission={selectedAdmission}
        hospitalId={hospital.id}
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
      />

      {/* Discharge Summary Dialog */}
      {selectedAdmission && (
        <DischargeSummaryDialog
          admission={selectedAdmission}
          hospital={hospital}
          open={summaryDialogOpen}
          onOpenChange={setSummaryDialogOpen}
        />
      )}

      {/* Quick Patient Registration Dialog */}
      <QuickPatientRegisterDialog
        hospitalId={hospital.id}
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        onSuccess={(patientId) => {
          setNewAdmission({ ...newAdmission, patient_id: patientId });
        }}
      />

      {/* Medications Dialog */}
      {selectedAdmission && (
        <AdmissionMedicationsDialog
          open={medicationsDialogOpen}
          onOpenChange={setMedicationsDialogOpen}
          admissionId={selectedAdmission.id}
          patientName={selectedAdmission.patient_profile?.display_name || "Patient"}
        />
      )}

      {/* Patient History Dialog */}
      <PatientDetailsDialog
        patientId={selectedPatientId}
        hospitalId={hospital.id}
        onClose={() => {
          setPatientHistoryDialogOpen(false);
          setSelectedPatientId(null);
        }}
      />

      {/* Lab Order Dialog */}
      {selectedAdmission && (
        <OrderLabTestDialog
          open={labOrderDialogOpen}
          onOpenChange={setLabOrderDialogOpen}
          hospitalId={hospital.id}
          patientId={selectedAdmission.patient_id}
          patientName={selectedAdmission.patient_profile?.display_name || "Patient"}
          admissionId={selectedAdmission.id}
          wardBedInfo={selectedAdmission.bed ? `${selectedAdmission.bed.ward?.name} - Bed ${selectedAdmission.bed.bed_number}` : undefined}
        />
      )}
    </div>
  );
}
