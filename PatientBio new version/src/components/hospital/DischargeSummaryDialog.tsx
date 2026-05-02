import { formatDoctorName } from "@/utils/formatDoctorName";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Admission } from "@/hooks/useAdmissions";
import { Hospital } from "@/types/hospital";
import { Medication } from "@/hooks/usePrescriptions";
import { useTransferHistory, TRANSFER_REASONS } from "@/hooks/useTransferHistory";
import { useAdmissionMedications, useMedicationAdministrations, MEDICATION_ROUTES, MEDICATION_FREQUENCIES } from "@/hooks/useAdmissionMedications";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Pill, Download, ArrowRightLeft, Syringe, SkipForward, CheckCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Json } from "@/integrations/supabase/types";
import { exportDischargeSummaryToPDF, DischargeSummaryData, TransferHistoryItem, AdministeredMedicationItem } from "@/lib/pdfExport";
import { toast } from "@/hooks/use-toast";

// Fetch prescriptions during admission period
const useAdmissionPrescriptions = (patientId: string, hospitalId: string, admissionDate: string, dischargeDate: string | null) => {
  return useQuery({
    queryKey: ["admission-prescriptions", patientId, hospitalId, admissionDate],
    queryFn: async () => {
      let query = supabase
        .from("prescriptions")
        .select("id, patient_id, doctor_id, hospital_id, diagnosis, medications, instructions, follow_up_date, notes, created_at")
        .eq("patient_id", patientId)
        .eq("hospital_id", hospitalId)
        .gte("created_at", admissionDate);

      if (dischargeDate) {
        query = query.lte("created_at", dischargeDate);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      return data?.map(p => ({
        ...p,
        medications: (p.medications as Json) as unknown as Medication[],
      })) || [];
    },
    enabled: !!patientId && !!hospitalId,
  });
};

interface DischargeSummaryDialogProps {
  admission: Admission;
  hospital: Hospital;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DischargeSummaryDialog = ({
  admission,
  hospital,
  open,
  onOpenChange,
}: DischargeSummaryDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch prescriptions during the admission period
  const { data: prescriptions } = useAdmissionPrescriptions(
    admission.patient_id,
    hospital.id,
    admission.admission_date,
    admission.actual_discharge
  );

  // Fetch transfer history
  const { data: transferHistory } = useTransferHistory(admission.id);

  // Fetch administered medications for this admission
  const { data: administeredMedications } = useAdmissionMedications(admission.id);

  // Aggregate all medications from prescriptions
  const allMedications = prescriptions?.flatMap(p => p.medications || []) || [];

  const getReasonLabel = (value: string) => {
    return TRANSFER_REASONS.find(r => r.value === value)?.label || value;
  };

  const getRouteLabel = (value: string) => {
    return MEDICATION_ROUTES.find(r => r.value === value)?.label || value;
  };

  const getFrequencyLabel = (value: string) => {
    return MEDICATION_FREQUENCIES.find(f => f.value === value)?.label || value;
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
         <head>
          <title>Discharge Summary - ${admission.patient_profile?.display_name || "Patient"}</title>
          <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              margin: 0; 
              padding: 20px;
              color: #1a1a1a;
            }
            .container { max-width: 210mm; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
            .hospital-name { font-size: 24px; font-weight: bold; }
            .hospital-details { font-size: 12px; color: #666; }
            .title { font-size: 20px; font-weight: bold; text-align: right; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 14px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .field { margin-bottom: 8px; }
            .field-label { font-size: 12px; color: #666; }
            .field-value { font-size: 14px; font-weight: 500; }
            .notes-box { background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 14px; white-space: pre-wrap; }
            .footer { border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 48px; }
            .signature-box { text-align: center; width: 200px; }
            .signature-line { border-top: 1px solid #1a1a1a; margin-top: 48px; padding-top: 8px; font-size: 12px; }
            .med-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .med-table th, .med-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .med-table th { background: #f5f5f5; font-weight: 600; }
            .med-table tr:nth-child(even) { background: #fafafa; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const stayDuration = admission.actual_discharge
    ? differenceInDays(new Date(admission.actual_discharge), new Date(admission.admission_date))
    : differenceInDays(new Date(), new Date(admission.admission_date));

  const handleDownloadPDF = () => {
    try {
      // Map transfer history for PDF
      const transfers: TransferHistoryItem[] = (transferHistory || []).map((t) => ({
        transferredAt: t.transferred_at,
        fromWard: t.from_bed?.ward?.name || null,
        fromBed: t.from_bed?.bed_number || null,
        toWard: t.to_bed?.ward?.name || "Unknown",
        toBed: t.to_bed?.bed_number || "Unknown",
        reason: getReasonLabel(t.transfer_reason),
      }));

      // Map administered medications for PDF
      const administeredMeds: AdministeredMedicationItem[] = (administeredMedications || []).map((med) => ({
        name: med.medication_name,
        dosage: med.dosage,
        frequency: getFrequencyLabel(med.frequency),
        route: getRouteLabel(med.route),
        status: med.status.charAt(0).toUpperCase() + med.status.slice(1),
        administrationCount: med.administration_count || 0,
        skippedCount: 0, // Would need to calculate from administration records
        notes: med.notes || undefined,
      }));

      const data: DischargeSummaryData = {
        admission: {
          admissionDate: admission.admission_date,
          dischargeDate: admission.actual_discharge,
          stayDuration,
          ward: admission.bed?.ward?.name || null,
          bedNumber: admission.bed?.bed_number || null,
          admissionReason: admission.admission_reason,
          diagnosis: admission.diagnosis,
          dischargeNotes: admission.discharge_notes,
        },
        patient: {
          id: admission.patient_id,
          name: admission.patient_profile?.display_name || "Unknown Patient",
          dateOfBirth: admission.patient_profile?.date_of_birth || undefined,
          gender: admission.patient_profile?.gender || undefined,
          phone: admission.patient_profile?.phone || undefined,
        },
        hospital: {
          name: hospital.name,
          address: hospital.address || undefined,
          city: hospital.city || undefined,
          state: hospital.state || undefined,
          phone: hospital.phone || undefined,
        },
        doctor: {
          name: admission.doctor_profile?.full_name || "Unknown",
          specialty: admission.doctor_profile?.specialty || undefined,
        },
        medications: allMedications,
        transfers,
        administeredMedications: administeredMeds,
      };

      exportDischargeSummaryToPDF(data);
      toast.success("Discharge summary downloaded as PDF");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to download PDF");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Discharge Summary</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div ref={printRef} className="space-y-6 py-4">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-foreground pb-4">
            <div>
              <h1 className="text-xl font-bold">{hospital.name}</h1>
              {hospital.address && (
                <p className="text-sm text-muted-foreground">{hospital.address}</p>
              )}
              {hospital.city && hospital.state && (
                <p className="text-sm text-muted-foreground">
                  {hospital.city}, {hospital.state}
                </p>
              )}
              {hospital.phone && (
                <p className="text-sm text-muted-foreground">Phone: {hospital.phone}</p>
              )}
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold">DISCHARGE SUMMARY</h2>
              <p className="text-sm text-muted-foreground">
                {admission.actual_discharge
                  ? format(new Date(admission.actual_discharge), "MMMM d, yyyy")
                  : "Pending Discharge"}
              </p>
            </div>
          </div>

          {/* Patient Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 border-b pb-1">
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Patient Name</p>
                <p className="font-medium">
                  {admission.patient_profile?.display_name || "Unknown Patient"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Patient ID</p>
                <p className="font-medium font-mono">
                  {admission.patient_id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              {admission.patient_profile?.date_of_birth && (
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {format(new Date(admission.patient_profile.date_of_birth), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
              {admission.patient_profile?.gender && (
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{admission.patient_profile.gender}</p>
                </div>
              )}
              {admission.patient_profile?.phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact Number</p>
                  <p className="font-medium">{admission.patient_profile.phone}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Admission Details */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 border-b pb-1">
              Admission Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Admission Date</p>
                <p className="font-medium">
                  {format(new Date(admission.admission_date), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Discharge Date</p>
                <p className="font-medium">
                  {admission.actual_discharge
                    ? format(new Date(admission.actual_discharge), "MMMM d, yyyy 'at' h:mm a")
                    : "Pending"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Length of Stay</p>
                <p className="font-medium">
                  {stayDuration === 0 ? "Same day" : `${stayDuration} day${stayDuration !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ward / Bed</p>
                <p className="font-medium">
                  {admission.bed?.ward?.name || "N/A"} - Bed {admission.bed?.bed_number || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Attending Physician</p>
                <p className="font-medium">
                  {formatDoctorName(admission.doctor_profile?.full_name, "Unknown")}
                  {admission.doctor_profile?.specialty && ` (${admission.doctor_profile.specialty})`}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Clinical Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 border-b pb-1">
              Clinical Information
            </h3>
            <div className="space-y-4">
              {admission.admission_reason && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Reason for Admission</p>
                  <p className="bg-muted/50 p-3 rounded text-sm">{admission.admission_reason}</p>
                </div>
              )}
              {admission.diagnosis && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Diagnosis</p>
                  <p className="bg-muted/50 p-3 rounded text-sm">{admission.diagnosis}</p>
                </div>
              )}
              {admission.discharge_notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Discharge Notes / Instructions</p>
                  <p className="bg-muted/50 p-3 rounded text-sm whitespace-pre-wrap">
                    {admission.discharge_notes}
                  </p>
                </div>
              )}
              {!admission.admission_reason && !admission.diagnosis && !admission.discharge_notes && (
                <p className="text-sm text-muted-foreground italic">
                  No clinical notes recorded for this admission.
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Transfer History */}
          {transferHistory && transferHistory.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 border-b pb-1 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer History
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">Date/Time</TableHead>
                      <TableHead className="w-[25%]">From</TableHead>
                      <TableHead className="w-[25%]">To</TableHead>
                      <TableHead className="w-[25%]">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferHistory.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="text-sm">
                          {format(new Date(transfer.transferred_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transfer.from_bed
                            ? `${transfer.from_bed.ward?.name || "Unknown"} - ${transfer.from_bed.bed_number}`
                            : "Initial Admission"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {transfer.to_bed?.ward?.name || "Unknown"} - {transfer.to_bed?.bed_number || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getReasonLabel(transfer.transfer_reason)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />
            </>
          )}

          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 border-b pb-1 flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Medications During Stay
            </h3>
            {allMedications.length > 0 ? (
              <Table className="med-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Medication</TableHead>
                    <TableHead className="w-[15%]">Dosage</TableHead>
                    <TableHead className="w-[20%]">Frequency</TableHead>
                    <TableHead className="w-[15%]">Duration</TableHead>
                    <TableHead className="w-[25%]">Instructions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMedications.map((med, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{med.name}</TableCell>
                      <TableCell>{med.dosage}</TableCell>
                      <TableCell>{med.frequency}</TableCell>
                      <TableCell>{med.duration}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {med.instructions || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No medications prescribed during this admission.
              </p>
            )}
          </div>

          {/* Administered Medications (Inpatient Tracking) */}
          {administeredMedications && administeredMedications.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3 border-b pb-1 flex items-center gap-2">
                  <Syringe className="h-4 w-4" />
                  Administered Medications (Inpatient)
                </h3>
                <Table className="med-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[25%]">Medication</TableHead>
                      <TableHead className="w-[15%]">Dosage</TableHead>
                      <TableHead className="w-[20%]">Frequency</TableHead>
                      <TableHead className="w-[15%]">Route</TableHead>
                      <TableHead className="w-[15%]">Administrations</TableHead>
                      <TableHead className="w-[10%]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {administeredMedications.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.medication_name}</TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{getFrequencyLabel(med.frequency)}</TableCell>
                        <TableCell>{getRouteLabel(med.route)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-primary" />
                            {med.administration_count || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={med.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {med.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          <Separator />

          {/* Signatures */}
          <div className="pt-8">
            <div className="flex justify-between">
              <div className="text-center w-48">
                <div className="border-t border-foreground pt-2 mt-12">
                  <p className="text-xs text-muted-foreground">Patient/Guardian Signature</p>
                </div>
              </div>
              <div className="text-center w-48">
                <div className="border-t border-foreground pt-2 mt-12">
                  <p className="text-xs text-muted-foreground">Physician Signature</p>
                  <p className="text-xs mt-1">
                    Dr. {admission.doctor_profile?.full_name || "_______________"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 text-center text-xs text-muted-foreground mt-8">
            <p>This is a computer-generated discharge summary from {hospital.name}</p>
            <p className="mt-1">
              Generated on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DischargeSummaryDialog;
