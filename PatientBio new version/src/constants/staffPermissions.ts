export interface StaffPermissionDef {
  key: string;
  label: string;
  description: string;
  group: string;
}

export const STAFF_PERMISSIONS: StaffPermissionDef[] = [
  {
    key: "view_appointments",
    label: "View Appointments",
    description: "See today's schedule and appointment list",
    group: "Appointments",
  },
  {
    key: "manage_appointments",
    label: "Manage Appointments",
    description: "Book, reschedule, or cancel appointments",
    group: "Appointments",
  },
  {
    key: "check_in_patients",
    label: "Check-in Patients",
    description: "Mark patients as arrived / checked-in",
    group: "Appointments",
  },
  {
    key: "view_patients",
    label: "View Patients",
    description: "Access the patient list and basic info",
    group: "Patient Records",
  },
  {
    key: "view_patient_records",
    label: "View Patient Records",
    description: "See health records and visit history",
    group: "Patient Records",
  },
  {
    key: "add_patients",
    label: "Add Patients",
    description: "Register new patients by ID",
    group: "Patient Records",
  },
  {
    key: "record_vitals",
    label: "Record Vitals",
    description: "Enter patient vital signs",
    group: "Clinical",
  },
  {
    key: "view_prescriptions",
    label: "View Prescriptions",
    description: "See issued prescriptions (read-only)",
    group: "Clinical",
  },
];

export const DEFAULT_PERMISSIONS: Record<string, boolean> = Object.fromEntries(
  STAFF_PERMISSIONS.map((p) => [p.key, true])
);

/** Group permissions by their group label */
export function groupPermissions(perms: StaffPermissionDef[]) {
  const groups: Record<string, StaffPermissionDef[]> = {};
  for (const p of perms) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  }
  return groups;
}
