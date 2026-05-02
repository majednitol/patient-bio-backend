import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Appointment, APPOINTMENT_STATUS_OPTIONS } from "@/types/hospital";
import { format, parse } from "date-fns";
import { pdfSafe } from "@/utils/pdfSafe";

interface SchedulePDFOptions {
  appointments: Appointment[];
  doctorName: string;
  dateLabel: string;
  hospitalName?: string;
}

export function generateSchedulePDF({
  appointments,
  doctorName,
  dateLabel,
  hospitalName,
}: SchedulePDFOptions) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text("Appointment Schedule", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Dr. ${pdfSafe(doctorName)}`, 14, 28);
  if (hospitalName) {
    doc.text(pdfSafe(hospitalName), 14, 34);
  }
  doc.text(`Period: ${dateLabel}`, 14, hospitalName ? 40 : 34);
  doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}`, 14, hospitalName ? 46 : 40);

  const startY = hospitalName ? 54 : 48;

  // Group by date
  const grouped = appointments.reduce((acc, appt) => {
    const date = appt.appointment_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(appt);
    return acc;
  }, {} as Record<string, Appointment[]>);

  const formatTime = (time: string) => {
    try {
      const parsed = parse(time, "HH:mm:ss", new Date());
      return format(parsed, "h:mm a");
    } catch {
      return time.substring(0, 5);
    }
  };

  let currentY = startY;

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, appts]) => {
      // Date header
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(format(new Date(date), "EEEE, MMMM d, yyyy"), 14, currentY);
      currentY += 2;

      const rows = appts
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
        .map((appt) => [
          formatTime(appt.start_time),
          pdfSafe(appt.patient_profile?.display_name) || "Unknown",
          pdfSafe(appt.reason) || "—",
          APPOINTMENT_STATUS_OPTIONS.find((s) => s.value === appt.status)?.label || appt.status,
          pdfSafe(appt.notes) || "",
        ]);

      autoTable(doc, {
        startY: currentY,
        head: [["Time", "Patient", "Reason", "Status", "Notes"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 40 },
          2: { cellWidth: 50 },
          3: { cellWidth: 25 },
          4: { cellWidth: 40 },
        },
        margin: { left: 14, right: 14 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

  doc.save(`schedule-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
