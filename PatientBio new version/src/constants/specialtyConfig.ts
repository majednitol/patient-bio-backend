// Centralized specialty configuration registry for Doctor Portal customization
// Maps ~30 specialty groups (covering 140+ specialties) to visit reasons, medications, dashboard highlights, and clinical focus tags.

export interface SpecialtyMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface RiskIndicator {
  label: string;
  condition: string;
}

export interface PrescriptionFormat {
  headerColor: string;
  accentColor: [number, number, number];
  specialtyIcon: string;
  headerSubtitle: string;
  legalDisclaimer?: string;
  defaultInvestigations?: string[];
}

export interface SpecialtyConfig {
  visitReasons: string[];
  commonMedications: SpecialtyMedication[];
  dashboardHighlights: { label: string; icon: string; filterType: string }[];
  clinicalFocus: string[];
  appointmentTypes?: { value: string; label: string }[];
  relevantLabCategories: string[];
  riskIndicators: RiskIndicator[];
  defaultConsultationMinutes: number;
  prescriptionFormat: PrescriptionFormat;
}

// Mapping from individual specialty name (lowercased) → group key
const SPECIALTY_GROUP_MAP: Record<string, string> = {
  // Cardiology group
  "cardiology": "cardiology",
  "cardiologist": "cardiology",
  "interventional cardiology": "cardiology",
  "cardiac electrophysiology": "cardiology",
  "cardiac surgery": "cardiology",
  "cardiovascular surgery": "cardiology",
  "pediatric cardiology": "cardiology",

  // Orthopedics group
  "orthopedics": "orthopedics",
  "orthopaedics": "orthopedics",
  "orthopedic surgery": "orthopedics",
  "spine surgery": "orthopedics",
  "sports medicine": "orthopedics",
  "joint replacement": "orthopedics",

  // Dermatology group
  "dermatology": "dermatology",
  "dermatologist": "dermatology",
  "cosmetic dermatology": "dermatology",
  "pediatric dermatology": "dermatology",

  // Pediatrics group
  "pediatrics": "pediatrics",
  "paediatrics": "pediatrics",
  "pediatrician": "pediatrics",
  "pediatric neurology": "pediatrics",
  "pediatric surgery": "pediatrics",
  "pediatric gastroenterology": "pediatrics",
  "pediatric pulmonology": "pediatrics",
  "pediatric endocrinology": "pediatrics",
  "pediatric nephrology": "pediatrics",
  "pediatric oncology": "pediatrics",
  "pediatric orthopedics": "pediatrics",
  "pediatric urology": "pediatrics",
  "neonatology": "pediatrics",

  // Neurology group
  "neurology": "neurology",
  "neurologist": "neurology",
  "neurosurgery": "neurology",
  "pediatric neurosurgery": "neurology",
  "neurophysiology": "neurology",

  // Gastroenterology group
  "gastroenterology": "gastroenterology",
  "gastroenterologist": "gastroenterology",
  "hepatology": "gastroenterology",
  "surgical gastroenterology": "gastroenterology",

  // Psychiatry group
  "psychiatry": "psychiatry",
  "psychiatrist": "psychiatry",
  "psychology": "psychiatry",
  "child psychiatry": "psychiatry",
  "addiction medicine": "psychiatry",

  // Surgery group
  "general surgery": "surgery",
  "surgical oncology": "surgery",
  "laparoscopic surgery": "surgery",
  "bariatric surgery": "surgery",
  "plastic surgery": "surgery",
  "reconstructive surgery": "surgery",
  "hand surgery": "surgery",
  "trauma surgery": "surgery",
  "vascular surgery": "surgery",
  "cardiothoracic surgery": "surgery",
  "thoracic surgery": "surgery",
  "transplant surgery": "surgery",
  "robotic surgery": "surgery",

  // Oncology group
  "oncology": "oncology",
  "medical oncology": "oncology",
  "radiation oncology": "oncology",
  "gynecologic oncology": "oncology",
  "hematology-oncology": "oncology",
  "hematology": "oncology",

  // Obstetrics / Gynecology group
  "obstetrics": "obstetrics",
  "gynecology": "obstetrics",
  "gynaecology": "obstetrics",
  "ob-gyn": "obstetrics",
  "reproductive medicine": "obstetrics",
  "maternal-fetal medicine": "obstetrics",
  "fertility specialist": "obstetrics",

  // ENT group
  "ent": "ent",
  "otolaryngology": "ent",
  "otorhinolaryngology": "ent",
  "audiology": "ent",

  // Ophthalmology group
  "ophthalmology": "ophthalmology",
  "ophthalmologist": "ophthalmology",
  "eye specialist": "ophthalmology",
  "retina specialist": "ophthalmology",
  "glaucoma specialist": "ophthalmology",

  // Pulmonology group
  "pulmonology": "pulmonology",
  "pulmonologist": "pulmonology",
  "respiratory medicine": "pulmonology",
  "interventional pulmonology": "pulmonology",

  // Endocrinology group
  "endocrinology": "endocrinology",
  "endocrinologist": "endocrinology",
  "diabetology": "endocrinology",

  // Nephrology group
  "nephrology": "nephrology",
  "nephrologist": "nephrology",
  "pediatric nephrology_grp": "nephrology",

  // Urology group
  "urology": "urology",
  "urologist": "urology",
  "andrology": "urology",
  "uro-oncology": "urology",

  // Rheumatology group
  "rheumatology": "rheumatology",
  "rheumatologist": "rheumatology",
  "clinical immunology": "rheumatology",

  // General / Family Medicine group
  "general medicine": "general",
  "general physician": "general",
  "internal medicine": "general",
  "family medicine": "general",

  // Emergency / Critical Care group
  "emergency medicine": "emergency",
  "critical care": "emergency",
  "intensive care": "emergency",
  "trauma": "emergency",

  // Radiology / Diagnostics group
  "radiology": "radiology",
  "interventional radiology": "radiology",
  "nuclear medicine": "radiology",
  "diagnostic imaging": "radiology",

  // Dental group
  "dentistry": "dental",
  "dental": "dental",
  "dentist": "dental",
  "orthodontics": "dental",
  "periodontics": "dental",
  "endodontics": "dental",
  "oral surgery": "dental",
  "oral and maxillofacial surgery": "dental",
  "prosthodontics": "dental",
  "pediatric dentistry": "dental",

  // Rehabilitation group
  "physical medicine": "rehabilitation",
  "rehabilitation": "rehabilitation",
  "physiotherapy": "rehabilitation",
  "occupational therapy": "rehabilitation",
  "speech therapy": "rehabilitation",

  // Alternative Medicine group
  "ayurveda": "alternative",
  "homeopathy": "alternative",
  "unani": "alternative",
  "naturopathy": "alternative",
  "acupuncture": "alternative",
  "chiropractic": "alternative",
  "yoga therapy": "alternative",
  "siddha": "alternative",

  // Pathology group
  "pathology": "pathology",
  "clinical pathology": "pathology",
  "histopathology": "pathology",
  "microbiology": "pathology",
  "biochemistry": "pathology",

  // Anesthesiology group
  "anesthesiology": "anesthesiology",
  "pain medicine": "anesthesiology",
  "pain management": "anesthesiology",

  // Infectious Disease group
  "infectious disease": "infectious",
  "tropical medicine": "infectious",

  // Geriatrics group
  "geriatrics": "geriatrics",
  "geriatric medicine": "geriatrics",

  // Allergy / Immunology group
  "allergy": "allergy",
  "immunology": "allergy",
  "allergy and immunology": "allergy",
};

const SPECIALTY_CONFIGS: Record<string, SpecialtyConfig> = {
  cardiology: {
    visitReasons: ["Chest Pain", "Palpitations", "BP Follow-up", "ECG Review", "Heart Failure Check", "Post-Stent Follow-up", "Breathlessness", "Lipid Profile Review"],
    commonMedications: [
      { name: "Aspirin", dosage: "75mg", frequency: "Once daily", duration: "Ongoing", instructions: "After meals" },
      { name: "Atorvastatin", dosage: "20mg", frequency: "Once daily at night", duration: "Ongoing" },
      { name: "Metoprolol", dosage: "50mg", frequency: "Twice daily", duration: "Ongoing" },
      { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Clopidogrel", dosage: "75mg", frequency: "Once daily", duration: "As directed" },
      { name: "Ramipril", dosage: "5mg", frequency: "Once daily", duration: "Ongoing" },
    ],
    dashboardHighlights: [
      { label: "ECG Reviews Pending", icon: "Activity", filterType: "ecg_review" },
      { label: "Post-Procedure Follow-ups", icon: "HeartPulse", filterType: "post_procedure" },
      { label: "Critical BP Patients", icon: "AlertTriangle", filterType: "critical_bp" },
    ],
    clinicalFocus: ["Hypertension", "Coronary Artery Disease", "Heart Failure", "Arrhythmia", "Valvular Heart Disease"],
    appointmentTypes: [{ value: "procedure", label: "Procedure" }, { value: "ecg_review", label: "ECG Review" }],
    relevantLabCategories: ["heart_disease", "diabetes"],
    riskIndicators: [
      { label: "Cardiac Risk", condition: "heart_disease" },
      { label: "Lipid Abnormal", condition: "diabetes" },
    ],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#DC2626",
      accentColor: [220, 38, 38],
      specialtyIcon: "❤️",
      headerSubtitle: "Cardiovascular Medicine",
      defaultInvestigations: ["ECG", "2D Echo", "Lipid Profile", "Troponin", "BNP"],
    },
  },

  orthopedics: {
    visitReasons: ["Joint Pain", "Fracture Follow-up", "Back Pain", "Post-Surgery Review", "Sports Injury", "Knee Pain", "Shoulder Pain", "Cast Removal"],
    commonMedications: [
      { name: "Diclofenac", dosage: "50mg", frequency: "Twice daily", duration: "5 days", instructions: "After meals" },
      { name: "Calcium + Vitamin D3", dosage: "500mg/250IU", frequency: "Once daily", duration: "3 months" },
      { name: "Pantoprazole", dosage: "40mg", frequency: "Once daily before breakfast", duration: "5 days" },
      { name: "Tramadol", dosage: "50mg", frequency: "As needed", duration: "3 days", instructions: "For severe pain only" },
      { name: "Thiocolchicoside", dosage: "4mg", frequency: "Twice daily", duration: "5 days" },
    ],
    dashboardHighlights: [
      { label: "Surgeries This Week", icon: "Scissors", filterType: "surgery" },
      { label: "Post-Op Follow-ups Due", icon: "ClipboardCheck", filterType: "post_op" },
      { label: "Cast Removals Pending", icon: "BandaidIcon", filterType: "cast_removal" },
    ],
    clinicalFocus: ["Fractures", "Arthritis", "Spinal Disorders", "Sports Injuries", "Joint Replacement"],
    appointmentTypes: [{ value: "procedure", label: "Procedure/Surgery" }, { value: "physio_review", label: "Physio Review" }],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#0369A1",
      accentColor: [3, 105, 161],
      specialtyIcon: "🦴",
      headerSubtitle: "Orthopedic & Musculoskeletal Medicine",
      defaultInvestigations: ["X-Ray", "MRI", "CT Scan", "Bone Density (DEXA)", "Serum Calcium"],
    },
  },

  dermatology: {
    visitReasons: ["Skin Rash", "Acne Treatment", "Eczema Review", "Psoriasis Follow-up", "Mole Check", "Hair Loss", "Fungal Infection", "Skin Allergy"],
    commonMedications: [
      { name: "Cetirizine", dosage: "10mg", frequency: "Once daily", duration: "7 days" },
      { name: "Fluconazole", dosage: "150mg", frequency: "Once weekly", duration: "4 weeks" },
      { name: "Clindamycin Gel", dosage: "1%", frequency: "Apply twice daily", duration: "4 weeks" },
      { name: "Mometasone Cream", dosage: "0.1%", frequency: "Apply once daily", duration: "2 weeks" },
      { name: "Isotretinoin", dosage: "20mg", frequency: "Once daily with meals", duration: "As directed" },
    ],
    dashboardHighlights: [
      { label: "Biopsy Results Pending", icon: "Microscope", filterType: "biopsy" },
      { label: "Procedure Appointments", icon: "Scissors", filterType: "procedure" },
    ],
    clinicalFocus: ["Acne", "Eczema", "Psoriasis", "Fungal Infections", "Skin Cancer Screening"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 15,
    prescriptionFormat: {
      headerColor: "#D97706",
      accentColor: [217, 119, 6],
      specialtyIcon: "🧴",
      headerSubtitle: "Dermatology & Skin Care",
      defaultInvestigations: ["Skin Biopsy", "KOH Mount", "Patch Testing", "Wood's Lamp"],
    },
  },

  pediatrics: {
    visitReasons: ["Well-Child Visit", "Vaccination", "Growth Check", "Fever", "Developmental Assessment", "Cough & Cold", "Rash", "Feeding Issues"],
    commonMedications: [
      { name: "Paracetamol (Pediatric)", dosage: "15mg/kg", frequency: "Every 6 hours", duration: "3 days", instructions: "As needed for fever" },
      { name: "Amoxicillin (Pediatric)", dosage: "25mg/kg", frequency: "Three times daily", duration: "5 days" },
      { name: "Ondansetron (Pediatric)", dosage: "0.15mg/kg", frequency: "As needed", duration: "2 days" },
      { name: "ORS Solution", dosage: "As directed", frequency: "After each loose stool", duration: "Until resolved" },
      { name: "Zinc Supplement", dosage: "20mg", frequency: "Once daily", duration: "14 days" },
    ],
    dashboardHighlights: [
      { label: "Vaccinations Due Today", icon: "Syringe", filterType: "vaccination" },
      { label: "Growth Checks Pending", icon: "Ruler", filterType: "growth_check" },
      { label: "Well-Child Visits", icon: "Baby", filterType: "well_child" },
    ],
    clinicalFocus: ["Vaccinations", "Growth & Development", "Nutrition", "Childhood Infections", "Developmental Milestones"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#059669",
      accentColor: [5, 150, 105],
      specialtyIcon: "👶",
      headerSubtitle: "Pediatric & Child Health",
      defaultInvestigations: ["CBC", "Urine Routine", "Blood Culture", "CRP"],
    },
  },

  neurology: {
    visitReasons: ["Headache", "Seizure Follow-up", "Numbness/Tingling", "Memory Concerns", "Dizziness", "Stroke Follow-up", "Tremor", "Sleep Disorders"],
    commonMedications: [
      { name: "Levetiracetam", dosage: "500mg", frequency: "Twice daily", duration: "Ongoing" },
      { name: "Sumatriptan", dosage: "50mg", frequency: "As needed", duration: "Acute use", instructions: "At onset of migraine" },
      { name: "Pregabalin", dosage: "75mg", frequency: "Twice daily", duration: "As directed" },
      { name: "Amitriptyline", dosage: "10mg", frequency: "Once at night", duration: "Ongoing" },
      { name: "Donepezil", dosage: "5mg", frequency: "Once daily", duration: "Ongoing" },
    ],
    dashboardHighlights: [
      { label: "EEG Reviews Pending", icon: "BrainCircuit", filterType: "eeg_review" },
      { label: "Seizure Follow-ups", icon: "Zap", filterType: "seizure_followup" },
    ],
    clinicalFocus: ["Epilepsy", "Migraine", "Stroke", "Parkinson's", "Neuropathy", "Dementia"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#7C3AED",
      accentColor: [124, 58, 237],
      specialtyIcon: "🧠",
      headerSubtitle: "Neurology & Neurosciences",
      defaultInvestigations: ["EEG", "MRI Brain", "Nerve Conduction Study", "CT Head", "CSF Analysis"],
    },
  },

  gastroenterology: {
    visitReasons: ["Abdominal Pain", "Endoscopy Follow-up", "GERD", "IBS Review", "Liver Function Review", "Colonoscopy Follow-up", "Constipation", "GI Bleed Follow-up"],
    commonMedications: [
      { name: "Pantoprazole", dosage: "40mg", frequency: "Once daily before breakfast", duration: "4 weeks" },
      { name: "Domperidone", dosage: "10mg", frequency: "Three times daily before meals", duration: "2 weeks" },
      { name: "Rifaximin", dosage: "550mg", frequency: "Twice daily", duration: "14 days" },
      { name: "Lactulose", dosage: "15ml", frequency: "Twice daily", duration: "As needed" },
      { name: "Ursodeoxycholic Acid", dosage: "300mg", frequency: "Twice daily", duration: "3 months" },
    ],
    dashboardHighlights: [
      { label: "Endoscopy Scheduled", icon: "Scan", filterType: "endoscopy" },
      { label: "Lab Results Pending", icon: "FlaskConical", filterType: "lab_pending" },
    ],
    clinicalFocus: ["GERD", "IBS", "Liver Disease", "IBD", "GI Cancers"],
    relevantLabCategories: ["cancer"],
    riskIndicators: [
      { label: "GI Cancer Risk", condition: "cancer" },
    ],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#B45309",
      accentColor: [180, 83, 9],
      specialtyIcon: "🔬",
      headerSubtitle: "Gastroenterology & Hepatology",
      defaultInvestigations: ["Endoscopy", "Colonoscopy", "LFT", "Ultrasound Abdomen", "H. pylori Test"],
    },
  },

  psychiatry: {
    visitReasons: ["Anxiety Review", "Depression Follow-up", "Medication Review", "Therapy Check-in", "Insomnia", "Panic Attacks", "OCD Review", "ADHD Review"],
    commonMedications: [
      { name: "Escitalopram", dosage: "10mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Sertraline", dosage: "50mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Clonazepam", dosage: "0.25mg", frequency: "As needed", duration: "Short term", instructions: "For acute anxiety only" },
      { name: "Olanzapine", dosage: "5mg", frequency: "Once at night", duration: "As directed" },
      { name: "Melatonin", dosage: "3mg", frequency: "Once at bedtime", duration: "2 weeks" },
    ],
    dashboardHighlights: [
      { label: "Therapy Sessions Today", icon: "MessageCircle", filterType: "therapy" },
      { label: "Medication Reviews Due", icon: "Pill", filterType: "med_review" },
    ],
    clinicalFocus: ["Depression", "Anxiety Disorders", "Bipolar", "Schizophrenia", "OCD", "PTSD"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 45,
    prescriptionFormat: {
      headerColor: "#0891B2",
      accentColor: [8, 145, 178],
      specialtyIcon: "🧘",
      headerSubtitle: "Psychiatry & Behavioral Health",
      legalDisclaimer: "This prescription may contain controlled substances. Dispensing is subject to applicable regulations.",
      defaultInvestigations: ["Thyroid Panel", "Vitamin B12", "Vitamin D", "CBC"],
    },
  },

  surgery: {
    visitReasons: ["Pre-Op Assessment", "Post-Op Review", "Wound Check", "Surgical Consultation", "Suture Removal", "Drainage Review", "Hernia Review", "Biopsy Results"],
    commonMedications: [
      { name: "Cefixime", dosage: "200mg", frequency: "Twice daily", duration: "5 days" },
      { name: "Metronidazole", dosage: "400mg", frequency: "Three times daily", duration: "5 days" },
      { name: "Tramadol", dosage: "50mg", frequency: "As needed", duration: "3 days" },
      { name: "Pantoprazole", dosage: "40mg", frequency: "Once daily", duration: "5 days" },
      { name: "Povidone-Iodine Ointment", dosage: "5%", frequency: "Apply twice daily", duration: "Until healed" },
    ],
    dashboardHighlights: [
      { label: "Surgeries This Week", icon: "Scissors", filterType: "surgery" },
      { label: "Post-Op Pending", icon: "ClipboardCheck", filterType: "post_op" },
      { label: "Wound Reviews Due", icon: "BandaidIcon", filterType: "wound" },
    ],
    clinicalFocus: ["Pre-Op Clearance", "Post-Op Care", "Wound Management", "Hernia", "Appendicitis"],
    appointmentTypes: [{ value: "pre_op", label: "Pre-Op Assessment" }, { value: "procedure", label: "Procedure" }],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#1D4ED8",
      accentColor: [29, 78, 216],
      specialtyIcon: "🔪",
      headerSubtitle: "General & Specialty Surgery",
      defaultInvestigations: ["CBC", "Coagulation Profile", "Blood Grouping", "Chest X-Ray", "ECG"],
    },
  },

  oncology: {
    visitReasons: ["Chemotherapy Review", "Scan Results", "Pain Management", "Follow-up Visit", "Biopsy Results", "Treatment Planning", "Side Effect Review", "Survivorship Check"],
    commonMedications: [
      { name: "Ondansetron", dosage: "8mg", frequency: "Twice daily", duration: "5 days", instructions: "For chemotherapy-induced nausea" },
      { name: "Dexamethasone", dosage: "4mg", frequency: "Twice daily", duration: "3 days" },
      { name: "Morphine SR", dosage: "15mg", frequency: "Twice daily", duration: "As directed" },
      { name: "Filgrastim", dosage: "300mcg", frequency: "Once daily", duration: "5 days" },
      { name: "Omeprazole", dosage: "20mg", frequency: "Once daily", duration: "Ongoing" },
    ],
    dashboardHighlights: [
      { label: "Chemo Sessions Today", icon: "Droplets", filterType: "chemotherapy" },
      { label: "Scan Results Pending", icon: "Scan", filterType: "scan_results" },
      { label: "Pain Assessments Due", icon: "Gauge", filterType: "pain_assessment" },
    ],
    clinicalFocus: ["Chemotherapy", "Radiation", "Palliative Care", "Cancer Screening", "Survivorship"],
    relevantLabCategories: ["cancer"],
    riskIndicators: [
      { label: "Cancer Diagnosis", condition: "cancer" },
    ],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#9333EA",
      accentColor: [147, 51, 234],
      specialtyIcon: "🎗️",
      headerSubtitle: "Oncology & Cancer Care",
      legalDisclaimer: "This prescription may contain cytotoxic or controlled substances. Handle with appropriate precautions.",
      defaultInvestigations: ["PET-CT", "Tumor Markers", "CBC", "LFT", "RFT", "Biopsy"],
    },
  },

  obstetrics: {
    visitReasons: ["Prenatal Visit", "Ultrasound Review", "High-Risk Review", "Postpartum Check", "Fertility Consultation", "PCOS Review", "Menstrual Issues", "Pap Smear"],
    commonMedications: [
      { name: "Folic Acid", dosage: "5mg", frequency: "Once daily", duration: "Throughout pregnancy" },
      { name: "Iron + Folic Acid", dosage: "100mg/500mcg", frequency: "Once daily", duration: "3 months" },
      { name: "Calcium", dosage: "500mg", frequency: "Twice daily", duration: "Throughout pregnancy" },
      { name: "Progesterone", dosage: "200mg", frequency: "Once at bedtime", duration: "As directed" },
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily", duration: "Ongoing", instructions: "For PCOS management" },
    ],
    dashboardHighlights: [
      { label: "Prenatal Visits Today", icon: "Baby", filterType: "prenatal" },
      { label: "High-Risk Patients", icon: "AlertTriangle", filterType: "high_risk" },
      { label: "Ultrasounds Scheduled", icon: "Scan", filterType: "ultrasound" },
    ],
    clinicalFocus: ["Prenatal Care", "High-Risk Pregnancy", "PCOS", "Infertility", "Menopause"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#E11D48",
      accentColor: [225, 29, 72],
      specialtyIcon: "🤰",
      headerSubtitle: "Obstetrics & Gynecology",
      defaultInvestigations: ["Ultrasound", "CBC", "Blood Group & Rh", "GTT", "Thyroid Panel"],
    },
  },

  ent: {
    visitReasons: ["Ear Infection", "Hearing Test", "Sinus Problems", "Throat Pain", "Tonsillitis", "Vertigo", "Snoring/Sleep Apnea", "Voice Hoarseness"],
    commonMedications: [
      { name: "Amoxicillin-Clavulanate", dosage: "625mg", frequency: "Twice daily", duration: "7 days" },
      { name: "Fluticasone Nasal Spray", dosage: "50mcg/spray", frequency: "2 sprays each nostril once daily", duration: "4 weeks" },
      { name: "Ciprofloxacin Ear Drops", dosage: "0.3%", frequency: "3 drops twice daily", duration: "7 days" },
      { name: "Montelukast", dosage: "10mg", frequency: "Once at night", duration: "4 weeks" },
      { name: "Betahistine", dosage: "16mg", frequency: "Three times daily", duration: "2 weeks" },
    ],
    dashboardHighlights: [
      { label: "Audiometry Scheduled", icon: "Ear", filterType: "audiometry" },
      { label: "Procedures Today", icon: "Scissors", filterType: "procedure" },
    ],
    clinicalFocus: ["Sinusitis", "Hearing Loss", "Tonsillitis", "Sleep Apnea", "Vertigo"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#0D9488",
      accentColor: [13, 148, 136],
      specialtyIcon: "👂",
      headerSubtitle: "ENT & Head-Neck Surgery",
      defaultInvestigations: ["Audiometry", "Tympanometry", "CT Paranasal Sinuses", "Laryngoscopy"],
    },
  },

  ophthalmology: {
    visitReasons: ["Vision Check", "Cataract Review", "Glaucoma Follow-up", "Diabetic Eye Screening", "Red Eye", "Foreign Body", "Contact Lens Check", "Post-Surgery Review"],
    commonMedications: [
      { name: "Moxifloxacin Eye Drops", dosage: "0.5%", frequency: "4 times daily", duration: "7 days" },
      { name: "Timolol Eye Drops", dosage: "0.5%", frequency: "Twice daily", duration: "Ongoing" },
      { name: "Artificial Tears", dosage: "As needed", frequency: "4-6 times daily", duration: "Ongoing" },
      { name: "Prednisolone Eye Drops", dosage: "1%", frequency: "4 times daily tapering", duration: "4 weeks" },
      { name: "Latanoprost Eye Drops", dosage: "0.005%", frequency: "Once at bedtime", duration: "Ongoing" },
    ],
    dashboardHighlights: [
      { label: "Surgeries Scheduled", icon: "Eye", filterType: "surgery" },
      { label: "Diabetic Screening Due", icon: "Scan", filterType: "diabetic_screening" },
    ],
    clinicalFocus: ["Cataract", "Glaucoma", "Diabetic Retinopathy", "Refractive Errors", "Dry Eye"],
    relevantLabCategories: ["diabetes"],
    riskIndicators: [
      { label: "Diabetic Retinopathy Risk", condition: "diabetes" },
    ],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#2563EB",
      accentColor: [37, 99, 235],
      specialtyIcon: "👁️",
      headerSubtitle: "Ophthalmology & Eye Care",
      defaultInvestigations: ["Visual Acuity", "IOP Measurement", "Fundoscopy", "OCT", "Perimetry"],
    },
  },

  pulmonology: {
    visitReasons: ["Asthma Review", "COPD Follow-up", "PFT Review", "Breathlessness", "Chronic Cough", "TB Follow-up", "Sleep Study Review", "Oxygen Assessment"],
    commonMedications: [
      { name: "Salbutamol Inhaler", dosage: "100mcg", frequency: "As needed", duration: "Ongoing" },
      { name: "Budesonide Inhaler", dosage: "200mcg", frequency: "Twice daily", duration: "Ongoing" },
      { name: "Montelukast", dosage: "10mg", frequency: "Once at night", duration: "Ongoing" },
      { name: "Tiotropium Inhaler", dosage: "18mcg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Azithromycin", dosage: "500mg", frequency: "Once daily", duration: "3 days" },
    ],
    dashboardHighlights: [
      { label: "PFT Reviews Due", icon: "Wind", filterType: "pft_review" },
      { label: "Oxygen Assessments", icon: "Gauge", filterType: "oxygen" },
    ],
    clinicalFocus: ["Asthma", "COPD", "Tuberculosis", "Lung Cancer", "Interstitial Lung Disease"],
    relevantLabCategories: ["covid19"],
    riskIndicators: [],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#4F46E5",
      accentColor: [79, 70, 229],
      specialtyIcon: "🫁",
      headerSubtitle: "Pulmonology & Respiratory Medicine",
      defaultInvestigations: ["Chest X-Ray", "PFT/Spirometry", "CT Chest", "Sputum AFB", "ABG"],
    },
  },

  endocrinology: {
    visitReasons: ["Diabetes Review", "Thyroid Follow-up", "Hormone Check", "HbA1c Review", "Insulin Adjustment", "Osteoporosis Check", "Adrenal Evaluation", "Growth Hormone Review"],
    commonMedications: [
      { name: "Metformin", dosage: "500mg", frequency: "Twice daily", duration: "Ongoing", instructions: "After meals" },
      { name: "Levothyroxine", dosage: "50mcg", frequency: "Once daily empty stomach", duration: "Ongoing" },
      { name: "Glimepiride", dosage: "1mg", frequency: "Once daily before breakfast", duration: "Ongoing" },
      { name: "Insulin Glargine", dosage: "10 units", frequency: "Once at bedtime", duration: "Ongoing" },
      { name: "Vitamin D3", dosage: "60000 IU", frequency: "Once weekly", duration: "8 weeks" },
    ],
    dashboardHighlights: [
      { label: "HbA1c Reviews Due", icon: "Droplets", filterType: "hba1c" },
      { label: "Thyroid Labs Pending", icon: "FlaskConical", filterType: "thyroid_labs" },
    ],
    clinicalFocus: ["Diabetes Mellitus", "Thyroid Disorders", "Obesity", "PCOS", "Osteoporosis"],
    relevantLabCategories: ["diabetes"],
    riskIndicators: [
      { label: "Uncontrolled Sugar", condition: "diabetes" },
    ],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#EA580C",
      accentColor: [234, 88, 12],
      specialtyIcon: "🔬",
      headerSubtitle: "Endocrinology & Metabolism",
      defaultInvestigations: ["HbA1c", "Thyroid Panel", "Fasting Blood Sugar", "Lipid Profile", "Insulin Levels"],
    },
  },

  nephrology: {
    visitReasons: ["Dialysis Review", "Kidney Function Check", "Electrolyte Review", "Post-Transplant Follow-up", "CKD Staging", "Fluid Overload", "Hypertension Review", "Proteinuria Follow-up"],
    commonMedications: [
      { name: "Telmisartan", dosage: "40mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Furosemide", dosage: "40mg", frequency: "Once daily", duration: "As directed" },
      { name: "Sodium Bicarbonate", dosage: "500mg", frequency: "Three times daily", duration: "Ongoing" },
      { name: "Erythropoietin", dosage: "4000 IU", frequency: "Twice weekly", duration: "Ongoing" },
      { name: "Calcium Acetate", dosage: "667mg", frequency: "With each meal", duration: "Ongoing" },
    ],
    dashboardHighlights: [
      { label: "Dialysis Sessions Today", icon: "Droplets", filterType: "dialysis" },
      { label: "Kidney Labs Pending", icon: "FlaskConical", filterType: "kidney_labs" },
    ],
    clinicalFocus: ["CKD", "Dialysis", "Kidney Transplant", "Glomerulonephritis", "Electrolyte Disorders"],
    relevantLabCategories: ["diabetes", "heart_disease"],
    riskIndicators: [
      { label: "Renal Complication", condition: "diabetes" },
    ],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#BE185D",
      accentColor: [190, 24, 93],
      specialtyIcon: "🫘",
      headerSubtitle: "Nephrology & Renal Medicine",
      defaultInvestigations: ["RFT", "Serum Electrolytes", "Urine Routine", "24hr Urine Protein", "Renal Ultrasound"],
    },
  },

  urology: {
    visitReasons: ["UTI Follow-up", "Prostate Check", "Stone Follow-up", "Incontinence Review", "PSA Review", "Post-Surgery Check", "Erectile Dysfunction", "Hematuria Evaluation"],
    commonMedications: [
      { name: "Tamsulosin", dosage: "0.4mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Ciprofloxacin", dosage: "500mg", frequency: "Twice daily", duration: "7 days" },
      { name: "Finasteride", dosage: "5mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Potassium Citrate", dosage: "1080mg", frequency: "Three times daily", duration: "3 months" },
      { name: "Sildenafil", dosage: "50mg", frequency: "As needed", duration: "As directed" },
    ],
    dashboardHighlights: [
      { label: "Procedures Scheduled", icon: "Scissors", filterType: "procedure" },
      { label: "PSA Reviews Due", icon: "FlaskConical", filterType: "psa" },
    ],
    clinicalFocus: ["BPH", "Kidney Stones", "UTI", "Prostate Cancer", "Incontinence"],
    relevantLabCategories: ["cancer"],
    riskIndicators: [
      { label: "Prostate Risk", condition: "cancer" },
    ],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#1E40AF",
      accentColor: [30, 64, 175],
      specialtyIcon: "🩺",
      headerSubtitle: "Urology & Urological Surgery",
      defaultInvestigations: ["Urinalysis", "PSA", "Ultrasound KUB", "Uroflowmetry", "CT KUB"],
    },
  },

  rheumatology: {
    visitReasons: ["Joint Inflammation", "Autoimmune Review", "Medication Adjustment", "Lupus Follow-up", "RA Follow-up", "Gout Attack", "Fibromyalgia Check", "Biologics Review"],
    commonMedications: [
      { name: "Methotrexate", dosage: "15mg", frequency: "Once weekly", duration: "Ongoing", instructions: "Take with folic acid" },
      { name: "Hydroxychloroquine", dosage: "200mg", frequency: "Twice daily", duration: "Ongoing" },
      { name: "Colchicine", dosage: "0.5mg", frequency: "Twice daily", duration: "5 days" },
      { name: "Prednisolone", dosage: "10mg", frequency: "Once daily", duration: "Tapering" },
      { name: "Folic Acid", dosage: "5mg", frequency: "Once weekly (day after MTX)", duration: "Ongoing" },
    ],
    dashboardHighlights: [
      { label: "Biologics Due", icon: "Syringe", filterType: "biologics" },
      { label: "Lab Monitoring Due", icon: "FlaskConical", filterType: "lab_monitoring" },
    ],
    clinicalFocus: ["Rheumatoid Arthritis", "SLE", "Gout", "Ankylosing Spondylitis", "Fibromyalgia"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#7C3AED",
      accentColor: [124, 58, 237],
      specialtyIcon: "🦠",
      headerSubtitle: "Rheumatology & Clinical Immunology",
      defaultInvestigations: ["ESR", "CRP", "ANA", "Rheumatoid Factor", "Anti-CCP", "Uric Acid"],
    },
  },

  general: {
    visitReasons: ["General Checkup", "Fever", "Vaccination", "Health Screening", "Follow-up Visit", "Blood Test Review", "Weight Management", "Annual Physical"],
    commonMedications: [
      { name: "Paracetamol", dosage: "500mg", frequency: "As needed", duration: "3 days" },
      { name: "Azithromycin", dosage: "500mg", frequency: "Once daily", duration: "3 days" },
      { name: "Cetirizine", dosage: "10mg", frequency: "Once daily", duration: "5 days" },
      { name: "Omeprazole", dosage: "20mg", frequency: "Once daily before breakfast", duration: "2 weeks" },
      { name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", duration: "5 days" },
    ],
    dashboardHighlights: [
      { label: "Lab Results Pending", icon: "FlaskConical", filterType: "lab_pending" },
      { label: "Chronic Care Follow-ups", icon: "HeartPulse", filterType: "chronic_care" },
    ],
    clinicalFocus: ["Fever", "Infections", "Preventive Care", "Chronic Disease Management", "Vaccinations"],
    relevantLabCategories: ["diabetes", "heart_disease"],
    riskIndicators: [],
    defaultConsultationMinutes: 15,
    prescriptionFormat: {
      headerColor: "#0066CC",
      accentColor: [0, 102, 204],
      specialtyIcon: "🩺",
      headerSubtitle: "General & Internal Medicine",
      defaultInvestigations: ["CBC", "Blood Sugar", "Urine Routine", "LFT", "RFT"],
    },
  },

  emergency: {
    visitReasons: ["Triage Assessment", "Stabilization Follow-up", "Trauma Review", "Observation", "Critical Care Review", "Post-Resuscitation", "Poisoning Follow-up", "Burns Assessment"],
    commonMedications: [
      { name: "Normal Saline IV", dosage: "500ml", frequency: "As needed", duration: "Acute" },
      { name: "Adrenaline", dosage: "0.5mg IM", frequency: "As needed", duration: "Acute" },
      { name: "Morphine", dosage: "2-4mg IV", frequency: "As needed", duration: "Acute" },
      { name: "Ceftriaxone", dosage: "1g IV", frequency: "Twice daily", duration: "5 days" },
      { name: "Atropine", dosage: "0.6mg IV", frequency: "As needed", duration: "Acute" },
    ],
    dashboardHighlights: [
      { label: "Active Triage Cases", icon: "Siren", filterType: "triage" },
      { label: "Observation Patients", icon: "Clock", filterType: "observation" },
    ],
    clinicalFocus: ["Trauma", "Cardiac Arrest", "Poisoning", "Burns", "Anaphylaxis"],
    appointmentTypes: [{ value: "emergency", label: "Emergency" }, { value: "observation", label: "Observation" }],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 15,
    prescriptionFormat: {
      headerColor: "#B91C1C",
      accentColor: [185, 28, 28],
      specialtyIcon: "🚑",
      headerSubtitle: "Emergency & Critical Care Medicine",
      defaultInvestigations: ["CBC", "ABG", "Electrolytes", "Troponin", "Lactate", "Blood Grouping"],
    },
  },

  radiology: {
    visitReasons: ["Report Discussion", "Imaging Review", "Biopsy Planning", "Follow-up Scan Review", "Contrast Study Review", "Interventional Procedure"],
    commonMedications: [
      { name: "Iodinated Contrast (prep)", dosage: "As directed", frequency: "Pre-procedure", duration: "Single dose" },
      { name: "Prednisolone (contrast allergy prep)", dosage: "50mg", frequency: "13h, 7h, 1h before", duration: "Pre-procedure" },
    ],
    dashboardHighlights: [
      { label: "Reports Pending", icon: "FileText", filterType: "reports_pending" },
      { label: "Procedures Scheduled", icon: "Scan", filterType: "procedure" },
    ],
    clinicalFocus: ["Diagnostic Imaging", "Interventional Procedures", "MRI", "CT Scan", "Ultrasound"],
    appointmentTypes: [{ value: "tele_review", label: "Tele-Review" }, { value: "procedure", label: "Procedure" }],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#6D28D9",
      accentColor: [109, 40, 217],
      specialtyIcon: "📡",
      headerSubtitle: "Radiology & Diagnostic Imaging",
      defaultInvestigations: ["X-Ray", "CT Scan", "MRI", "Ultrasound", "PET Scan"],
    },
  },

  dental: {
    visitReasons: ["Cleaning", "Cavity/Filling", "Root Canal", "Orthodontic Check", "Extraction", "Crown/Bridge", "Gum Treatment", "Teeth Whitening"],
    commonMedications: [
      { name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", duration: "5 days" },
      { name: "Ibuprofen", dosage: "400mg", frequency: "Three times daily", duration: "3 days", instructions: "After meals" },
      { name: "Metronidazole", dosage: "400mg", frequency: "Three times daily", duration: "5 days" },
      { name: "Chlorhexidine Mouthwash", dosage: "0.2%", frequency: "Twice daily", duration: "2 weeks" },
      { name: "Lidocaine Gel", dosage: "2%", frequency: "Apply as needed", duration: "As needed" },
    ],
    dashboardHighlights: [
      { label: "Procedures Today", icon: "Scissors", filterType: "procedure" },
      { label: "Orthodontic Reviews", icon: "Smile", filterType: "orthodontic" },
    ],
    clinicalFocus: ["Caries", "Periodontal Disease", "Orthodontics", "Oral Surgery", "Prosthodontics"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#0284C7",
      accentColor: [2, 132, 199],
      specialtyIcon: "🦷",
      headerSubtitle: "Dental & Oral Health",
      defaultInvestigations: ["OPG", "IOPA X-Ray", "CBCT"],
    },
  },

  rehabilitation: {
    visitReasons: ["Physical Therapy Session", "Post-Stroke Review", "Pain Management", "Mobility Assessment", "Occupational Therapy", "Speech Therapy", "Post-Injury Rehab", "Ergonomic Assessment"],
    commonMedications: [
      { name: "Baclofen", dosage: "10mg", frequency: "Three times daily", duration: "2 weeks" },
      { name: "Diclofenac Gel", dosage: "1%", frequency: "Apply three times daily", duration: "2 weeks" },
      { name: "Gabapentin", dosage: "300mg", frequency: "Three times daily", duration: "As directed" },
      { name: "Vitamin B Complex", dosage: "1 tablet", frequency: "Once daily", duration: "3 months" },
    ],
    dashboardHighlights: [
      { label: "Therapy Sessions Today", icon: "Dumbbell", filterType: "therapy" },
      { label: "Progress Assessments Due", icon: "TrendingUp", filterType: "assessment" },
    ],
    clinicalFocus: ["Stroke Recovery", "Musculoskeletal Rehab", "Neurological Rehab", "Pain Management"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 45,
    prescriptionFormat: {
      headerColor: "#16A34A",
      accentColor: [22, 163, 74],
      specialtyIcon: "🏋️",
      headerSubtitle: "Physical Medicine & Rehabilitation",
      defaultInvestigations: ["EMG", "NCS", "X-Ray", "MRI"],
    },
  },

  alternative: {
    visitReasons: ["Initial Consultation", "Follow-up Visit", "Treatment Review", "Wellness Check", "Chronic Condition Management", "Preventive Care"],
    commonMedications: [
      { name: "As per specialty protocol", dosage: "As directed", frequency: "As directed", duration: "As directed" },
    ],
    dashboardHighlights: [
      { label: "Follow-ups Due", icon: "CalendarCheck", filterType: "followup" },
      { label: "New Consultations", icon: "UserPlus", filterType: "new_consultation" },
    ],
    clinicalFocus: ["Holistic Care", "Chronic Disease", "Wellness", "Preventive Medicine"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#65A30D",
      accentColor: [101, 163, 13],
      specialtyIcon: "🌿",
      headerSubtitle: "Alternative & Complementary Medicine",
    },
  },

  pathology: {
    visitReasons: ["Report Discussion", "Sample Review", "Biopsy Results", "Second Opinion", "Test Planning"],
    commonMedications: [],
    dashboardHighlights: [
      { label: "Reports Pending", icon: "FileText", filterType: "reports_pending" },
      { label: "Samples Received Today", icon: "FlaskConical", filterType: "samples" },
    ],
    clinicalFocus: ["Histopathology", "Clinical Pathology", "Cytology", "Microbiology"],
    relevantLabCategories: ["cancer"],
    riskIndicators: [],
    defaultConsultationMinutes: 15,
    prescriptionFormat: {
      headerColor: "#DB2777",
      accentColor: [219, 39, 119],
      specialtyIcon: "🔬",
      headerSubtitle: "Pathology & Laboratory Medicine",
    },
  },

  anesthesiology: {
    visitReasons: ["Pre-Anesthesia Check", "Pain Clinic Visit", "Post-Op Pain Review", "Chronic Pain Management", "Nerve Block Follow-up"],
    commonMedications: [
      { name: "Pregabalin", dosage: "75mg", frequency: "Twice daily", duration: "As directed" },
      { name: "Tramadol", dosage: "50mg", frequency: "As needed", duration: "5 days" },
      { name: "Duloxetine", dosage: "30mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Lidocaine Patch", dosage: "5%", frequency: "Apply once daily for 12 hours", duration: "As directed" },
    ],
    dashboardHighlights: [
      { label: "Pre-Anesthesia Cases", icon: "Stethoscope", filterType: "pre_anesthesia" },
      { label: "Pain Clinic Visits", icon: "Gauge", filterType: "pain_clinic" },
    ],
    clinicalFocus: ["Regional Anesthesia", "Pain Management", "Critical Care", "Perioperative Medicine"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 20,
    prescriptionFormat: {
      headerColor: "#475569",
      accentColor: [71, 85, 105],
      specialtyIcon: "💉",
      headerSubtitle: "Anesthesiology & Pain Medicine",
      legalDisclaimer: "This prescription may contain controlled substances regulated under narcotic and psychotropic substance laws.",
      defaultInvestigations: ["CBC", "Coagulation Profile", "ECG", "Chest X-Ray"],
    },
  },

  infectious: {
    visitReasons: ["Fever Workup", "TB Follow-up", "HIV Review", "Tropical Fever", "Antibiotic Review", "Travel Medicine", "Vaccination Counseling"],
    commonMedications: [
      { name: "Doxycycline", dosage: "100mg", frequency: "Twice daily", duration: "7 days" },
      { name: "Artemether-Lumefantrine", dosage: "As weight-based", frequency: "Twice daily", duration: "3 days" },
      { name: "Tenofovir/Emtricitabine", dosage: "300/200mg", frequency: "Once daily", duration: "Ongoing" },
      { name: "Isoniazid", dosage: "300mg", frequency: "Once daily", duration: "6 months" },
    ],
    dashboardHighlights: [
      { label: "Culture Results Pending", icon: "Microscope", filterType: "culture" },
      { label: "TB Follow-ups Due", icon: "HeartPulse", filterType: "tb_followup" },
    ],
    clinicalFocus: ["Tuberculosis", "HIV/AIDS", "Malaria", "Dengue", "COVID-19"],
    relevantLabCategories: ["covid19"],
    riskIndicators: [],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#CA8A04",
      accentColor: [202, 138, 4],
      specialtyIcon: "🦠",
      headerSubtitle: "Infectious Disease & Tropical Medicine",
      defaultInvestigations: ["Blood Culture", "CBC", "Malaria Smear", "Dengue NS1/IgM", "Widal Test"],
    },
  },

  geriatrics: {
    visitReasons: ["Geriatric Assessment", "Falls Review", "Medication Reconciliation", "Cognitive Assessment", "Functional Assessment", "End-of-Life Planning"],
    commonMedications: [
      { name: "Donepezil", dosage: "5mg", frequency: "Once at night", duration: "Ongoing" },
      { name: "Calcium + Vitamin D3", dosage: "500mg/250IU", frequency: "Twice daily", duration: "Ongoing" },
      { name: "Alendronate", dosage: "70mg", frequency: "Once weekly", duration: "Ongoing", instructions: "Take empty stomach, stay upright 30min" },
    ],
    dashboardHighlights: [
      { label: "Falls Risk Assessments", icon: "AlertTriangle", filterType: "falls_risk" },
      { label: "Medication Reviews Due", icon: "Pill", filterType: "med_review" },
    ],
    clinicalFocus: ["Dementia", "Falls Prevention", "Polypharmacy", "Frailty", "Palliative Care"],
    relevantLabCategories: ["diabetes", "heart_disease"],
    riskIndicators: [
      { label: "Frailty Risk", condition: "heart_disease" },
    ],
    defaultConsultationMinutes: 45,
    prescriptionFormat: {
      headerColor: "#78716C",
      accentColor: [120, 113, 108],
      specialtyIcon: "👴",
      headerSubtitle: "Geriatric Medicine",
      defaultInvestigations: ["CBC", "RFT", "Vitamin D", "Vitamin B12", "Bone Density"],
    },
  },

  allergy: {
    visitReasons: ["Allergy Testing", "Immunotherapy Follow-up", "Allergic Reaction Review", "Asthma + Allergy Review", "Food Allergy Assessment", "Drug Allergy Evaluation"],
    commonMedications: [
      { name: "Fexofenadine", dosage: "120mg", frequency: "Once daily", duration: "4 weeks" },
      { name: "Montelukast", dosage: "10mg", frequency: "Once at night", duration: "4 weeks" },
      { name: "EpiPen (Adrenaline)", dosage: "0.3mg", frequency: "As needed (emergency)", duration: "Carry always" },
      { name: "Fluticasone Nasal Spray", dosage: "50mcg/spray", frequency: "2 sprays once daily", duration: "4 weeks" },
    ],
    dashboardHighlights: [
      { label: "Allergy Tests Pending", icon: "TestTube", filterType: "allergy_test" },
      { label: "Immunotherapy Sessions", icon: "Syringe", filterType: "immunotherapy" },
    ],
    clinicalFocus: ["Allergic Rhinitis", "Asthma", "Food Allergies", "Drug Allergies", "Anaphylaxis"],
    relevantLabCategories: [],
    riskIndicators: [],
    defaultConsultationMinutes: 30,
    prescriptionFormat: {
      headerColor: "#F97316",
      accentColor: [249, 115, 22],
      specialtyIcon: "🤧",
      headerSubtitle: "Allergy & Immunology",
      defaultInvestigations: ["IgE Total", "Specific IgE Panel", "Skin Prick Test", "CBC with Eosinophils"],
    },
  },
};

/**
 * Get specialty configuration for a given specialty string.
 * Falls back to "General Medicine" defaults if not found.
 */
export function getSpecialtyConfig(specialty: string | null | undefined): SpecialtyConfig {
  if (!specialty) return SPECIALTY_CONFIGS.general;

  const key = specialty.toLowerCase().trim();

  // Direct group lookup
  const groupKey = SPECIALTY_GROUP_MAP[key];
  if (groupKey && SPECIALTY_CONFIGS[groupKey]) {
    return SPECIALTY_CONFIGS[groupKey];
  }

  // Partial match: check if specialty contains any known group key
  for (const [mapKey, group] of Object.entries(SPECIALTY_GROUP_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      if (SPECIALTY_CONFIGS[group]) return SPECIALTY_CONFIGS[group];
    }
  }

  return SPECIALTY_CONFIGS.general;
}

/**
 * Get the group key for a specialty (used for matching/filtering)
 */
export function getSpecialtyGroupKey(specialty: string | null | undefined): string {
  if (!specialty) return "general";
  const key = specialty.toLowerCase().trim();
  return SPECIALTY_GROUP_MAP[key] || "general";
}

/** Export all config keys for testing/enumeration */
export const ALL_SPECIALTY_GROUPS = Object.keys(SPECIALTY_CONFIGS);
