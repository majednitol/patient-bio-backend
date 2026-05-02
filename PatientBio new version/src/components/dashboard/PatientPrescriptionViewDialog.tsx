import { useRef } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Prescription, formatTimingPattern } from "@/hooks/usePrescriptions";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";
import { format } from "date-fns";
import { formatDoctorName } from "@/utils/formatDoctorName";
import {
  Printer,
  Stethoscope,
  Calendar,
  Pill,
  FileText,
  Phone,
  Award,
  Sparkles,
  Flag,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  TestTubes,
  MessageSquare,
} from "lucide-react";
import { AISummaryDialog } from "./AISummaryDialog";
import { MedicationCostComparison } from "./MedicationCostComparison";
import { prescriptionHasAntibiotic, getPrescriptionComplications } from "@/utils/prescriptionFlags";

const generatePrescriptionId = (id: string) => `RX-${id.substring(0, 8).toUpperCase()}`;

const buildPrescriptionContext = (prescription: Prescription): string => {
  const parts: string[] = [];

  if (prescription.chief_complaints) {
    parts.push(`Chief Complaints: ${prescription.chief_complaints}`);
  }

  if (prescription.diagnosis) {
    parts.push(`Diagnosis: ${prescription.diagnosis}`);
  }

  if (prescription.investigations) {
    parts.push(`Investigations: ${prescription.investigations}`);
  }

  if (prescription.medications && prescription.medications.length > 0) {
    const medsText = prescription.medications
      .map(
        (med, i) =>
          `${i + 1}. ${med.name} - ${med.dosage}, ${med.frequency}${med.timingPattern ? ` (${formatTimingPattern(med.timingPattern)})` : ""} for ${med.duration}${med.instructions ? ` (${med.instructions})` : ""}`
      )
      .join("\n");
    parts.push(`Medications:\n${medsText}`);
  }

  if (prescription.instructions) {
    parts.push(`Instructions: ${prescription.instructions}`);
  }

  if (prescription.advice) {
    parts.push(`Advice: ${prescription.advice}`);
  }

  if (prescription.follow_up_date) {
    parts.push(`Follow-up date: ${format(new Date(prescription.follow_up_date), "MMMM d, yyyy")}`);
  }

  return parts.join("\n\n");
};

interface PatientPrescriptionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription: Prescription | null;
}

export const PatientPrescriptionViewDialog = ({
  open,
  onOpenChange,
  prescription,
}: PatientPrescriptionViewDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const specialtyConfig = getSpecialtyConfig(prescription?.doctor_specialty);
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
          <title>Prescription ${rxId} - ${prescription?.doctor_name || "Doctor"}</title>
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

  if (!prescription) return null;

  const rxId = generatePrescriptionId(prescription.id);
  const hasTimingPattern = prescription.medications.some(m => m.timingPattern && (m.timingPattern.morning > 0 || m.timingPattern.noon > 0 || m.timingPattern.night > 0));

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm sm:text-base">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Prescription Details
              <Badge variant="outline" className="text-xs font-mono">{rxId}</Badge>
            </span>
            <div className="flex gap-2 shrink-0">
              <AISummaryDialog
                documentTitle={prescription.diagnosis || `Prescription from ${formatDoctorName(prescription.doctor_name)}`}
                documentType="Digital Prescription"
                additionalContext={buildPrescriptionContext(prescription)}
                trigger={
                  <Button size="sm" variant="outline" className="text-xs sm:text-sm">
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    AI Summary
                  </Button>
                }
              />
              <Button onClick={handlePrint} size="sm" variant="outline" className="text-xs sm:text-sm">
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Print</span>
                <span className="sm:hidden">🖨️</span>
              </Button>
            </div>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        {/* Printable Content */}
        <div ref={printRef} className="space-y-4 sm:space-y-6">
          {/* Doctor Header */}
          <div className="header text-center pb-3 sm:pb-4" style={{ borderBottom: `2px solid ${fmt.headerColor}` }}>
            <h1 className="doctor-name text-lg sm:text-2xl font-bold" style={{ color: fmt.headerColor }}>
              {fmt.specialtyIcon} {formatDoctorName(prescription.doctor_name)}
            </h1>
            <div className="doctor-details flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
              {prescription.doctor_qualification && (
                <span className="flex items-center gap-1">
                  <Award className="h-3 w-3 shrink-0" />
                  {prescription.doctor_qualification}
                </span>
              )}
              {prescription.doctor_specialty && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3 shrink-0" />
                    {prescription.doctor_specialty}
                  </span>
                </>
              )}
              {prescription.doctor_phone && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {prescription.doctor_phone}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs italic mt-1" style={{ color: fmt.headerColor }}>
              {fmt.headerSubtitle}
            </p>
            <p className="rx-id text-xs text-muted-foreground font-mono mt-2">{rxId}</p>
          </div>

          {/* Date & Status */}
          <div className="patient-info flex justify-between items-start p-3 sm:p-4 bg-muted rounded-lg gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Date Issued</p>
                <p className="font-medium text-sm sm:text-base">
                  {format(new Date(prescription.created_at), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {prescriptionHasAntibiotic(prescription.medications) && (
                <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 hover:bg-amber-500/20 text-xs">
                  Antibiotic
                </Badge>
              )}
              <Badge variant={prescription.is_active ? "default" : "secondary"}>
                {prescription.is_active ? "Active" : "Completed"}
              </Badge>
            </div>
          </div>

          {/* Complication Alerts */}
          {(() => {
            const complications = getPrescriptionComplications(prescription);
            return complications.length > 0 ? (
              <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <Flag className="h-4 w-4 shrink-0" />
                  {complications.length} item(s) need attention
                </div>
                {complications.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-destructive/80 pl-6">
                    <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                    {c.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                No issues detected
              </div>
            );
          })()}

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
              Medications ({prescription.medications.length})
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
                <div key={index} className="border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{med.name}</span>
                    <Badge variant="outline" className="text-xs">{med.dosage}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{med.frequency}</span>
                    <span>•</span>
                    <span>{med.duration}</span>
                    {med.timingPattern && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {formatTimingPattern(med.timingPattern)}
                      </Badge>
                    )}
                  </div>
                  {med.instructions && (
                    <p className="text-xs text-muted-foreground">{med.instructions}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Medication Cost & Generic Alternatives */}
          <MedicationCostComparison medications={prescription.medications} />

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
              <div className="advice-section p-4 bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-400 rounded-r-md">
                {prescription.advice}
              </div>
            </div>
          )}

          {/* Follow-up */}
          {prescription.follow_up_date && (
            <div className="follow-up flex items-center gap-2 p-3 bg-primary/10 rounded-md">
              <Calendar className="h-4 w-4 text-primary" />
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
            <div className="text-xs text-muted-foreground font-mono">
              {rxId}
            </div>
            <div className="signature-area text-center">
              <div className="signature-line w-48 border-t border-foreground mt-16 pt-2 text-xs text-muted-foreground">
                Doctor's Signature
                {prescription.doctor_name && (
                  <p className="font-medium text-foreground mt-1">{formatDoctorName(prescription.doctor_name)}</p>
                )}
                {prescription.doctor_qualification && (
                  <p className="text-[10px]">{prescription.doctor_qualification}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};