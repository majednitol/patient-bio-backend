import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePatientHealthData } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions, Prescription } from "@/hooks/usePrescriptions";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { exportPrescriptionToPDF, exportPatientSummaryToPDF } from "@/lib/pdfExport";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";
import { toast } from "@/hooks/use-toast";
import { Download, FileText, ClipboardList, Loader2 } from "lucide-react";

interface ExportPatientButtonProps {
  patient: {
    patient_id: string;
    display_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
  };
  prescription?: Prescription;
}

export const ExportPatientButton = ({ patient, prescription }: ExportPatientButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const { data: healthData } = usePatientHealthData(patient.patient_id);
  const { data: prescriptions } = useDoctorPrescriptions(patient.patient_id);
  const { data: doctorProfile } = useDoctorProfile();

  const specialtyConfig = getSpecialtyConfig(doctorProfile?.specialty);
  const specialtyFormat = specialtyConfig.prescriptionFormat;

  const doctorInfo = doctorProfile
    ? {
        name: doctorProfile.full_name,
        specialty: doctorProfile.specialty || undefined,
        qualification: doctorProfile.qualification || undefined,
        phone: doctorProfile.phone || undefined,
      }
    : undefined;

  const patientInfo = {
    name: patient.display_name || "Unknown Patient",
    gender: patient.gender || undefined,
    dateOfBirth: patient.date_of_birth || undefined,
    bloodGroup: healthData?.healthData?.blood_group || undefined,
    phone: healthData?.profile?.phone || undefined,
    allergies: healthData?.healthData?.health_allergies || undefined,
    medications: healthData?.healthData?.current_medications || undefined,
    chronicDiseases: healthData?.healthData?.chronic_diseases || undefined,
  };

  const handleExportPrescription = async (rx: Prescription) => {
    setIsExporting(true);
    try {
      await exportPrescriptionToPDF(rx, patientInfo, doctorInfo, specialtyFormat);
      toast.success("Prescription exported as PDF");
    } catch (error) {
      toast.error("Failed to export prescription");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSummary = async () => {
    setIsExporting(true);
    try {
      await exportPatientSummaryToPDF(patientInfo, prescriptions || [], doctorInfo);
      toast.success("Patient summary exported as PDF");
    } catch (error) {
      toast.error("Failed to export summary");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // If a specific prescription is provided, just show a simple export button
  if (prescription) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExportPrescription(prescription)}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-1 hidden sm:inline">Export PDF</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportSummary}>
          <FileText className="h-4 w-4 mr-2" />
          Patient Summary
        </DropdownMenuItem>
        {prescriptions && prescriptions.length > 0 && (
          <>
            <DropdownMenuItem
              onClick={() => prescriptions[0] && handleExportPrescription(prescriptions[0])}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Latest Prescription
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
