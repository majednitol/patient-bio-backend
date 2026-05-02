import type { BookableDoctor } from "@/hooks/useBookableDoctors";

export interface DiseaseMatch {
  name: string;
  matchType: "exact" | "synonym" | "substring";
  via?: string; // the alias term used, e.g. "sugar" for Diabetes
}

export interface MatchResult {
  doctorId: string;
  score: number;
  maxScore: number;
  reason: string;
  matchedKeywords: string[];
  isAI?: boolean;
  matchedDiseases?: DiseaseMatch[];
  scoreBreakdown?: {
    specialtyScore: number;
    diseaseScore: number;
    connectionBonus: number;
    ratingBonus?: number;
  };
}

// Map of common symptom keywords to relevant specialties
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
  "period|menstrual|pregnancy|pcos|uterus|ovary|fertility|postpartum|menopause": ["Gynecology", "Obstetrics", "OB-GYN", "Gynaecology", "Reproductive Medicine", "Maternal-Fetal Medicine"],
  "child|baby|infant|pediatric|vaccination|growth|developmental": ["Pediatrics", "Paediatrics", "Pediatrician", "Neonatology"],
  "urine|kidney|bladder|urinary|prostate|incontinence": ["Urology", "Urologist", "Nephrology"],
  "anxiety|depression|stress|sleep|insomnia|mental|panic|ocd|adhd|bipolar": ["Psychiatry", "Psychiatrist", "Psychology", "Child Psychiatry"],
  "breathing|asthma|lung|respiratory|wheezing|copd|pneumonia|tb": ["Pulmonology", "Pulmonologist", "Respiratory Medicine"],
  "diabetes|thyroid|hormone|sugar level|hba1c|insulin|pcos|obesity": ["Endocrinology", "Endocrinologist", "Diabetology", "Internal Medicine"],
  "cancer|tumor|tumour|lump|chemotherapy|radiation|biopsy": ["Oncology", "Medical Oncology", "Radiation Oncology", "Surgical Oncology"],
  "rheumatoid|lupus|autoimmune|gout|fibromyalgia|sle": ["Rheumatology", "Rheumatologist", "Clinical Immunology"],
  "surgery|pre-op|post-op|hernia|appendix|wound|suture": ["General Surgery", "Laparoscopic Surgery", "Surgical Oncology"],
  "physiotherapy|rehabilitation|stroke recovery|mobility|occupational therapy": ["Physical Medicine", "Rehabilitation", "Physiotherapy"],
  "dialysis|kidney failure|ckd|transplant|electrolyte": ["Nephrology", "Nephrologist"],
  "allergy|anaphylaxis|immunotherapy|food allergy|drug allergy": ["Allergy", "Immunology", "Allergy and Immunology"],
  "pain|chronic pain|nerve block|anesthesia": ["Pain Medicine", "Pain Management", "Anesthesiology"],
  "elderly|geriatric|falls|dementia|frailty": ["Geriatrics", "Geriatric Medicine"],
  "hiv|malaria|dengue|typhoid|hepatitis|tropical": ["Infectious Disease", "Tropical Medicine"],
  "x-ray|mri|ct scan|ultrasound|imaging|radiology": ["Radiology", "Diagnostic Imaging", "Interventional Radiology"],
};

/** Synonym map: patient slang/abbreviation → canonical disease name */
export const DISEASE_ALIASES: Record<string, string> = {
  // Diabetes
  "sugar": "Diabetes",
  "sugar level": "Diabetes",
  "blood sugar": "Diabetes",
  "high sugar": "Diabetes",
  "sugar disease": "Diabetes",
  "sugar in urine": "Glycosuria",
  // Hypertension / Hypotension
  "bp": "Hypertension",
  "high bp": "Hypertension",
  "blood pressure": "Hypertension",
  "high blood pressure": "Hypertension",
  "low bp": "Hypotension",
  "low blood pressure": "Hypotension",
  // Tuberculosis
  "tb": "Tuberculosis",
  // UTI
  "uti": "Urinary Tract Infection",
  "urine infection": "Urinary Tract Infection",
  "pee problem": "Urinary Tract Infection",
  "burning pee": "Urinary Tract Infection",
  "burning urine": "Urinary Tract Infection",
  // Urological
  "bed wetting": "Enuresis",
  "prostate problem": "Prostate Enlargement",
  "difficulty urinating": "Urinary Retention",
  // IBS
  "ibs": "Irritable Bowel Syndrome",
  // Hemorrhoids
  "piles": "Hemorrhoids",
  // Kidney Stones
  "stones": "Kidney Stones",
  "kidney stone": "Kidney Stones",
  // Thyroid
  "thyroid problem": "Thyroid Disorder",
  "thyroid issue": "Thyroid Disorder",
  "thyroid swelling": "Goiter",
  "goiter": "Goiter",
  // Epilepsy
  "fits": "Epilepsy",
  "seizures": "Epilepsy",
  // Cardiovascular
  "heart attack": "Myocardial Infarction",
  "cardiac arrest": "Myocardial Infarction",
  "heart failure": "Congestive Heart Failure",
  "heart blockage": "Coronary Artery Disease",
  "blocked artery": "Coronary Artery Disease",
  "irregular heartbeat": "Arrhythmia",
  "high cholesterol": "Hyperlipidemia",
  "heart problem": "Cardiac Disease",
  // Gastrointestinal
  "loose motion": "Diarrhea",
  "loose motions": "Diarrhea",
  "runny stomach": "Diarrhea",
  "watery stool": "Diarrhea",
  "gas": "Flatulence",
  "gas trouble": "Flatulence",
  "bloating": "Flatulence",
  "gas problem": "Gastritis",
  "acidity": "Gastritis",
  "stomach ulcer": "Peptic Ulcer",
  "ulcer": "Peptic Ulcer",
  "food poisoning": "Gastroenteritis",
  "constipation": "Constipation",
  "hard stool": "Constipation",
  "jaundice": "Jaundice",
  "yellow eyes": "Jaundice",
  "liver problem": "Liver Disease",
  "worms": "Intestinal Parasites",
  "stomach worms": "Intestinal Parasites",
  // Respiratory
  "breathlessness": "Dyspnea",
  "shortness of breath": "Dyspnea",
  "cant breathe": "Dyspnea",
  "wheezing": "Bronchospasm",
  "cold": "Common Cold",
  "common cold": "Common Cold",
  "running nose": "Common Cold",
  "sore throat": "Pharyngitis",
  "throat pain": "Pharyngitis",
  "chest congestion": "Bronchitis",
  "snoring": "Obstructive Sleep Apnea",
  "sleep apnea": "Obstructive Sleep Apnea",
  // Neurological
  "memory loss": "Dementia",
  "forgetfulness": "Dementia",
  "paralysis": "Cerebrovascular Accident",
  "stroke": "Cerebrovascular Accident",
  "vertigo": "Vertigo",
  "room spinning": "Vertigo",
  "nerve pain": "Neuropathy",
  // Musculoskeletal
  "back pain": "Lumbar Pain",
  "lower back pain": "Lumbar Pain",
  "slip disc": "Herniated Disc",
  "slipped disc": "Herniated Disc",
  "frozen shoulder": "Adhesive Capsulitis",
  "joint pain": "Arthralgia",
  "arthritis": "Arthritis",
  "swollen joints": "Arthritis",
  "gout": "Gout",
  // Dermatological
  "dandruff": "Seborrheic Dermatitis",
  "ringworm": "Dermatophytosis",
  "fungal infection": "Dermatophytosis",
  "white patches": "Vitiligo",
  "hair loss": "Alopecia",
  "balding": "Alopecia",
  "pimples": "Acne Vulgaris",
  // Endocrine / Metabolic
  "weight gain": "Obesity",
  // Infectious
  "chickenpox": "Varicella",
  "measles": "Measles",
  "typhoid": "Typhoid Fever",
  "chikungunya": "Chikungunya",
  "hiv": "HIV/AIDS",
  "aids": "HIV/AIDS",
  "malaria": "Malaria",
  "dengue": "Dengue",
  "covid": "COVID-19",
  "corona": "COVID-19",
  "pneumonia": "Pneumonia",
  // Women's Health
  "pcos": "Polycystic Ovary Syndrome",
  "pcod": "Polycystic Ovary Syndrome",
  "irregular periods": "Menstrual Irregularity",
  "missed period": "Menstrual Irregularity",
  "white discharge": "Leukorrhea",
  "menopause": "Menopause",
  "hot flashes": "Menopause",
  // Mental Health
  "panic attack": "Panic Disorder",
  "mood swings": "Mood Disorder",
  "ocd": "Obsessive Compulsive Disorder",
  "adhd": "Attention Deficit Hyperactivity Disorder",
  "ptsd": "Post-Traumatic Stress Disorder",
  // Pediatric
  "colic": "Infantile Colic",
  "baby crying": "Infantile Colic",
  "teething": "Teething Pain",
  // Others
  "migraine": "Migraine",
  "asthma": "Asthma",
  // ── New aliases ──
  // Hepatitis
  "hepatitis": "Hepatitis B",
  "liver infection": "Hepatitis B",
  "hep b": "Hepatitis B",
  "hep c": "Hepatitis C",
  // DVT / Clots
  "blood clot": "Deep Vein Thrombosis",
  "dvt": "Deep Vein Thrombosis",
  "leg swelling": "Deep Vein Thrombosis",
  // Autoimmune
  "lupus": "Lupus",
  "sle": "Lupus",
  "ms": "Multiple Sclerosis",
  "multiple sclerosis": "Multiple Sclerosis",
  "ra": "Rheumatoid Arthritis",
  "rheumatoid": "Rheumatoid Arthritis",
  // Bone / Joint
  "osteoporosis": "Osteoporosis",
  "weak bones": "Osteoporosis",
  "brittle bones": "Osteoporosis",
  "fibromyalgia": "Fibromyalgia",
  "body pain": "Fibromyalgia",
  "carpal tunnel": "Carpal Tunnel Syndrome",
  "wrist pain": "Carpal Tunnel Syndrome",
  // Dermatology
  "psoriasis": "Psoriasis",
  "eczema": "Eczema",
  "rash": "Skin Disorders",
  "itching": "Skin Disorders",
  "hives": "Urticaria",
  "urticaria": "Urticaria",
  // ENT
  "ear pain": "Otitis",
  "ear infection": "Otitis",
  "tonsils": "Tonsillitis",
  "sinusitis": "Sinusitis",
  "sinus": "Sinusitis",
  "nose block": "Sinusitis",
  // Eye
  "eye pain": "Eye Disorder",
  "blurry vision": "Refractive Error",
  "cataract": "Cataract",
  "glaucoma": "Glaucoma",
  "pink eye": "Conjunctivitis",
  "conjunctivitis": "Conjunctivitis",
  // Nutrition
  "vitamin d deficiency": "Vitamin D Deficiency",
  "low vitamin d": "Vitamin D Deficiency",
  "b12 deficiency": "Vitamin B12 Deficiency",
  "iron deficiency": "Iron Deficiency Anemia",
  // GI additions
  "fatty liver": "Fatty Liver Disease",
  "celiac": "Celiac Disease",
  "gluten intolerance": "Celiac Disease",
  "acid reflux": "GERD",
  "gerd": "GERD",
  "heartburn": "GERD",
  "crohn's": "Crohn's Disease",
  "colitis": "Ulcerative Colitis",
  // Women's Health additions
  "endometriosis": "Endometriosis",
  "fibroids": "Uterine Fibroids",
  "breast lump": "Breast Mass",
  "infertility": "Infertility",
  // Mental Health additions
  "bipolar": "Bipolar Disorder",
  "eating disorder": "Eating Disorders",
  "anorexia": "Anorexia Nervosa",
  "bulimia": "Bulimia Nervosa",
  "insomnia": "Insomnia",
  "cant sleep": "Insomnia",
  "sleep problem": "Insomnia",
  // Pediatric additions
  "rickets": "Rickets",
  "croup": "Croup",
  "hand foot mouth": "Hand Foot and Mouth Disease",
  // Neuro additions
  "parkinson": "Parkinson's Disease",
  "alzheimer": "Alzheimer's Disease",
  "tremor": "Tremor",
  "numbness": "Neuropathy",
  "tingling": "Neuropathy",
  // Cancer aliases
  "tumor": "Cancer",
  "tumour": "Cancer",
  "lump": "Cancer",
  "growth": "Cancer",
};

/** Known short medical abbreviations that bypass the 3-char minimum */
const KNOWN_ABBREVIATIONS = new Set(["tb", "bp", "uti", "ibs", "hiv", "copd", "ecg", "ekg", "ent", "ocd", "adhd", "ptsd", "dvt", "sle", "ms", "ra", "gerd"]);

/** Extract all symptom keywords from SPECIALTY_MAP for typeahead */
export function getAllSymptomKeywords(): string[] {
  const keywords: string[] = [];
  for (const pattern of Object.keys(SPECIALTY_MAP)) {
    keywords.push(...pattern.split("|"));
  }
  // Also add alias keys as suggestions
  for (const alias of Object.keys(DISEASE_ALIASES)) {
    keywords.push(alias);
  }
  return [...new Set(keywords)].sort();
}

/**
 * Extract multi-word phrases from input that match known aliases or disease names.
 * Returns the phrases found and the remaining single words.
 */
export function extractPhrases(input: string, diseasesList: string[]): { phrases: string[]; singleWords: string[] } {
  const lower = input.toLowerCase();
  const matchedPhrases: string[] = [];
  let remaining = lower;

  // Collect all multi-word patterns: alias keys + doctor disease names
  const multiWordPatterns: string[] = [];
  for (const alias of Object.keys(DISEASE_ALIASES)) {
    if (alias.includes(" ")) multiWordPatterns.push(alias);
  }
  for (const disease of diseasesList) {
    const dl = disease.toLowerCase();
    if (dl.includes(" ")) multiWordPatterns.push(dl);
  }
  // Sort longest first to match greedily
  multiWordPatterns.sort((a, b) => b.length - a.length);

  for (const phrase of multiWordPatterns) {
    if (remaining.includes(phrase)) {
      matchedPhrases.push(phrase);
      remaining = remaining.replace(phrase, " ");
    }
  }

  // N-gram pass: generate bigrams and trigrams from remaining words to catch non-adjacent/reordered phrases
  const remainingWords = remaining.split(/[\s,;.]+/).filter(Boolean);
  for (const windowSize of [3, 2]) {
    for (let i = 0; i <= remainingWords.length - windowSize; i++) {
      const window = remainingWords.slice(i, i + windowSize);
      const phrase = window.join(" ");
      if (DISEASE_ALIASES[phrase] && !matchedPhrases.includes(phrase)) {
        matchedPhrases.push(phrase);
        // Mark words as consumed
        for (let j = 0; j < windowSize; j++) {
          remainingWords[i + j] = "";
        }
      }
    }
  }

  const singleWords = remainingWords.filter(Boolean);
  return { phrases: matchedPhrases, singleWords };
}

/**
 * Score a single doctor's diseases_treated against patient input.
 * Returns tiered disease matches.
 */
export function scoreDiseases(
  phrases: string[],
  singleWords: string[],
  inputLower: string,
  diseasesTreated: string[]
): { score: number; matches: DiseaseMatch[] } {
  let totalScore = 0;
  const matches: DiseaseMatch[] = [];
  const seen = new Set<string>();

  for (const disease of diseasesTreated) {
    const diseaseLower = disease.toLowerCase();
    if (seen.has(diseaseLower)) continue;

    // 1. Exact match: the full disease name appears in input (highest priority)
    if (inputLower.includes(diseaseLower)) {
      totalScore += 4;
      matches.push({ name: disease, matchType: "exact" });
      seen.add(diseaseLower);
      continue;
    }

    // 2. Check synonym/alias match (phrases first, then single words)
    let aliasMatched = false;
    for (const phrase of phrases) {
      const canonical = DISEASE_ALIASES[phrase];
      if (canonical && canonical.toLowerCase() === diseaseLower) {
        totalScore += 3;
        matches.push({ name: disease, matchType: "synonym", via: phrase });
        seen.add(diseaseLower);
        aliasMatched = true;
        break;
      }
    }
    if (aliasMatched) continue;

    for (const word of singleWords) {
      const canonical = DISEASE_ALIASES[word];
      if (canonical && canonical.toLowerCase() === diseaseLower) {
        totalScore += 3;
        matches.push({ name: disease, matchType: "synonym", via: word });
        seen.add(diseaseLower);
        aliasMatched = true;
        break;
      }
    }
    if (aliasMatched) continue;

    // 2b. Bag-of-words fallback for multi-word alias keys (order-invariant)
    for (const [alias, canonical] of Object.entries(DISEASE_ALIASES)) {
      const aliasWords = alias.split(" ");
      if (aliasWords.length >= 2 && aliasWords.length <= 3 && canonical.toLowerCase() === diseaseLower) {
        if (aliasWords.every(w => inputLower.includes(w))) {
          totalScore += 3;
          matches.push({ name: disease, matchType: "synonym", via: alias });
          seen.add(diseaseLower);
          aliasMatched = true;
          break;
        }
      }
    }
    if (aliasMatched) continue;

    // 3. Substring matching with tiered scoring
    let bestWordScore = 0;
    for (const word of singleWords) {
      const len = word.length;
      // Allow 2-char only for known abbreviations
      if (len < 2) continue;
      if (len < 3 && !KNOWN_ABBREVIATIONS.has(word)) continue;

      if (diseaseLower.includes(word)) {
        const score = len >= 5 ? 2 : 1; // strong vs weak substring
        if (score > bestWordScore) bestWordScore = score;
      }
    }

    // Also check multi-word phrases as substrings of disease
    for (const phrase of phrases) {
      if (!DISEASE_ALIASES[phrase] && diseaseLower.includes(phrase)) {
        bestWordScore = Math.max(bestWordScore, 2);
      }
    }

    if (bestWordScore > 0) {
      totalScore += bestWordScore;
      matches.push({ name: disease, matchType: "substring" });
      seen.add(diseaseLower);
    }
  }

  return { score: totalScore, matches };
}

export function keywordMatchDoctors(symptoms: string, doctors: BookableDoctor[]): MatchResult[] {
  const lower = symptoms.toLowerCase();
  const matchedSpecialties: { specialty: string; score: number; keywords: string[] }[] = [];

  let totalKeywordMatches = 0;
  for (const [pattern, specialties] of Object.entries(SPECIALTY_MAP)) {
    const keywords = pattern.split("|");
    const matched = keywords.filter((kw) => lower.includes(kw));
    if (matched.length > 0) {
      totalKeywordMatches += matched.length;
      for (const sp of specialties) {
        const existing = matchedSpecialties.find((m) => m.specialty === sp);
        if (existing) {
          existing.score += matched.length;
          existing.keywords.push(...matched);
        } else {
          matchedSpecialties.push({ specialty: sp, score: matched.length, keywords: [...matched] });
        }
      }
    }
  }

  matchedSpecialties.sort((a, b) => b.score - a.score);

  const results: MatchResult[] = [];

  // Gather all diseases from all doctors for phrase extraction
  const allDiseases = doctors.flatMap(d => d.diseases_treated || []);
  const { phrases, singleWords } = extractPhrases(lower, allDiseases);

  for (const doctor of doctors) {
    if (!doctor.has_availability) continue;

    const docSpecLower = (doctor.specialty || "").toLowerCase();
    let specialtyScore = 0;
    let bestSpecialty = "";
    let bestKeywords: string[] = [];

    for (const ms of matchedSpecialties) {
      if (docSpecLower.includes(ms.specialty.toLowerCase())) {
        specialtyScore = ms.score;
        bestSpecialty = ms.specialty;
        bestKeywords = [...new Set(ms.keywords)];
        break;
      }
    }

    // Disease-level matching with tiered scoring
    let diseaseScore = 0;
    let matchedDiseases: DiseaseMatch[] = [];
    if (doctor.diseases_treated?.length) {
      const result = scoreDiseases(phrases, singleWords, lower, doctor.diseases_treated);
      diseaseScore = result.score;
      matchedDiseases = result.matches;
    }

    const totalScore = specialtyScore + diseaseScore;
    if (totalScore <= 0) continue;

    const connectionBonus = doctor.connection_type === "granted_access" ? 2 : 0;
    const maxPossibleScore = Math.max(totalKeywordMatches + 8, 10);

    const reasonParts: string[] = [];
    if (bestSpecialty) reasonParts.push(`Specializes in ${bestSpecialty}`);
    if (matchedDiseases.length > 0) {
      const diseaseNames = matchedDiseases.slice(0, 2).map(d => d.name);
      reasonParts.push(`Treats: ${diseaseNames.join(", ")}`);
    }
    if (doctor.connection_type === "granted_access") reasonParts.push("Your doctor");

    results.push({
      doctorId: doctor.id,
      score: totalScore + connectionBonus,
      maxScore: maxPossibleScore,
      reason: reasonParts.join(" · "),
      matchedKeywords: bestKeywords.slice(0, 3),
      isAI: false,
      matchedDiseases: matchedDiseases.slice(0, 4),
      scoreBreakdown: {
        specialtyScore,
        diseaseScore,
        connectionBonus,
      },
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}

/**
 * Run disease matching against a set of doctors (used by AI path).
 * Returns disease matches per doctor ID.
 */
export function matchDiseasesForDoctors(
  symptoms: string,
  doctors: BookableDoctor[]
): Map<string, { score: number; matches: DiseaseMatch[] }> {
  const lower = symptoms.toLowerCase();
  const allDiseases = doctors.flatMap(d => d.diseases_treated || []);
  const { phrases, singleWords } = extractPhrases(lower, allDiseases);
  
  const result = new Map<string, { score: number; matches: DiseaseMatch[] }>();
  for (const doctor of doctors) {
    if (!doctor.diseases_treated?.length) continue;
    const ds = scoreDiseases(phrases, singleWords, lower, doctor.diseases_treated);
    if (ds.score > 0) {
      result.set(doctor.id, ds);
    }
  }
  return result;
}
