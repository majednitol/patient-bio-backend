import { useCallback, useState } from "react";
import { format } from "date-fns";
import { pdfSafe } from "@/utils/pdfSafe";

interface ExportData {
  headers: string[];
  rows: string[][];
  title: string;
}

function downloadCSV(data: ExportData) {
  const csvContent = [
    data.headers.join(","),
    ...data.rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.title.replace(/\s+/g, "_").toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadPDF(data: ExportData) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(data.title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Exported on ${format(new Date(), "PPP 'at' p")}`, 14, 22);

  autoTable(doc, {
    head: [data.headers],
    body: data.rows.map(row => row.map(pdfSafe)),
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [124, 58, 237] },
  });

  doc.save(`${data.title.replace(/\s+/g, "_").toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function useAdminAnalyticsExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = useCallback(async (data: ExportData) => {
    setIsExporting(true);
    try {
      downloadCSV(data);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportPDF = useCallback(async (data: ExportData) => {
    setIsExporting(true);
    try {
      await downloadPDF(data);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportCSV, exportPDF, isExporting };
}
