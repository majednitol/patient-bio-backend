/**
 * Formats a doctor/pathologist name with "Dr." prefix,
 * avoiding duplication if the name already starts with "Dr."
 */
export const formatDoctorName = (
  fullName: string | null | undefined,
  fallback = "Unknown Doctor"
): string => {
  if (!fullName) return fallback;
  if (fullName.startsWith("Dr.") || fullName.startsWith("Dr ")) return fullName;
  return `Dr. ${fullName}`;
};
