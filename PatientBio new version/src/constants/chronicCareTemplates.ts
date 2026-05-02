export type ChronicCondition = "diabetes" | "hypertension" | "asthma" | "arthritis" | "cancer" | "copd" | "other";

export interface CarePlanMilestone {
  id: string;
  title: string;
  frequency: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface CarePlanTemplate {
  condition: ChronicCondition;
  planName: string;
  milestones: Omit<CarePlanMilestone, "id" | "completed">[];
  defaultFollowUpWeeks: number;
}

export const CONDITION_COLORS: Record<ChronicCondition, { bg: string; text: string; badge: string }> = {
  diabetes: { bg: "bg-blue-500/10", text: "text-blue-600", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  hypertension: { bg: "bg-red-500/10", text: "text-red-600", badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  asthma: { bg: "bg-teal-500/10", text: "text-teal-600", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300" },
  arthritis: { bg: "bg-amber-500/10", text: "text-amber-600", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  cancer: { bg: "bg-purple-500/10", text: "text-purple-600", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  copd: { bg: "bg-orange-500/10", text: "text-orange-600", badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  other: { bg: "bg-gray-500/10", text: "text-gray-600", badge: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300" },
};

export const CONDITION_LABELS: Record<ChronicCondition, string> = {
  diabetes: "Diabetes",
  hypertension: "Hypertension",
  asthma: "Asthma",
  arthritis: "Arthritis",
  cancer: "Cancer",
  copd: "COPD",
  other: "Other",
};

// Default follow-up intervals in weeks per condition
export const CONDITION_FOLLOWUP_WEEKS: Record<ChronicCondition, number> = {
  diabetes: 12,       // 3 months (HbA1c cycle)
  hypertension: 4,    // 1 month initially
  asthma: 12,         // 3 months maintenance
  arthritis: 12,      // 3 months routine
  cancer: 2,          // 2 weeks during treatment
  copd: 12,
  other: 4,
};

export const CARE_PLAN_TEMPLATES: CarePlanTemplate[] = [
  {
    condition: "diabetes",
    planName: "Diabetes Management Plan",
    defaultFollowUpWeeks: 12,
    milestones: [
      { title: "HbA1c Test", frequency: "Every 3 months" },
      { title: "Fasting Blood Glucose Check", frequency: "Monthly" },
      { title: "Lipid Panel", frequency: "Every 6 months" },
      { title: "Annual Eye Exam (Retinopathy Screening)", frequency: "Annually" },
      { title: "Foot Examination", frequency: "Every visit" },
      { title: "Kidney Function Test (eGFR, Urine Albumin)", frequency: "Annually" },
      { title: "Blood Pressure Check", frequency: "Every visit" },
      { title: "Weight & BMI Tracking", frequency: "Every visit" },
    ],
  },
  {
    condition: "hypertension",
    planName: "Hypertension Control Plan",
    defaultFollowUpWeeks: 4,
    milestones: [
      { title: "Blood Pressure Monitoring", frequency: "Every visit" },
      { title: "Home BP Log Review", frequency: "Monthly" },
      { title: "Serum Electrolytes (Na+, K+)", frequency: "Every 6 months" },
      { title: "Renal Function Test", frequency: "Annually" },
      { title: "Lipid Profile", frequency: "Every 6 months" },
      { title: "ECG / Echocardiogram", frequency: "Annually" },
      { title: "Lifestyle & Diet Counseling", frequency: "Every visit" },
    ],
  },
  {
    condition: "asthma",
    planName: "Asthma Action Plan",
    defaultFollowUpWeeks: 12,
    milestones: [
      { title: "Peak Flow / Spirometry", frequency: "Every 3 months" },
      { title: "Inhaler Technique Review", frequency: "Every visit" },
      { title: "Trigger Identification & Avoidance", frequency: "Every visit" },
      { title: "Medication Step Review", frequency: "Every 3 months" },
      { title: "Asthma Control Test (ACT) Score", frequency: "Every visit" },
      { title: "Allergy Testing", frequency: "As needed" },
    ],
  },
  {
    condition: "arthritis",
    planName: "Arthritis Management Plan",
    defaultFollowUpWeeks: 12,
    milestones: [
      { title: "Joint Assessment & Pain Score", frequency: "Every visit" },
      { title: "Inflammatory Markers (ESR, CRP)", frequency: "Every 3 months" },
      { title: "Liver & Kidney Function (if on DMARDs)", frequency: "Every 3 months" },
      { title: "X-Ray / Imaging Review", frequency: "Every 6-12 months" },
      { title: "Physical Therapy Progress", frequency: "Monthly" },
      { title: "Bone Density Scan (if on steroids)", frequency: "Annually" },
    ],
  },
  {
    condition: "cancer",
    planName: "Cancer Care Follow-Up Plan",
    defaultFollowUpWeeks: 2,
    milestones: [
      { title: "Tumor Marker Blood Tests", frequency: "Every 2-4 weeks" },
      { title: "Complete Blood Count (CBC)", frequency: "Before each cycle" },
      { title: "Imaging (CT/MRI/PET) Scan", frequency: "Every 2-3 months" },
      { title: "Side Effect Assessment", frequency: "Every visit" },
      { title: "Nutrition & Weight Check", frequency: "Every visit" },
      { title: "Pain & Quality of Life Assessment", frequency: "Every visit" },
      { title: "Psychosocial Support Check-in", frequency: "Monthly" },
    ],
  },
  {
    condition: "copd",
    planName: "COPD Management Plan",
    defaultFollowUpWeeks: 12,
    milestones: [
      { title: "Spirometry / Pulmonary Function", frequency: "Every 6 months" },
      { title: "Oxygen Saturation Check", frequency: "Every visit" },
      { title: "Inhaler Technique Review", frequency: "Every visit" },
      { title: "Exacerbation History Review", frequency: "Every visit" },
      { title: "Smoking Cessation Counseling", frequency: "Every visit" },
      { title: "Annual Flu & Pneumococcal Vaccination", frequency: "Annually" },
    ],
  },
];

/**
 * Detect chronic condition from free-text chronic_diseases field.
 */
export function detectChronicConditions(chronicDiseasesText: string | null | undefined): ChronicCondition[] {
  if (!chronicDiseasesText || chronicDiseasesText.toLowerCase() === "none") return [];

  const text = chronicDiseasesText.toLowerCase();
  const detected: ChronicCondition[] = [];

  if (/diabet|dm\b|type\s*[12]|hba1c|insulin/i.test(text)) detected.push("diabetes");
  if (/hypertens|high\s*blood\s*press|htn\b|bp\s*high/i.test(text)) detected.push("hypertension");
  if (/asthma|bronchial|wheez/i.test(text)) detected.push("asthma");
  if (/arthrit|ra\b|osteoarthrit|joint\s*pain|rheumat/i.test(text)) detected.push("arthritis");
  if (/cancer|carcinoma|tumor|tumour|oncol|lymphoma|leuk[ae]mia|malign/i.test(text)) detected.push("cancer");
  if (/copd|chronic\s*obstruct|emphysema/i.test(text)) detected.push("copd");

  return detected;
}
