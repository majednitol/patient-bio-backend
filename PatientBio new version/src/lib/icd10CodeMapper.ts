/**
 * ICD-10 Code Mapper Utility
 * Maps common medical conditions to their ICD-10 codes for international compliance
 * Expanded to 80+ most common codes for instant offline lookups
 */

// Top 80 most common ICD-10 codes for quick lookup (cached locally for performance)
const ICD10_QUICK_LOOKUP: Record<string, { code: string; description: string; category: string }> = {
  // Diabetes
  "diabetes": { code: "E11", description: "Type 2 diabetes mellitus", category: "Diabetes" },
  "type 1 diabetes": { code: "E10", description: "Type 1 diabetes mellitus", category: "Diabetes" },
  "type 2 diabetes": { code: "E11", description: "Type 2 diabetes mellitus", category: "Diabetes" },
  "diabetes mellitus": { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Diabetes" },
  "sugar": { code: "E11", description: "Type 2 diabetes mellitus", category: "Diabetes" },
  "sugar disease": { code: "E11", description: "Type 2 diabetes mellitus", category: "Diabetes" },
  "blood sugar": { code: "E11", description: "Type 2 diabetes mellitus", category: "Diabetes" },
  "gestational diabetes": { code: "O24", description: "Diabetes mellitus in pregnancy", category: "Pregnancy" },
  "hypoglycemia": { code: "E16", description: "Other disorders of pancreatic internal secretion", category: "Endocrine" },
  
  // Hypertension
  "hypertension": { code: "I10", description: "Essential (primary) hypertension", category: "Hypertension" },
  "high blood pressure": { code: "I10", description: "Essential (primary) hypertension", category: "Hypertension" },
  "htn": { code: "I10", description: "Essential (primary) hypertension", category: "Hypertension" },
  "bp": { code: "I10", description: "Essential (primary) hypertension", category: "Hypertension" },
  "high bp": { code: "I10", description: "Essential (primary) hypertension", category: "Hypertension" },
  
  // Heart Disease
  "heart failure": { code: "I50", description: "Heart failure", category: "Heart Disease" },
  "chf": { code: "I50", description: "Heart failure", category: "Heart Disease" },
  "congestive heart failure": { code: "I50", description: "Heart failure", category: "Heart Disease" },
  "heart attack": { code: "I21", description: "Acute myocardial infarction", category: "Heart Disease" },
  "myocardial infarction": { code: "I21", description: "Acute myocardial infarction", category: "Heart Disease" },
  "angina": { code: "I20", description: "Angina pectoris", category: "Heart Disease" },
  "coronary artery disease": { code: "I25", description: "Chronic ischemic heart disease", category: "Heart Disease" },
  "cad": { code: "I25", description: "Chronic ischemic heart disease", category: "Heart Disease" },
  "atrial fibrillation": { code: "I48", description: "Atrial fibrillation and flutter", category: "Heart Disease" },
  "afib": { code: "I48", description: "Atrial fibrillation and flutter", category: "Heart Disease" },
  "stroke": { code: "I64", description: "Stroke, not specified", category: "Cardiovascular" },
  "dvt": { code: "I82", description: "Other venous embolism and thrombosis", category: "Cardiovascular" },
  "deep vein thrombosis": { code: "I82", description: "Other venous embolism and thrombosis", category: "Cardiovascular" },
  "pulmonary embolism": { code: "I26", description: "Pulmonary embolism", category: "Cardiovascular" },
  
  // Respiratory
  "asthma": { code: "J45", description: "Asthma", category: "Respiratory" },
  "copd": { code: "J44", description: "Chronic obstructive pulmonary disease", category: "Respiratory" },
  "chronic obstructive pulmonary disease": { code: "J44", description: "Chronic obstructive pulmonary disease", category: "Respiratory" },
  "pneumonia": { code: "J18", description: "Pneumonia, unspecified organism", category: "Respiratory" },
  "bronchitis": { code: "J20", description: "Acute bronchitis", category: "Respiratory" },
  "common cold": { code: "J00", description: "Acute nasopharyngitis (common cold)", category: "Respiratory" },
  "flu": { code: "J11", description: "Influenza due to unidentified influenza virus", category: "Respiratory" },
  "influenza": { code: "J11", description: "Influenza due to unidentified influenza virus", category: "Respiratory" },
  "sinusitis": { code: "J01", description: "Acute sinusitis", category: "Respiratory" },
  "sore throat": { code: "J02", description: "Acute pharyngitis", category: "Respiratory" },
  "tonsillitis": { code: "J03", description: "Acute tonsillitis", category: "Respiratory" },
  
  // Cancer
  "lung cancer": { code: "C34", description: "Malignant neoplasm of bronchus and lung", category: "Cancer" },
  "breast cancer": { code: "C50", description: "Malignant neoplasm of breast", category: "Cancer" },
  "prostate cancer": { code: "C61", description: "Malignant neoplasm of prostate", category: "Cancer" },
  "colon cancer": { code: "C18", description: "Malignant neoplasm of colon", category: "Cancer" },
  "colorectal cancer": { code: "C18", description: "Malignant neoplasm of colon", category: "Cancer" },
  "cervical cancer": { code: "C53", description: "Malignant neoplasm of cervix uteri", category: "Cancer" },
  "liver cancer": { code: "C22", description: "Malignant neoplasm of liver", category: "Cancer" },
  "stomach cancer": { code: "C16", description: "Malignant neoplasm of stomach", category: "Cancer" },
  "leukemia": { code: "C91", description: "Lymphoid leukemia", category: "Cancer" },
  "lymphoma": { code: "C83", description: "Non-follicular lymphoma", category: "Cancer" },
  
  // Mental Health
  "depression": { code: "F32", description: "Major depressive disorder, single episode", category: "Mental Health" },
  "major depression": { code: "F33", description: "Major depressive disorder, recurrent", category: "Mental Health" },
  "anxiety": { code: "F41.1", description: "Generalized anxiety disorder", category: "Mental Health" },
  "gad": { code: "F41.1", description: "Generalized anxiety disorder", category: "Mental Health" },
  "generalized anxiety disorder": { code: "F41.1", description: "Generalized anxiety disorder", category: "Mental Health" },
  "bipolar": { code: "F31", description: "Bipolar affective disorder", category: "Mental Health" },
  "schizophrenia": { code: "F20", description: "Schizophrenia", category: "Mental Health" },
  "ptsd": { code: "F43.1", description: "Post-traumatic stress disorder", category: "Mental Health" },
  "ocd": { code: "F42", description: "Obsessive-compulsive disorder", category: "Mental Health" },
  "adhd": { code: "F90", description: "Attention-deficit hyperactivity disorders", category: "Mental Health" },
  "autism": { code: "F84", description: "Pervasive developmental disorders", category: "Mental Health" },
  "insomnia": { code: "F51", description: "Sleep disorders not due to a substance", category: "Mental Health" },
  
  // COVID-19
  "covid-19": { code: "U07.1", description: "COVID-19, virus identified", category: "COVID-19" },
  "covid": { code: "U07.1", description: "COVID-19, virus identified", category: "COVID-19" },
  "coronavirus": { code: "U07.1", description: "COVID-19, virus identified", category: "COVID-19" },
  "long covid": { code: "U09", description: "Post-COVID-19 condition", category: "COVID-19" },
  
  // Common conditions
  "gerd": { code: "K21", description: "Gastro-esophageal reflux disease", category: "Digestive" },
  "acid reflux": { code: "K21", description: "Gastro-esophageal reflux disease", category: "Digestive" },
  "heartburn": { code: "K21", description: "Gastro-esophageal reflux disease", category: "Digestive" },
  "back pain": { code: "M54", description: "Dorsalgia (back pain)", category: "Musculoskeletal" },
  "chronic kidney disease": { code: "N18", description: "Chronic kidney disease", category: "Kidney" },
  "ckd": { code: "N18", description: "Chronic kidney disease", category: "Kidney" },
  "kidney stone": { code: "N20", description: "Calculus of kidney and ureter", category: "Kidney" },
  "uti": { code: "N30", description: "Cystitis", category: "Genitourinary" },
  "urinary tract infection": { code: "N30", description: "Cystitis", category: "Genitourinary" },
  "migraine": { code: "G43", description: "Migraine", category: "Neurological" },
  "headache": { code: "R51", description: "Headache", category: "Symptoms" },
  "epilepsy": { code: "G40", description: "Epilepsy", category: "Neurological" },
  "psoriasis": { code: "L40", description: "Psoriasis", category: "Dermatological" },
  "eczema": { code: "L20", description: "Atopic dermatitis", category: "Dermatological" },
  "anemia": { code: "D50", description: "Iron deficiency anemia", category: "Blood" },
  "iron deficiency": { code: "D50", description: "Iron deficiency anemia", category: "Blood" },
  "hypothyroidism": { code: "E03", description: "Other hypothyroidism", category: "Endocrine" },
  "hyperthyroidism": { code: "E05", description: "Thyrotoxicosis (hyperthyroidism)", category: "Endocrine" },
  "obesity": { code: "E66", description: "Overweight and obesity", category: "Metabolic" },
  "high cholesterol": { code: "E78", description: "Disorders of lipoprotein metabolism", category: "Metabolic" },
  "gout": { code: "M10", description: "Gout", category: "Musculoskeletal" },
  "osteoporosis": { code: "M81", description: "Osteoporosis without pathological fracture", category: "Musculoskeletal" },
  "rheumatoid arthritis": { code: "M05", description: "Rheumatoid arthritis with rheumatoid factor", category: "Musculoskeletal" },
  "osteoarthritis": { code: "M19", description: "Other arthrosis", category: "Musculoskeletal" },
  "parkinson": { code: "G20", description: "Parkinson disease", category: "Neurological" },
  "alzheimer": { code: "G30", description: "Alzheimer disease", category: "Neurological" },
  "multiple sclerosis": { code: "G35", description: "Multiple sclerosis", category: "Neurological" },
  "lupus": { code: "M32", description: "Systemic lupus erythematosus", category: "Musculoskeletal" },
  "celiac disease": { code: "K90", description: "Intestinal malabsorption", category: "Digestive" },
  "ibs": { code: "K58", description: "Irritable bowel syndrome", category: "Digestive" },
  "crohn disease": { code: "K50", description: "Crohn disease", category: "Digestive" },
  "ulcerative colitis": { code: "K51", description: "Ulcerative colitis", category: "Digestive" },
  "appendicitis": { code: "K35", description: "Acute appendicitis", category: "Digestive" },
  "gallstones": { code: "K80", description: "Cholelithiasis", category: "Digestive" },
  "cirrhosis": { code: "K74", description: "Fibrosis and cirrhosis of liver", category: "Digestive" },
  "fatty liver": { code: "K76", description: "Other diseases of liver", category: "Digestive" },
  "pcos": { code: "E28", description: "Ovarian dysfunction", category: "Endocrine" },
  "endometriosis": { code: "N80", description: "Endometriosis", category: "Genitourinary" },
  "malaria": { code: "B54", description: "Unspecified malaria", category: "Infectious" },
  "dengue": { code: "A90", description: "Dengue fever", category: "Infectious" },
  "tuberculosis": { code: "A15", description: "Respiratory tuberculosis", category: "Infectious" },
  "tb": { code: "A15", description: "Respiratory tuberculosis", category: "Infectious" },
  "hiv": { code: "B20", description: "HIV disease", category: "Infectious" },
  "hepatitis": { code: "B19", description: "Unspecified viral hepatitis", category: "Infectious" },
  "cataract": { code: "H25", description: "Age-related cataract", category: "Ophthalmology" },
  "glaucoma": { code: "H40", description: "Glaucoma", category: "Ophthalmology" },
  "conjunctivitis": { code: "H10", description: "Conjunctivitis", category: "Ophthalmology" },
  "fever": { code: "R50", description: "Fever of other and unknown origin", category: "Symptoms" },
  "cough": { code: "R05", description: "Cough", category: "Symptoms" },
  "fatigue": { code: "R53", description: "Malaise and fatigue", category: "Symptoms" },
  "chest pain": { code: "R07", description: "Pain in throat and chest", category: "Symptoms" },
  "abdominal pain": { code: "R10", description: "Abdominal and pelvic pain", category: "Symptoms" },
  "nausea": { code: "R11", description: "Nausea and vomiting", category: "Symptoms" },
  "dizziness": { code: "R42", description: "Dizziness and giddiness", category: "Symptoms" },
  "concussion": { code: "S06", description: "Intracranial injury", category: "Injury" },
  "sprained ankle": { code: "S93", description: "Dislocation and sprain of ankle and foot", category: "Injury" },
  "allergic reaction": { code: "T78", description: "Adverse effects, not elsewhere classified", category: "Injury" },
  "anaphylaxis": { code: "T78", description: "Adverse effects, not elsewhere classified", category: "Injury" },
};

export interface ICD10Code {
  code: string;
  description: string;
  category: string;
  confidence: "exact" | "fuzzy" | "unknown";
}

/**
 * Look up ICD-10 code for a condition name (synchronous, for FHIR export)
 */
export function lookupICD10Code(conditionName: string): ICD10Code {
  if (!conditionName) {
    return { code: "", description: "", category: "", confidence: "unknown" };
  }

  const normalized = conditionName.toLowerCase().trim();
  
  // Exact match
  if (ICD10_QUICK_LOOKUP[normalized]) {
    return { ...ICD10_QUICK_LOOKUP[normalized], confidence: "exact" };
  }

  // Fuzzy match - check if condition contains any known terms
  for (const [key, value] of Object.entries(ICD10_QUICK_LOOKUP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...value, confidence: "fuzzy" };
    }
  }

  // No match found
  return { code: "", description: conditionName, category: "Unknown", confidence: "unknown" };
}

/**
 * Map multiple conditions to ICD-10 codes
 */
export function mapConditionsToICD10(conditions: string[]): ICD10Code[] {
  return conditions.map(lookupICD10Code);
}

/**
 * Get ICD-10 coding block for FHIR Condition resource
 */
export function getFHIRICD10Coding(conditionName: string): {
  coding: Array<{ system: string; code: string; display: string }>;
  text: string;
} {
  const icd10 = lookupICD10Code(conditionName);

  if (icd10.code) {
    return {
      coding: [
        {
          system: "http://hl7.org/fhir/sid/icd-10",
          code: icd10.code,
          display: icd10.description,
        },
      ],
      text: conditionName,
    };
  }

  return {
    coding: [],
    text: conditionName,
  };
}

/**
 * Get all available ICD-10 codes for display/selection
 */
export function getAllKnownICD10Codes(): Array<{
  term: string;
  code: string;
  description: string;
  category: string;
}> {
  return Object.entries(ICD10_QUICK_LOOKUP).map(([term, info]) => ({
    term,
    ...info,
  }));
}

/**
 * Search ICD-10 codes by term or code
 */
export function searchICD10Codes(query: string): Array<{
  term: string;
  code: string;
  description: string;
  category: string;
}> {
  const normalizedQuery = query.toLowerCase().trim();
  
  return Object.entries(ICD10_QUICK_LOOKUP)
    .filter(([term, info]) => 
      term.includes(normalizedQuery) ||
      info.code.toLowerCase().includes(normalizedQuery) ||
      info.description.toLowerCase().includes(normalizedQuery)
    )
    .map(([term, info]) => ({ term, ...info }));
}
