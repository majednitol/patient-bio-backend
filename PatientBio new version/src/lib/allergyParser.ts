/**
 * Parses allergy text with optional severity prefixes.
 * Supported formats:
 *   "severe: Penicillin"
 *   "life-threatening: Peanuts"
 *   "mild: Dust"
 *   "moderate: Shellfish"
 *   "Latex" (defaults to "unknown")
 */

export type AllergySeverity = "life-threatening" | "severe" | "moderate" | "mild" | "unknown";

export interface ParsedAllergy {
  name: string;
  severity: AllergySeverity;
}

const SEVERITY_KEYWORDS: { prefix: string; severity: AllergySeverity }[] = [
  { prefix: "life-threatening:", severity: "life-threatening" },
  { prefix: "life threatening:", severity: "life-threatening" },
  { prefix: "severe:", severity: "severe" },
  { prefix: "moderate:", severity: "moderate" },
  { prefix: "mild:", severity: "mild" },
];

export function parseAllergyWithSeverity(text: string): ParsedAllergy {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  for (const { prefix, severity } of SEVERITY_KEYWORDS) {
    if (lower.startsWith(prefix)) {
      return {
        name: trimmed.slice(prefix.length).trim(),
        severity,
      };
    }
  }

  return { name: trimmed, severity: "unknown" };
}

export function parseAllergiesText(allergiesText: string | null | undefined): ParsedAllergy[] {
  if (!allergiesText) return [];
  return allergiesText
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseAllergyWithSeverity);
}

export function getSeverityColor(severity: AllergySeverity): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case "life-threatening":
      return { bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/40" };
    case "severe":
      return { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" };
    case "moderate":
      return { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30" };
    case "mild":
      return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
    default:
      return { bg: "bg-warning/10", text: "text-warning-foreground", border: "border-warning/30" };
  }
}

export function getSeverityLabel(severity: AllergySeverity): string {
  switch (severity) {
    case "life-threatening": return "Life-threatening";
    case "severe": return "Severe";
    case "moderate": return "Moderate";
    case "mild": return "Mild";
    default: return "";
  }
}
