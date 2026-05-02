import { useMemo } from "react";
import {
  DISEASE_ALIASES,
  extractPhrases,
  scoreDiseases,
  type DiseaseMatch,
} from "@/components/appointments/smartMatchUtils";

// Re-export SPECIALTY_MAP logic inline (it's not exported from smartMatchUtils, and we don't want to change more than needed)
const SPECIALTY_MAP: Record<string, string[]> = {
  "fever|cold|cough|flu|infection|fatigue|weakness": ["General Medicine", "Internal Medicine", "General Physician", "Family Medicine"],
  "chest pain|heart|palpitation|blood pressure|bp|hypertension|breathless": ["Cardiology", "Cardiologist", "Internal Medicine"],
  "bone|joint|fracture|back pain|spine|knee|shoulder|muscle|sprain": ["Orthopedics", "Orthopaedics", "Orthopedic Surgery", "Sports Medicine"],
  "skin|rash|acne|eczema|allergy|itching|hives|dermatitis|psoriasis|fungal": ["Dermatology", "Dermatologist", "Cosmetic Dermatology"],
  "ear|nose|throat|sinus|hearing|tonsil|snoring|voice|hoarseness": ["ENT", "Otolaryngology", "Otorhinolaryngology", "Audiology"],
  "headache|migraine|dizziness|seizure|numbness|tingling|nerve|tremor|memory loss|paralysis": ["Neurology", "Neurologist", "Neurosurgery"],
  "stomach|abdomen|digestion|nausea|vomiting|diarrhea|constipation|acidity|bloating|liver|jaundice": ["Gastroenterology", "Gastroenterologist", "Internal Medicine", "Hepatology"],
  "eye|vision|blur|glasses|cataract|glaucoma|red eye": ["Ophthalmology", "Ophthalmologist", "Eye Specialist", "Retina Specialist"],
  "tooth|teeth|dental|gum|jaw|cavity|root canal": ["Dentistry", "Dental", "Dentist", "Orthodontics", "Oral Surgery"],
  "period|menstrual|pregnancy|pcos|uterus|ovary|fertility|postpartum|menopause": ["Gynecology", "Obstetrics", "OB-GYN", "Gynaecology", "Reproductive Medicine"],
  "child|baby|infant|pediatric|vaccination|growth|developmental": ["Pediatrics", "Paediatrics", "Pediatrician", "Neonatology"],
  "urine|kidney|bladder|urinary|prostate|incontinence": ["Urology", "Urologist", "Nephrology"],
  "anxiety|depression|stress|sleep|insomnia|mental|panic|ocd|adhd|bipolar": ["Psychiatry", "Psychiatrist", "Psychology"],
  "breathing|asthma|lung|respiratory|wheezing|copd|pneumonia|tb": ["Pulmonology", "Pulmonologist", "Respiratory Medicine"],
  "diabetes|thyroid|hormone|sugar level|hba1c|insulin|obesity": ["Endocrinology", "Endocrinologist", "Diabetology", "Internal Medicine"],
  "cancer|tumor|tumour|lump|chemotherapy|radiation|biopsy": ["Oncology", "Medical Oncology", "Radiation Oncology"],
  "rheumatoid|lupus|autoimmune|gout|fibromyalgia|sle": ["Rheumatology", "Rheumatologist"],
  "surgery|pre-op|post-op|hernia|appendix|wound|suture": ["General Surgery", "Laparoscopic Surgery"],
  "dialysis|kidney failure|ckd|transplant|electrolyte": ["Nephrology", "Nephrologist"],
  "allergy|anaphylaxis|immunotherapy|food allergy": ["Allergy", "Immunology"],
  "pain|chronic pain|nerve block": ["Pain Medicine", "Pain Management", "Anesthesiology"],
  "elderly|geriatric|falls|dementia": ["Geriatrics", "Geriatric Medicine"],
  "hiv|malaria|dengue|typhoid|hepatitis|tropical": ["Infectious Disease", "Tropical Medicine"],
};

export interface SmartMatchInfo {
  matchedDiseases: DiseaseMatch[];
  matchedSpecialty: string | null;
  totalScore: number;
}

interface DirectoryDoctor {
  user_id: string;
  full_name: string;
  specialty: string | null;
  qualification: string | null;
  diseases_treated: string[] | null;
  [key: string]: any;
}

export type SmartDoctorResult<T extends DirectoryDoctor> = T & {
  matchInfo?: SmartMatchInfo;
};

export function useSmartDoctorSearch<T extends DirectoryDoctor>(
  query: string,
  doctors: T[],
  availableDoctorIds?: Set<string>
): { results: SmartDoctorResult<T>[]; hasSmartMatches: boolean } {
  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return { results: doctors as SmartDoctorResult<T>[], hasSmartMatches: false };
    }

    const qLower = trimmed.toLowerCase();

    // 1. Specialty inference from SPECIALTY_MAP
    const matchedSpecialties: { specialty: string; score: number }[] = [];
    for (const [keywordsStr, specialties] of Object.entries(SPECIALTY_MAP)) {
      const keywords = keywordsStr.split("|");
      for (const kw of keywords) {
        if (qLower.includes(kw)) {
          for (const spec of specialties) {
            matchedSpecialties.push({ specialty: spec, score: 3 });
          }
        }
      }
    }

    // 2. Phrase extraction for disease matching
    const allDiseases = doctors.flatMap((d) => d.diseases_treated || []);
    const { phrases, singleWords } = extractPhrases(trimmed, allDiseases);

    // 3. Score each doctor
    const scored: SmartDoctorResult<T>[] = [];
    let anySmartMatch = false;

    for (const doc of doctors) {
      // Name/qualification basic match
      const nameMatch =
        doc.full_name.toLowerCase().includes(qLower) ||
        (doc.qualification && doc.qualification.toLowerCase().includes(qLower));
      const nameScore = nameMatch ? 5 : 0;

      // Specialty score
      let specialtyScore = 0;
      let matchedSpecialty: string | null = null;
      const docSpecLower = (doc.specialty || "").toLowerCase();
      // Direct specialty text match
      if (docSpecLower && docSpecLower.includes(qLower)) {
        specialtyScore = 4;
        matchedSpecialty = doc.specialty;
      }
      // SPECIALTY_MAP inference
      if (!matchedSpecialty) {
        for (const ms of matchedSpecialties) {
          if (docSpecLower.includes(ms.specialty.toLowerCase())) {
            specialtyScore = ms.score;
            matchedSpecialty = ms.specialty;
            break;
          }
        }
      }

      // Disease score
      let diseaseScore = 0;
      let matchedDiseases: DiseaseMatch[] = [];
      if (doc.diseases_treated?.length) {
        // Also check basic includes for disease names
        const basicDiseaseMatch = doc.diseases_treated.some((dt) =>
          dt.toLowerCase().includes(qLower)
        );
        if (basicDiseaseMatch) {
          diseaseScore = Math.max(diseaseScore, 2);
        }
        const result = scoreDiseases(phrases, singleWords, qLower, doc.diseases_treated);
        if (result.score > diseaseScore) {
          diseaseScore = result.score;
        }
        matchedDiseases = result.matches;
      }

      const availBonus = availableDoctorIds?.has(doc.user_id) ? 2 : 0;
      const totalScore = nameScore + specialtyScore + diseaseScore + availBonus;
      if (totalScore > 0) {
        if (specialtyScore > 0 || diseaseScore > 0) anySmartMatch = true;
        scored.push({
          ...doc,
          matchInfo: {
            matchedDiseases,
            matchedSpecialty,
            totalScore,
          },
        });
      }
    }

    // Sort by score descending, then alphabetically
    scored.sort((a, b) => {
      const diff = (b.matchInfo?.totalScore || 0) - (a.matchInfo?.totalScore || 0);
      if (diff !== 0) return diff;
      return a.full_name.localeCompare(b.full_name);
    });

    return { results: scored, hasSmartMatches: anySmartMatch };
  }, [query, doctors, availableDoctorIds]);
}

/** Common condition chips for quick filtering */
export const QUICK_FILTER_CONDITIONS = [
  "Diabetes",
  "High BP",
  "Back Pain",
  "Asthma",
  "Skin Problems",
  "Thyroid",
  "Heart",
  "Depression",
] as const;
