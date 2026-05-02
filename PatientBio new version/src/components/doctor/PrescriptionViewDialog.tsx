import { useRef, useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { Prescription, useTogglePrescriptionStatus, formatTimingPattern } from "@/hooks/usePrescriptions";
import { EditPrescriptionDialog } from "./EditPrescriptionDialog";
import { exportPrescriptionToPDF } from "@/lib/pdfExport";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { 
  Printer, 
  Stethoscope, 
  User, 
  Calendar, 
  Pill, 
  FileText, 
  Pencil, 
  CheckCircle, 
  RotateCcw,
  Loader2,
  Download,
  ClipboardList,
  TestTubes,
  MessageSquare,
} from "lucide-react";

const generatePrescriptionId = (id: string) => `RX-${id.substring(0, 8).toUpperCase()}`;

interface PrescriptionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: Prescription | null;
  patientName?: string;
}

export const PrescriptionViewDialog = ({
  open,
  onOpenChange,
  prescription,
  patientName,
}: PrescriptionViewDialogProps) => {
  const { data: doctorProfile } = useDoctorProfile();
  const toggleStatus = useTogglePrescriptionStatus();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  const specialtyConfig = getSpecialtyConfig(doctorProfile?.specialty);
  const fmt = specialtyConfig.prescriptionFormat;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const rxId = prescription ? generatePrescriptionId(prescription.id) : "";

    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
         <head>
          <title>Prescription ${rxId} - ${doctorProfile?.full_name || "Doctor"}</title>
          <meta http-equiv="Content-Security-Policy" content="script-src 'none'">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              color: #1a1a1a;
              position: relative;
            }
            body::before {
              content: "ORIGINAL";
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              font-weight: bold;
              color: rgba(0, 0, 0, 0.04);
              pointer-events: none;
              z-index: 1000;
              white-space: nowrap;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid ${fmt.headerColor};
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .doctor-name {
              font-size: 24px;
              font-weight: bold;
              color: ${fmt.headerColor};
              margin-bottom: 4px;
            }
            .doctor-details {
              font-size: 12px;
              color: #666;
            }
            .rx-id {
              font-size: 11px;
              color: #999;
              font-family: monospace;
              margin-top: 4px;
            }
            .specialty-subtitle {
              font-size: 11px;
              color: ${fmt.headerColor};
              font-style: italic;
              margin-top: 2px;
            }
            .patient-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 24px;
              padding: 16px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .section {
              margin-bottom: 24px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              color: ${fmt.headerColor};
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .diagnosis {
              font-size: 16px;
              font-weight: 500;
              padding: 12px;
              background: #e8f4ff;
              border-radius: 6px;
            }
            .med-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .med-table th {
              background: ${fmt.headerColor};
              color: white;
              padding: 10px;
              text-align: left;
              font-size: 12px;
            }
            .med-table td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              font-size: 13px;
            }
            .med-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .instructions {
              padding: 16px;
              background: #fffbeb;
              border-left: 4px solid #f59e0b;
              border-radius: 0 6px 6px 0;
            }
            .advice-section {
              padding: 16px;
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              border-radius: 0 6px 6px 0;
            }
            .footer {
              margin-top: 48px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .signature-area {
              text-align: center;
            }
            .signature-line {
              width: 200px;
              border-top: 1px solid #333;
              margin-top: 60px;
              padding-top: 8px;
              font-size: 12px;
            }
            .follow-up {
              padding: 12px 16px;
              background: #e8f5e9;
              border-radius: 6px;
              font-size: 14px;
            }
            .legal-disclaimer {
              font-size: 8px;
              color: #999;
              text-align: center;
              margin-top: 24px;
              padding-top: 8px;
              border-top: 1px solid #eee;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportPDF = () => {
    if (!prescription) return;
    
    const doctorInfo = doctorProfile ? {
      name: doctorProfile.full_name,
      specialty: doctorProfile.specialty || undefined,
      qualification: doctorProfile.qualification || undefined,
      phone: doctorProfile.phone || undefined,
    } : undefined;

    const patientInfo = {
      name: patientName || `Patient ${prescription.patient_id.substring(0, 8).toUpperCase()}`,
    };

    try {
      exportPrescriptionToPDF(prescription, patientInfo, doctorInfo, fmt);
      toast.success("Prescription exported as PDF");
    } catch (error) {
      toast.error("Failed to export PDF");
      console.error(error);
    }
  };

  const handleToggleStatus = async () => {
    if (!prescription) return;
    
    await toggleStatus.mutateAsync({
      id: prescription.id,
      is_active: !prescription.is_active,
    });
    
    setShowStatusConfirm(false);
  };

  if (!prescription) return null;

  const rxId = generatePrescriptionId(prescription.id);
  const hasTimingPattern = prescription.medications.some(m => m.timingPattern && (m.timingPattern.morning > 0 || m.timingPattern.noon > 0 || m.timingPattern.night > 0));

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader className="space-y-3">
            <ResponsiveDialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 shrink-0" />
              Prescription Details
              <Badge variant="outline" className="text-xs font-mono ml-1">{rxId}</Badge>
            </ResponsiveDialogTitle>
            <div className="flex items-center flex-wrap gap-1.5">
              <Button onClick={() => setShowEditDialog(true)} size="sm" variant="outline" className="h-8 text-xs px-3">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
              <Button onClick={handleExportPDF} size="sm" variant="outline" className="h-8 text-xs px-3">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
              <Button onClick={handlePrint} size="sm" variant="outline" className="h-8 text-xs px-3">
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print
              </Button>
              <Button
                onClick={() => setShowStatusConfirm(true)} 
                size="sm"
                variant={prescription.is_active ? "default" : "secondary"}
                className="h-8 text-xs px-3"
              >
                {prescription.is_active ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    Mark Completed
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reactivate
                  </>
                )}
              </Button>
            </div>
          </ResponsiveDialogHeader>

          {/* Printable Content */}
          <div ref={printRef} className="space-y-6">
            {/* Header */}
            <div className="header text-center pb-4" style={{ borderBottom: `2px solid ${fmt.headerColor}` }}>
              <h1 className="doctor-name text-2xl font-bold" style={{ color: fmt.headerColor }}>
                {fmt.specialtyIcon} {doctorProfile?.full_name || "Doctor Name"}
              </h1>
              <p className="doctor-details text-sm text-muted-foreground">
                {doctorProfile?.qualification && `${doctorProfile.qualification} • `}
                {doctorProfile?.specialty && `${doctorProfile.specialty} • `}
                {doctorProfile?.license_number && `Reg. No: ${doctorProfile.license_number}`}
              </p>
              <p className="text-xs italic mt-1" style={{ color: fmt.headerColor }}>
                {fmt.headerSubtitle}
              </p>
              {doctorProfile?.phone && (
                <p className="doctor-details text-xs text-muted-foreground mt-1">
                  Phone: {doctorProfile.phone}
                </p>
              )}
              <p className="rx-id text-xs text-muted-foreground font-mono mt-2">{rxId}</p>
            </div>

            {/* Patient Info & Date */}
            <div className="patient-info flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 p-3 sm:p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">
                    {patientName || `ID: ${prescription.patient_id.substring(0, 8).toUpperCase()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(prescription.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>

            {/* Chief Complaints */}
            {prescription.chief_complaints && (
              <div className="section">
                <h3 className="section-title text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: fmt.headerColor }}>
                  <ClipboardList className="h-4 w-4" />
                  Chief Complaints
                </h3>
                <div className="p-3 bg-muted/50 rounded-md text-sm">
                  {prescription.chief_complaints}
                </div>
              </div>
            )}

            {/* Diagnosis */}
            {prescription.diagnosis && (
              <div className="section">
                <h3 className="section-title text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: fmt.headerColor }}>
                  <Stethoscope className="h-4 w-4" />
                  Diagnosis
                </h3>
                <div className="diagnosis p-3 bg-primary/5 rounded-md">
                  {prescription.diagnosis}
                </div>
              </div>
            )}

            {/* Investigations */}
            {prescription.investigations && (
              <div className="section">
                <h3 className="section-title text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: fmt.headerColor }}>
                  <TestTubes className="h-4 w-4" />
                  Investigations
                </h3>
                <div className="p-3 bg-violet-50 dark:bg-violet-950/20 border-l-4 border-violet-400 rounded-r-md text-sm">
                  {prescription.investigations}
                </div>
              </div>
            )}

            {/* Medications */}
            <div className="section">
              <h3 className="section-title text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: fmt.headerColor }}>
                <Pill className="h-4 w-4" />
                Medications
              </h3>
              {/* Desktop table */}
              <div className="hidden sm:block border rounded-lg overflow-hidden">
                <table className="med-table w-full">
                  <thead>
                    <tr className="text-left text-xs text-white" style={{ backgroundColor: fmt.headerColor }}>
                      <th className="p-3">#</th>
                      <th className="p-3">Medication</th>
                      <th className="p-3">Dosage</th>
                      <th className="p-3">Frequency</th>
                      {hasTimingPattern && <th className="p-3">Timing</th>}
                      <th className="p-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescription.medications.map((med, index) => (
                      <tr key={index} className="border-t text-sm">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-medium">
                          {med.name}
                          {med.instructions && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {med.instructions}
                            </p>
                          )}
                        </td>
                        <td className="p-3">{med.dosage}</td>
                        <td className="p-3">{med.frequency}</td>
                        {hasTimingPattern && (
                          <td className="p-3">
                            {med.timingPattern ? (
                              <Badge variant="secondary" className="text-xs font-mono">
                                {formatTimingPattern(med.timingPattern)}
                              </Badge>
                            ) : "-"}
                          </td>
                        )}
                        <td className="p-3">{med.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile card layout */}
              <div className="sm:hidden space-y-2">
                {prescription.medications.map((med, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-1.5 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{index + 1}. {med.name}</p>
                      <Badge variant="outline" className="text-xs">{med.dosage}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{med.frequency}</span>
                      <span>• {med.duration}</span>
                      {med.timingPattern && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          {formatTimingPattern(med.timingPattern)}
                        </Badge>
                      )}
                    </div>
                    {med.instructions && (
                      <p className="text-xs text-muted-foreground italic">{med.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {prescription.instructions && (
              <div className="section">
                <h3 className="section-title text-sm font-semibold mb-2" style={{ color: fmt.headerColor }}>
                  Instructions
                </h3>
                <div className="instructions p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-400 rounded-r-md">
                  {prescription.instructions}
                </div>
              </div>
            )}

            {/* Advice */}
            {prescription.advice && (
              <div className="section">
                <h3 className="section-title text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: fmt.headerColor }}>
                  <MessageSquare className="h-4 w-4" />
                  Advice
                </h3>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 rounded-r-md">
                  {prescription.advice}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {prescription.follow_up_date && (
              <div className="follow-up flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <strong>Follow-up:</strong>{" "}
                  {format(new Date(prescription.follow_up_date), "MMMM d, yyyy")}
                </span>
              </div>
            )}

            {/* Legal Disclaimer */}
            {fmt.legalDisclaimer && (
              <div className="legal-disclaimer text-[10px] text-muted-foreground text-center pt-2 border-t border-muted">
                {fmt.legalDisclaimer}
              </div>
            )}

            <Separator />

            {/* Footer */}
            <div className="footer flex justify-between items-end pt-6">
              <div>
                <Badge variant={prescription.is_active ? "default" : "secondary"}>
                  {prescription.is_active ? "Active" : "Completed"}
                </Badge>
              </div>
              <div className="signature-area text-center">
                <div className="signature-line w-48 border-t border-foreground mt-16 pt-2 text-xs text-muted-foreground">
                  Doctor's Signature
                  {doctorProfile?.full_name && (
                    <p className="font-medium text-foreground mt-1">{doctorProfile.full_name}</p>
                  )}
                  {doctorProfile?.qualification && (
                    <p className="text-[10px]">{doctorProfile.qualification}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Edit Dialog */}
      {showEditDialog && (
        <EditPrescriptionDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          prescription={prescription}
          patientName={patientName}
        />
      )}

      {/* Status Toggle Confirmation */}
      <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {prescription.is_active ? "Mark as Completed?" : "Reactivate Prescription?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {prescription.is_active
                ? "This will mark the prescription as completed. The patient will still be able to view it."
                : "This will reactivate the prescription, marking it as an active treatment."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleStatus}
              disabled={toggleStatus.isPending}
            >
              {toggleStatus.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {prescription.is_active ? "Mark Completed" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};