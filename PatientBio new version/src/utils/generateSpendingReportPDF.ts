import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfSafe } from "@/utils/pdfSafe";

interface SpendingMonth {
  month: string;
  total: number;
  consultation: number;
  medication: number;
  lab_test: number;
  other: number;
}

interface SpendingReportData {
  totalSpent: number;
  byMonth: SpendingMonth[];
  invoiceCount: number;
  patientName: string;
}

export function generateSpendingReportPDF(data: SpendingReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(33, 33, 33);
  doc.text("Healthcare Spending Report", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Patient: ${pdfSafe(data.patientName)}`, 14, 32);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-BD")}`, 14, 38);
  doc.text(`Total Invoices: ${data.invoiceCount}`, 14, 44);

  // Summary
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text(`Total Spending: ৳${data.totalSpent.toLocaleString("en-BD")}`, 14, 56);

  // Monthly breakdown table
  if (data.byMonth.length > 0) {
    const tableData = data.byMonth.map((m) => [
      m.month,
      `৳${m.consultation.toLocaleString("en-BD")}`,
      `৳${m.medication.toLocaleString("en-BD")}`,
      `৳${m.lab_test.toLocaleString("en-BD")}`,
      `৳${m.other.toLocaleString("en-BD")}`,
      `৳${m.total.toLocaleString("en-BD")}`,
    ]);

    autoTable(doc, {
      startY: 64,
      head: [["Month", "Consultation", "Medication", "Lab Tests", "Other", "Total"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        5: { fontStyle: "bold" },
      },
    });
  }

  // Footer
  const finalY = (doc as any).lastAutoTable?.finalY || 80;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("This report is for informational purposes only.", 14, finalY + 15);

  doc.save(`spending-report-${new Date().toISOString().split("T")[0]}.pdf`);
}
