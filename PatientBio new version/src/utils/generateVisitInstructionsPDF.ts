import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { pdfSafe } from "@/utils/pdfSafe";

interface VisitInstructionData {
  doctorName?: string;
  clinicName?: string;
  date: string;
  diagnosis?: string;
  summaryText?: string;
  medications?: string;
  followUpInstructions?: string;
}

/**
 * Generates a clean PDF with post-visit patient instructions.
 */
export function generateVisitInstructionsPDF(data: VisitInstructionData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Visit Instructions", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const dateStr = format(new Date(data.date), "MMMM d, yyyy");
  doc.text(`Date: ${dateStr}`, margin, y);
  y += 5;

  if (data.doctorName) {
    doc.text(`Doctor: Dr. ${pdfSafe(data.doctorName)}`, margin, y);
    y += 5;
  }
  if (data.clinicName) {
    doc.text(`Clinic: ${pdfSafe(data.clinicName)}`, margin, y);
    y += 5;
  }

  // Divider
  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setTextColor(0, 0, 0);

  // Diagnosis
  if (data.diagnosis) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Diagnosis", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const diagLines = doc.splitTextToSize(pdfSafe(data.diagnosis), pageWidth - margin * 2);
    doc.text(diagLines, margin, y);
    y += diagLines.length * 5 + 4;
  }

  // Summary
  if (data.summaryText) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(pdfSafe(data.summaryText), pageWidth - margin * 2);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 4;
  }

  // Medications
  if (data.medications) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Medications", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    // Try to parse medications as structured data
    const medLines = pdfSafe(data.medications).split(/[,;\n]+/).map((m) => m.trim()).filter(Boolean);
    if (medLines.length > 1) {
      autoTable(doc, {
        startY: y,
        head: [["#", "Medication"]],
        body: medLines.map((m, i) => [String(i + 1), m]),
        theme: "grid",
        headStyles: { fillColor: [80, 80, 80], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      const medTextLines = doc.splitTextToSize(pdfSafe(data.medications), pageWidth - margin * 2);
      doc.text(medTextLines, margin, y);
      y += medTextLines.length * 5 + 4;
    }
  }

  // Follow-up Instructions
  if (data.followUpInstructions) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Follow-Up Instructions", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const fuLines = doc.splitTextToSize(pdfSafe(data.followUpInstructions), pageWidth - margin * 2);
    doc.text(fuLines, margin, y);
    y += fuLines.length * 5 + 4;
  }

  // Footer disclaimer
  y = Math.max(y + 10, 250);
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  const disclaimer = "This document is for informational purposes only. Please contact your healthcare provider if you have any questions.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
  doc.text(disclaimerLines, margin, y);

  return doc;
}
