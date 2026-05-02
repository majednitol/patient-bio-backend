import { format } from "date-fns";
import type { Prescription, Medication } from "@/hooks/usePrescriptions";
import type { PrescriptionFormat } from "@/constants/specialtyConfig";

// Transfer History Item for Discharge Summary
export interface TransferHistoryItem {
  transferredAt: string;
  fromWard: string | null;
  fromBed: string | null;
  toWard: string;
  toBed: string;
  reason: string;
}

// Administered Medication Item for Discharge Summary
export interface AdministeredMedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  status: string;
  administrationCount: number;
  skippedCount: number;
  notes?: string;
}

// Discharge Summary Types
export interface DischargeSummaryData {
  admission: {
    admissionDate: string;
    dischargeDate: string | null;
    stayDuration: number;
    ward: string | null;
    bedNumber: string | null;
    admissionReason: string | null;
    diagnosis: string | null;
    dischargeNotes: string | null;
  };
  patient: {
    id: string;
    name: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
  };
  hospital: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
  };
  doctor: {
    name: string;
    specialty?: string;
  };
  medications: Medication[];
  transfers?: TransferHistoryItem[];
  administeredMedications?: AdministeredMedicationItem[];
}

interface PatientInfo {
  name: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  phone?: string;
}

interface DoctorInfo {
  name: string;
  specialty?: string;
  qualification?: string;
  phone?: string;
}

// Dynamic import helper for jsPDF
const loadPDFLibraries = async () => {
  const [jsPDFModule, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return {
    jsPDF: jsPDFModule.default,
    autoTable: autoTableModule.default,
  };
};

// Re-export shared pdfSafe for backward compatibility within this module
import { pdfSafe } from "@/utils/pdfSafe";
export { pdfSafe };

// Convert hex color to RGB tuple
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 102, 204]; // fallback blue
}

export const exportPrescriptionToPDF = async (
  prescription: Prescription,
  patientInfo: PatientInfo,
  doctorInfo?: DoctorInfo,
  specialtyFormat?: PrescriptionFormat
) => {
  const { jsPDF, autoTable } = await loadPDFLibraries();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  const headerRgb = specialtyFormat ? hexToRgb(specialtyFormat.headerColor) : [37, 99, 235] as [number, number, number];
  const accentRgb = specialtyFormat?.accentColor || [37, 99, 235] as [number, number, number];

  const rxId = `RX-${prescription.id.substring(0, 8).toUpperCase()}`;

  // Watermark
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
  doc.setFontSize(60);
  doc.setTextColor(0);
  doc.text("ORIGINAL", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  doc.restoreGraphicsState();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(...headerRgb);
  doc.text("Medical Prescription", pageWidth / 2, 20, { align: "center" });
  
  // Prescription ID + Date
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(rxId, 15, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Date: ${format(new Date(prescription.created_at), "MMMM d, yyyy")}`,
    pageWidth - 15,
    20,
    { align: "right" }
  );

  // Doctor Info
  let yPos = 35;
  if (doctorInfo) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(pdfSafe(`Dr. ${doctorInfo.name}`), 15, yPos);
    yPos += 6;
    
    if (doctorInfo.specialty || doctorInfo.qualification) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      const details = [doctorInfo.specialty, doctorInfo.qualification]
        .filter(Boolean)
        .map(pdfSafe)
        .join(" | ");
      doc.text(details, 15, yPos);
      yPos += 6;
    }

    if (specialtyFormat?.headerSubtitle) {
      doc.setFontSize(9);
      doc.setTextColor(...headerRgb);
      doc.text(pdfSafe(specialtyFormat.headerSubtitle), 15, yPos);
      yPos += 6;
    }

    if (doctorInfo.phone) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Phone: ${pdfSafe(doctorInfo.phone)}`, 15, yPos);
      yPos += 6;
    }
  }

  // Divider
  yPos += 5;
  doc.setDrawColor(200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Patient Info
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Patient Information", 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Name: ${pdfSafe(patientInfo.name)}`, 15, yPos);
  yPos += 5;
  
  const patientDetails = [];
  if (patientInfo.gender) patientDetails.push(`Gender: ${pdfSafe(patientInfo.gender)}`);
  if (patientInfo.dateOfBirth) {
    const dob = new Date(patientInfo.dateOfBirth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    patientDetails.push(`Age: ${age} years`);
    patientDetails.push(`DOB: ${format(dob, "MMM d, yyyy")}`);
  }
  if (patientInfo.bloodGroup) patientDetails.push(`Blood Group: ${pdfSafe(patientInfo.bloodGroup)}`);
  
  if (patientDetails.length > 0) {
    doc.text(patientDetails.join(" | "), 15, yPos);
    yPos += 8;
  }

  // Chief Complaints
  if (prescription.chief_complaints) {
    yPos += 3;
    doc.setFontSize(11);
    doc.setTextColor(...headerRgb);
    doc.text("Chief Complaints", 15, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const ccLines = doc.splitTextToSize(pdfSafe(prescription.chief_complaints), pageWidth - 30);
    doc.text(ccLines, 15, yPos);
    yPos += ccLines.length * 5 + 5;
  }

  // Diagnosis
  if (prescription.diagnosis) {
    yPos += 3;
    doc.setFontSize(11);
    doc.setTextColor(...headerRgb);
    doc.text("Diagnosis", 15, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(pdfSafe(prescription.diagnosis), 15, yPos);
    yPos += 10;
  }

  // Investigations
  if (prescription.investigations) {
    doc.setFontSize(11);
    doc.setTextColor(...headerRgb);
    doc.text("Investigations", 15, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const invLines = doc.splitTextToSize(pdfSafe(prescription.investigations), pageWidth - 30);
    doc.text(invLines, 15, yPos);
    yPos += invLines.length * 5 + 5;
  }

  // Medications Table
  yPos += 3;
  doc.setFontSize(11);
  doc.setTextColor(...headerRgb);
  doc.text("Prescribed Medications", 15, yPos);
  yPos += 5;

  const hasTimingPattern = prescription.medications.some(m => m.timingPattern && (m.timingPattern.morning > 0 || m.timingPattern.noon > 0 || m.timingPattern.night > 0));

  const headers = hasTimingPattern
    ? [["#", "Medication", "Dosage", "Frequency", "Timing", "Duration", "Instructions"]]
    : [["#", "Medication", "Dosage", "Frequency", "Duration", "Instructions"]];

  const medicationData = prescription.medications.map((med, index) => {
    const timingStr = med.timingPattern
      ? `${med.timingPattern.morning}+${med.timingPattern.noon}+${med.timingPattern.night}`
      : "-";
    const row = [(index + 1).toString(), pdfSafe(med.name), pdfSafe(med.dosage), pdfSafe(med.frequency)];
    if (hasTimingPattern) row.push(timingStr);
    row.push(pdfSafe(med.duration), pdfSafe(med.instructions) || "-");
    return row;
  });

  const colStyles: Record<number, { cellWidth: number }> = hasTimingPattern
    ? { 0: { cellWidth: 8 }, 1: { cellWidth: 30 }, 2: { cellWidth: 20 }, 3: { cellWidth: 25 }, 4: { cellWidth: 18 }, 5: { cellWidth: 20 }, 6: { cellWidth: 40 } }
    : { 0: { cellWidth: 10 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 30 }, 4: { cellWidth: 25 }, 5: { cellWidth: 45 } };

  autoTable(doc, {
    startY: yPos,
    head: headers,
    body: medicationData,
    theme: "striped",
    headStyles: {
      fillColor: accentRgb,
      textColor: 255,
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: colStyles,
    margin: { left: 15, right: 15 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
  let currentY = finalY + 10;

  // General Instructions
  if (prescription.instructions) {
    doc.setFontSize(11);
    doc.setTextColor(...headerRgb);
    doc.text("General Instructions", 15, currentY);
    currentY += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const splitInstructions = doc.splitTextToSize(pdfSafe(prescription.instructions), pageWidth - 30);
    doc.text(splitInstructions, 15, currentY);
    currentY += splitInstructions.length * 5 + 8;
  }

  // Advice
  if (prescription.advice) {
    doc.setFontSize(11);
    doc.setTextColor(...headerRgb);
    doc.text("ADVICE", 15, currentY);
    currentY += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const splitAdvice = doc.splitTextToSize(pdfSafe(prescription.advice), pageWidth - 30);
    doc.text(splitAdvice, 15, currentY);
    currentY += splitAdvice.length * 5 + 8;
  }

  // Follow-up
  if (prescription.follow_up_date) {
    doc.setFontSize(10);
    doc.setTextColor(...headerRgb);
    doc.text(
      `Follow-up Date: ${format(new Date(prescription.follow_up_date), "MMMM d, yyyy")}`,
      15,
      currentY
    );
    currentY += 10;
  }

  // Legal Disclaimer
  if (specialtyFormat?.legalDisclaimer) {
    const disclaimerY = pageHeight - 25;
    doc.setFontSize(7);
    doc.setTextColor(150);
    const disclaimerLines = doc.splitTextToSize(pdfSafe(specialtyFormat.legalDisclaimer), pageWidth - 30);
    doc.text(disclaimerLines, 15, disclaimerY);
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(rxId, 15, footerY);
  doc.text("Generated from Health Records Platform", pageWidth / 2, footerY, {
    align: "center",
  });

  // Save
  const fileName = `prescription_${rxId}_${patientInfo.name.replace(/\s+/g, "_")}_${format(
    new Date(prescription.created_at),
    "yyyy-MM-dd"
  )}.pdf`;
  doc.save(fileName);
};

export const exportPatientSummaryToPDF = async (
  patientInfo: PatientInfo & {
    allergies?: string;
    medications?: string;
    chronicDiseases?: string;
  },
  prescriptions: Prescription[],
  doctorInfo?: DoctorInfo
) => {
  const { jsPDF, autoTable } = await loadPDFLibraries();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(37, 99, 235);
  doc.text("Patient Summary Report", pageWidth / 2, 20, { align: "center" });

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageWidth - 15, 20, {
    align: "right",
  });

  let yPos = 35;

  // Patient Info Section
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Patient Information", 15, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(60);

  const infoLines = [
    `Name: ${pdfSafe(patientInfo.name)}`,
    patientInfo.gender ? `Gender: ${pdfSafe(patientInfo.gender)}` : null,
    patientInfo.dateOfBirth
      ? `Date of Birth: ${format(new Date(patientInfo.dateOfBirth), "MMMM d, yyyy")}`
      : null,
    patientInfo.bloodGroup ? `Blood Group: ${pdfSafe(patientInfo.bloodGroup)}` : null,
    patientInfo.phone ? `Phone: ${pdfSafe(patientInfo.phone)}` : null,
  ].filter(Boolean) as string[];

  infoLines.forEach((line) => {
    doc.text(line, 15, yPos);
    yPos += 5;
  });

  // Health Data Section
  yPos += 5;
  doc.setDrawColor(200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Health Information", 15, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setTextColor(60);

  if (patientInfo.allergies) {
    doc.text(`Allergies: ${pdfSafe(patientInfo.allergies)}`, 15, yPos);
    yPos += 5;
  }
  if (patientInfo.medications) {
    doc.text(`Current Medications: ${pdfSafe(patientInfo.medications)}`, 15, yPos);
    yPos += 5;
  }
  if (patientInfo.chronicDiseases) {
    doc.text(`Chronic Conditions: ${pdfSafe(patientInfo.chronicDiseases)}`, 15, yPos);
    yPos += 5;
  }

  // Prescriptions Section
  if (prescriptions.length > 0) {
    yPos += 5;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Prescription History (${prescriptions.length})`, 15, yPos);
    yPos += 5;

    const prescriptionData = prescriptions.map((rx, index) => [
      (index + 1).toString(),
      format(new Date(rx.created_at), "MMM d, yyyy"),
      pdfSafe(rx.diagnosis) || "-",
      rx.medications.map((m) => pdfSafe(m.name)).join(", "),
      rx.is_active ? "Active" : "Completed",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Date", "Diagnosis", "Medications", "Status"]],
      body: prescriptionData,
      theme: "striped",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 28 },
        2: { cellWidth: 45 },
        3: { cellWidth: 60 },
        4: { cellWidth: 22 },
      },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated from Health Records Platform", pageWidth / 2, footerY, {
    align: "center",
  });

  // Save
  const fileName = `patient_summary_${patientInfo.name.replace(/\s+/g, "_")}_${format(
    new Date(),
    "yyyy-MM-dd"
  )}.pdf`;
  doc.save(fileName);
};

export const exportDischargeSummaryToPDF = async (data: DischargeSummaryData) => {
  const { jsPDF, autoTable } = await loadPDFLibraries();
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header - Hospital Name and Title
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(pdfSafe(data.hospital.name), 15, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  let headerY = 26;
  if (data.hospital.address) {
    doc.text(pdfSafe(data.hospital.address), 15, headerY);
    headerY += 4;
  }
  if (data.hospital.city && data.hospital.state) {
    doc.text(`${pdfSafe(data.hospital.city)}, ${pdfSafe(data.hospital.state)}`, 15, headerY);
    headerY += 4;
  }
  if (data.hospital.phone) {
    doc.text(`Phone: ${pdfSafe(data.hospital.phone)}`, 15, headerY);
  }

  // Title on right side
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text("DISCHARGE SUMMARY", pageWidth - 15, 20, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    data.admission.dischargeDate
      ? format(new Date(data.admission.dischargeDate), "MMMM d, yyyy")
      : "Pending Discharge",
    pageWidth - 15,
    26,
    { align: "right" }
  );

  // Divider
  let yPos = 40;
  doc.setDrawColor(200);
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Patient Information Section
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("PATIENT INFORMATION", 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Name: ${pdfSafe(data.patient.name)}`, 15, yPos);
  doc.text(`ID: ${data.patient.id.substring(0, 8).toUpperCase()}`, 100, yPos);
  yPos += 5;

  const patientDetails = [];
  if (data.patient.dateOfBirth) {
    patientDetails.push(`DOB: ${format(new Date(data.patient.dateOfBirth), "MMM d, yyyy")}`);
  }
  if (data.patient.gender) {
    patientDetails.push(`Gender: ${pdfSafe(data.patient.gender)}`);
  }
  if (data.patient.phone) {
    patientDetails.push(`Phone: ${pdfSafe(data.patient.phone)}`);
  }
  if (patientDetails.length > 0) {
    doc.text(patientDetails.join(" | "), 15, yPos);
    yPos += 8;
  }

  // Divider
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Admission Details Section
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("ADMISSION DETAILS", 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(
    `Admission: ${format(new Date(data.admission.admissionDate), "MMM d, yyyy 'at' h:mm a")}`,
    15,
    yPos
  );
  yPos += 5;
  doc.text(
    `Discharge: ${
      data.admission.dischargeDate
        ? format(new Date(data.admission.dischargeDate), "MMM d, yyyy 'at' h:mm a")
        : "Pending"
    }`,
    15,
    yPos
  );
  yPos += 5;

  const stayText =
    data.admission.stayDuration === 0
      ? "Same day"
      : `${data.admission.stayDuration} day${data.admission.stayDuration !== 1 ? "s" : ""}`;
  doc.text(`Length of Stay: ${stayText}`, 15, yPos);

  const wardBed = `${data.admission.ward || "N/A"} - Bed ${data.admission.bedNumber || "N/A"}`;
  doc.text(`Ward/Bed: ${wardBed}`, 100, yPos);
  yPos += 5;

  doc.text(
    `Attending Physician: Dr. ${pdfSafe(data.doctor.name)}${data.doctor.specialty ? ` (${pdfSafe(data.doctor.specialty)})` : ""}`,
    15,
    yPos
  );
  yPos += 8;

  // Divider
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Clinical Information Section
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("CLINICAL INFORMATION", 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setTextColor(60);

  if (data.admission.admissionReason) {
    doc.setTextColor(100);
    doc.text("Reason for Admission:", 15, yPos);
    yPos += 5;
    doc.setTextColor(60);
    const reasonLines = doc.splitTextToSize(pdfSafe(data.admission.admissionReason), pageWidth - 30);
    doc.text(reasonLines, 15, yPos);
    yPos += reasonLines.length * 4 + 4;
  }

  if (data.admission.diagnosis) {
    doc.setTextColor(100);
    doc.text("Diagnosis:", 15, yPos);
    yPos += 5;
    doc.setTextColor(60);
    const diagLines = doc.splitTextToSize(pdfSafe(data.admission.diagnosis), pageWidth - 30);
    doc.text(diagLines, 15, yPos);
    yPos += diagLines.length * 4 + 4;
  }

  if (data.admission.dischargeNotes) {
    doc.setTextColor(100);
    doc.text("Discharge Notes/Instructions:", 15, yPos);
    yPos += 5;
    doc.setTextColor(60);
    const notesLines = doc.splitTextToSize(pdfSafe(data.admission.dischargeNotes), pageWidth - 30);
    doc.text(notesLines, 15, yPos);
    yPos += notesLines.length * 4 + 4;
  }

  if (!data.admission.admissionReason && !data.admission.diagnosis && !data.admission.dischargeNotes) {
    doc.setTextColor(150);
    doc.text("No clinical notes recorded for this admission.", 15, yPos);
    yPos += 8;
  }

  // Divider
  yPos += 2;
  doc.line(15, yPos, pageWidth - 15, yPos);
  yPos += 10;

  // Medications Section
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("MEDICATIONS DURING STAY", 15, yPos);
  yPos += 5;

  if (data.medications.length > 0) {
    const medicationData = data.medications.map((med, index) => [
      (index + 1).toString(),
      pdfSafe(med.name),
      pdfSafe(med.dosage),
      pdfSafe(med.frequency),
      pdfSafe(med.duration),
      pdfSafe(med.instructions) || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Medication", "Dosage", "Frequency", "Duration", "Instructions"]],
      body: medicationData,
      theme: "striped",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 },
        5: { cellWidth: 45 },
      },
      margin: { left: 15, right: 15 },
    });
    yPos = (doc as any).lastAutoTable?.finalY || yPos + 30;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("No medications prescribed during this admission.", 15, yPos + 5);
    yPos += 15;
  }

  // Administered Medications Section
  if (data.administeredMedications && data.administeredMedications.length > 0) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      yPos = 30;
    }

    yPos += 5;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("ADMINISTERED MEDICATIONS (INPATIENT)", 15, yPos);
    yPos += 5;

    const administeredData = data.administeredMedications.map((med, index) => [
      (index + 1).toString(),
      pdfSafe(med.name),
      pdfSafe(med.dosage),
      `${pdfSafe(med.frequency)} (${pdfSafe(med.route)})`,
      `${med.administrationCount} given${med.skippedCount > 0 ? `, ${med.skippedCount} skipped` : ""}`,
      pdfSafe(med.status),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Medication", "Dosage", "Frequency/Route", "Administrations", "Status"]],
      body: administeredData,
      theme: "striped",
      headStyles: {
        fillColor: [16, 185, 129], // Green for administered meds
        textColor: 255,
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25 },
      },
      margin: { left: 15, right: 15 },
    });
    yPos = (doc as any).lastAutoTable?.finalY || yPos + 30;
  }

  // Transfer History Section
  if (data.transfers && data.transfers.length > 0) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      yPos = 30;
    }

    yPos += 5;
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("TRANSFER HISTORY", 15, yPos);
    yPos += 5;

    const transferData = data.transfers.map((t, index) => [
      (index + 1).toString(),
      format(new Date(t.transferredAt), "MMM d, h:mm a"),
      t.fromWard && t.fromBed ? `${pdfSafe(t.fromWard)} - ${pdfSafe(t.fromBed)}` : "Initial",
      `${pdfSafe(t.toWard)} - ${pdfSafe(t.toBed)}`,
      pdfSafe(t.reason),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["#", "Date/Time", "From", "To", "Reason"]],
      body: transferData,
      theme: "striped",
      headStyles: {
        fillColor: [100, 116, 139], // Slate color for differentiation
        textColor: 255,
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 35 },
      },
      margin: { left: 15, right: 15 },
    });
    yPos = (doc as any).lastAutoTable?.finalY || yPos + 30;
  }

  // Signature Section
  yPos += 20;
  if (yPos > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    yPos = 30;
  }

  doc.setDrawColor(0);
  doc.setFontSize(10);
  doc.setTextColor(60);

  // Patient signature
  doc.line(15, yPos + 15, 80, yPos + 15);
  doc.text("Patient/Guardian Signature", 25, yPos + 22);

  // Physician signature
  doc.line(pageWidth - 80, yPos + 15, pageWidth - 15, yPos + 15);
  doc.text("Physician Signature", pageWidth - 70, yPos + 22);
  doc.text(`Dr. ${pdfSafe(data.doctor.name)}`, pageWidth - 70, yPos + 28);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `This is a computer-generated discharge summary from ${pdfSafe(data.hospital.name)}`,
    pageWidth / 2,
    footerY - 4,
    { align: "center" }
  );
  doc.text(
    `Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Save
  const fileName = `discharge_summary_${data.patient.name.replace(/\s+/g, "_")}_${format(
    new Date(),
    "yyyy-MM-dd"
  )}.pdf`;
  doc.save(fileName);
};
