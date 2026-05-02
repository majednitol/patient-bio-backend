/**
 * Export filtered patient list as CSV download.
 */
import { format } from "date-fns";

interface PatientExportRow {
  display_name?: string | null;
  patient_id?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  granted_at?: string;
  is_active?: boolean;
}

export function exportPatientsCsv(patients: PatientExportRow[], filename = "my-patients.csv") {
  const headers = ["Name", "Patient ID", "Age", "Gender", "Connected Date", "Status"];

  const rows = patients.map((p) => {
    const age = p.date_of_birth
      ? String(new Date().getFullYear() - new Date(p.date_of_birth).getFullYear())
      : "";
    return [
      p.display_name || "Unknown",
      p.patient_id?.substring(0, 8).toUpperCase() || "",
      age,
      p.gender || "",
      p.granted_at ? format(new Date(p.granted_at), "yyyy-MM-dd") : "",
      p.is_active ? "Active" : "Inactive",
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
