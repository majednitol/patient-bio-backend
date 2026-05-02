import { useCallback, useState } from "react";
import { format } from "date-fns";
import { useDoctorPatients } from "@/hooks/useDoctorPatients";
import { useDoctorPrescriptions } from "@/hooks/usePrescriptions";
import { useDoctorAppointments } from "@/hooks/useAppointments";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { useDoctorHospitalContext } from "@/contexts/DoctorHospitalContext";
import { pdfSafe } from "@/utils/pdfSafe";

interface ExportData {
  headers: string[];
  rows: string[][];
  title: string;
}

const loadPDFLibraries = async () => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
};

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

async function downloadPDF(data: ExportData, doctorName?: string) {
  const { jsPDF, autoTable } = await loadPDFLibraries();
  const doc = new jsPDF({ orientation: data.headers.length > 5 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(pdfSafe(data.title), pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(100);
  if (doctorName) doc.text(`Dr. ${doctorName}`, 14, 26);
  doc.text(`Generated: ${format(new Date(), "PPP 'at' p")}`, 14, doctorName ? 32 : 26);
  doc.text(`Total Records: ${data.rows.length}`, 14, doctorName ? 38 : 32);

  autoTable(doc, {
    head: [data.headers],
    body: data.rows.map(row => row.map(pdfSafe)),
    startY: doctorName ? 44 : 38,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
  });

  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("Generated from PatientBio Health Platform", pageWidth / 2, footerY, { align: "center" });

  doc.save(`${data.title.replace(/\s+/g, "_").toLowerCase()}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function useDoctorReports() {
  const [isExporting, setIsExporting] = useState(false);
  const { selectedHospitalId } = useDoctorHospitalContext();
  const { data: patients } = useDoctorPatients();
  const { data: prescriptions } = useDoctorPrescriptions();
  const { appointments } = useDoctorAppointments(selectedHospitalId || undefined);
  const { data: profile } = useDoctorProfile();

  const doctorName = profile?.full_name;

  const buildAppointmentData = useCallback((): ExportData => {
    const headers = ["Date", "Time", "Patient", "Status", "Reason", "Duration (min)"];
    const rows = (appointments || []).map((apt: any) => {
      let duration = "-";
      if (apt.consultation_started_at && apt.consultation_ended_at) {
        const mins = Math.round(
          (new Date(apt.consultation_ended_at).getTime() - new Date(apt.consultation_started_at).getTime()) / 60000
        );
        if (mins > 0 && mins < 120) duration = String(mins);
      }
      return [
        apt.appointment_date ? format(new Date(apt.appointment_date), "MMM d, yyyy") : "-",
        apt.start_time || "-",
        apt.patient_profile?.display_name || "Unknown",
        apt.status || "-",
        apt.reason || "-",
        duration,
      ];
    });
    return { headers, rows, title: "Appointment Report" };
  }, [appointments]);

  const buildPatientListData = useCallback((): ExportData => {
    const headers = ["Name", "Gender", "Date of Birth", "Phone", "Connected Since"];
    const rows = (patients || []).map((p: any) => [
      p.patient_profile?.display_name || p.display_name || "Unknown",
      p.patient_profile?.gender || p.gender || "-",
      p.patient_profile?.date_of_birth
        ? format(new Date(p.patient_profile.date_of_birth), "MMM d, yyyy")
        : p.date_of_birth
        ? format(new Date(p.date_of_birth), "MMM d, yyyy")
        : "-",
      p.patient_profile?.phone || "-",
      p.granted_at ? format(new Date(p.granted_at), "MMM d, yyyy") : "-",
    ]);
    return { headers, rows, title: "Patient List" };
  }, [patients]);

  const buildPrescriptionData = useCallback((): ExportData => {
    const headers = ["Date", "Patient", "Diagnosis", "Medications", "Status"];
    const rows = (prescriptions || []).map((rx: any) => [
      format(new Date(rx.created_at), "MMM d, yyyy"),
      rx.patient_name || "Unknown",
      rx.diagnosis || "-",
      rx.medications?.map((m: any) => `${m.name} ${m.dosage}`).join("; ") || "-",
      rx.is_active ? "Active" : "Completed",
    ]);
    return { headers, rows, title: "Prescription Report" };
  }, [prescriptions]);

  const buildPracticeSummaryData = useCallback((): ExportData => {
    const totalPatients = patients?.length || 0;
    const totalAppointments = appointments?.length || 0;
    const completedApts = appointments?.filter((a: any) => a.status === "completed").length || 0;
    const noShows = appointments?.filter((a: any) => a.status === "no_show").length || 0;
    const cancelled = appointments?.filter((a: any) => a.status === "cancelled").length || 0;
    const totalRx = prescriptions?.length || 0;
    const activeRx = prescriptions?.filter((rx: any) => rx.is_active).length || 0;
    const fee = profile?.consultation_fee || 0;
    const estimatedRevenue = completedApts * fee;

    // Top diagnoses
    const diagCounts: Record<string, number> = {};
    prescriptions?.forEach((rx: any) => {
      if (rx.diagnosis) diagCounts[rx.diagnosis] = (diagCounts[rx.diagnosis] || 0) + 1;
    });
    const topDiagnoses = Object.entries(diagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([d, c]) => `${d} (${c})`)
      .join(", ") || "N/A";

    // Top medications
    const medCounts: Record<string, number> = {};
    prescriptions?.forEach((rx: any) => {
      rx.medications?.forEach((m: any) => {
        medCounts[m.name] = (medCounts[m.name] || 0) + 1;
      });
    });
    const topMeds = Object.entries(medCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([m, c]) => `${m} (${c})`)
      .join(", ") || "N/A";

    const noShowRate = totalAppointments > 0 ? ((noShows / totalAppointments) * 100).toFixed(1) + "%" : "0%";

    const headers = ["Metric", "Value"];
    const rows = [
      ["Total Patients", String(totalPatients)],
      ["Total Appointments", String(totalAppointments)],
      ["Completed Appointments", String(completedApts)],
      ["No-Show Rate", noShowRate],
      ["Cancelled Appointments", String(cancelled)],
      ["Total Prescriptions", String(totalRx)],
      ["Active Prescriptions", String(activeRx)],
      ["Consultation Fee", fee ? `BDT ${fee}` : "Not set"],
      ["Estimated Revenue", fee ? `BDT ${estimatedRevenue.toLocaleString()}` : "N/A"],
      ["Top Diagnoses", topDiagnoses],
      ["Top Medications", topMeds],
    ];

    return { headers, rows, title: "Practice Summary Report" };
  }, [patients, appointments, prescriptions, profile]);

  const exportReport = useCallback(
    async (type: "appointments" | "patients" | "prescriptions" | "summary", fmt: "csv" | "pdf") => {
      setIsExporting(true);
      try {
        const builders = {
          appointments: buildAppointmentData,
          patients: buildPatientListData,
          prescriptions: buildPrescriptionData,
          summary: buildPracticeSummaryData,
        };
        const data = builders[type]();
        if (fmt === "csv") {
          downloadCSV(data);
        } else {
          await downloadPDF(data, doctorName || undefined);
        }
      } finally {
        setIsExporting(false);
      }
    },
    [buildAppointmentData, buildPatientListData, buildPrescriptionData, buildPracticeSummaryData, doctorName]
  );

  return {
    exportReport,
    isExporting,
    counts: {
      patients: patients?.length || 0,
      appointments: appointments?.length || 0,
      prescriptions: prescriptions?.length || 0,
    },
  };
}
