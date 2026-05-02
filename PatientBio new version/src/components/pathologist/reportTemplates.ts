 // Common diagnostic test templates for pathologist reports
 export interface ReportTemplate {
   id: string;
   name: string;
   type: string; // Maps to report_type
   category: string; // Maps to disease_category
   icon: string;
   description: string;
   findings: string; // Pre-filled findings template
 }
 
 export const reportTemplates: ReportTemplate[] = [
   {
     id: "cbc",
     name: "Complete Blood Count (CBC)",
     type: "blood_work",
     category: "general",
     icon: "🩸",
     description: "Full blood count including RBC, WBC, platelets, hemoglobin",
     findings: `COMPLETE BLOOD COUNT (CBC)
 
 PARAMETER          RESULT      REFERENCE RANGE     UNIT
 ─────────────────────────────────────────────────────────
 Hemoglobin         ___         12.0-16.0          g/dL
 RBC Count          ___         4.0-5.5            million/µL
 WBC Count          ___         4,000-11,000       cells/µL
 Platelet Count     ___         150,000-400,000    cells/µL
 Hematocrit (PCV)   ___         36-46              %
 MCV                ___         80-100             fL
 MCH                ___         27-32              pg
 MCHC               ___         32-36              g/dL
 RDW                ___         11.5-14.5          %
 
 DIFFERENTIAL COUNT:
 Neutrophils        ___         40-70              %
 Lymphocytes        ___         20-40              %
 Monocytes          ___         2-8                %
 Eosinophils        ___         1-4                %
 Basophils          ___         0-1                %
 
 IMPRESSION:
 `,
   },
   {
     id: "lft",
     name: "Liver Function Test (LFT)",
     type: "blood_work",
     category: "general",
     icon: "🫀",
     description: "Liver enzymes, bilirubin, albumin, proteins",
     findings: `LIVER FUNCTION TEST (LFT)
 
 PARAMETER              RESULT      REFERENCE RANGE     UNIT
 ──────────────────────────────────────────────────────────────
 Total Bilirubin        ___         0.1-1.2            mg/dL
 Direct Bilirubin       ___         0.0-0.3            mg/dL
 Indirect Bilirubin     ___         0.1-0.9            mg/dL
 SGOT (AST)             ___         5-40               U/L
 SGPT (ALT)             ___         7-56               U/L
 Alkaline Phosphatase   ___         44-147             U/L
 GGT                    ___         9-48               U/L
 Total Protein          ___         6.0-8.3            g/dL
 Albumin                ___         3.5-5.0            g/dL
 Globulin               ___         2.0-3.5            g/dL
 A/G Ratio              ___         1.0-2.0
 
 IMPRESSION:
 `,
   },
   {
     id: "kft",
     name: "Kidney Function Test (KFT)",
     type: "blood_work",
     category: "general",
     icon: "💧",
     description: "Renal function markers including creatinine, BUN, uric acid",
     findings: `KIDNEY FUNCTION TEST (KFT)
 
 PARAMETER              RESULT      REFERENCE RANGE     UNIT
 ──────────────────────────────────────────────────────────────
 Blood Urea             ___         15-40              mg/dL
 Blood Urea Nitrogen    ___         7-20               mg/dL
 Serum Creatinine       ___         0.6-1.2            mg/dL
 Uric Acid              ___         3.5-7.2            mg/dL
 eGFR                   ___         >90                mL/min/1.73m²
 BUN/Creatinine Ratio   ___         10-20
 
 ELECTROLYTES:
 Sodium                 ___         136-145            mEq/L
 Potassium              ___         3.5-5.0            mEq/L
 Chloride               ___         98-106             mEq/L
 Calcium                ___         8.5-10.5           mg/dL
 Phosphorus             ___         2.5-4.5            mg/dL
 
 IMPRESSION:
 `,
   },
   {
     id: "lipid",
     name: "Lipid Profile",
     type: "blood_work",
     category: "heart_disease",
     icon: "❤️",
     description: "Cholesterol, triglycerides, HDL, LDL, VLDL",
     findings: `LIPID PROFILE
 
 PARAMETER              RESULT      REFERENCE RANGE     UNIT
 ──────────────────────────────────────────────────────────────
 Total Cholesterol      ___         <200               mg/dL
 Triglycerides          ___         <150               mg/dL
 HDL Cholesterol        ___         >40 (M), >50 (F)   mg/dL
 LDL Cholesterol        ___         <100               mg/dL
 VLDL Cholesterol       ___         <30                mg/dL
 Total Cholesterol/HDL  ___         <5.0
 LDL/HDL Ratio          ___         <3.5
 
 RISK CATEGORY:
 □ Desirable    □ Borderline High    □ High
 
 IMPRESSION:
 `,
   },
   {
     id: "thyroid",
     name: "Thyroid Profile",
     type: "blood_work",
     category: "general",
     icon: "🦋",
     description: "T3, T4, TSH thyroid function markers",
     findings: `THYROID PROFILE
 
 PARAMETER              RESULT      REFERENCE RANGE     UNIT
 ──────────────────────────────────────────────────────────────
 T3 (Triiodothyronine)  ___         0.8-2.0            ng/mL
 T4 (Thyroxine)         ___         5.1-14.1           µg/dL
 TSH                    ___         0.4-4.0            mIU/L
 Free T3                ___         2.3-4.2            pg/mL
 Free T4                ___         0.8-1.8            ng/dL
 
 INTERPRETATION:
 □ Euthyroid (Normal)
 □ Hypothyroid (Underactive)
 □ Hyperthyroid (Overactive)
 □ Subclinical Hypothyroidism
 □ Subclinical Hyperthyroidism
 
 IMPRESSION:
 `,
   },
   {
     id: "hba1c",
     name: "HbA1c & Glucose",
     type: "blood_work",
     category: "diabetes",
     icon: "🍬",
     description: "Diabetes monitoring with glycated hemoglobin",
     findings: `DIABETES PANEL - HbA1c & GLUCOSE
 
 PARAMETER              RESULT      REFERENCE RANGE     UNIT
 ──────────────────────────────────────────────────────────────
 Fasting Blood Glucose  ___         70-100             mg/dL
 Post Prandial Glucose  ___         <140               mg/dL
 Random Blood Glucose   ___         70-140             mg/dL
 HbA1c                  ___         <5.7               %
 Estimated Avg Glucose  ___         --                 mg/dL
 
 HbA1c INTERPRETATION:
 <5.7%     - Normal
 5.7-6.4%  - Prediabetes
 ≥6.5%     - Diabetes
 
 DIABETIC CONTROL STATUS:
 □ Good Control (<7%)
 □ Fair Control (7-8%)
 □ Poor Control (>8%)
 
 IMPRESSION:
 `,
   },
   {
     id: "urine",
     name: "Urine Routine & Microscopy",
     type: "pathology",
     category: "general",
     icon: "🧪",
     description: "Complete urine analysis with physical, chemical, microscopic exam",
     findings: `URINE ROUTINE & MICROSCOPY
 
 PHYSICAL EXAMINATION:
 ──────────────────────────────────────────────────────────────
 Color                  ___         Pale Yellow
 Appearance             ___         Clear
 Specific Gravity       ___         1.005-1.030
 pH                     ___         4.6-8.0
 
 CHEMICAL EXAMINATION:
 Protein                ___         Negative
 Glucose                ___         Negative
 Ketones                ___         Negative
 Bilirubin              ___         Negative
 Urobilinogen           ___         Normal
 Blood                  ___         Negative
 Nitrite                ___         Negative
 Leukocyte Esterase     ___         Negative
 
 MICROSCOPIC EXAMINATION:
 Pus Cells              ___         0-5/HPF
 RBC                    ___         0-2/HPF
 Epithelial Cells       ___         Few
 Casts                  ___         None
 Crystals               ___         None
 Bacteria               ___         None
 
 IMPRESSION:
 `,
   },
   {
     id: "covid",
     name: "COVID-19 RT-PCR",
     type: "microbiology",
     category: "covid19",
     icon: "🦠",
     description: "SARS-CoV-2 molecular test via RT-PCR",
     findings: `COVID-19 RT-PCR TEST REPORT
 
 SAMPLE DETAILS:
 ──────────────────────────────────────────────────────────────
 Sample Type:           Nasopharyngeal Swab
 Collection Date:       ___
 Collection Time:       ___
 Received Date:         ___
 Reported Date:         ___
 
 TEST METHODOLOGY: Real-Time Reverse Transcription PCR (RT-PCR)
 
 RESULTS:
 ──────────────────────────────────────────────────────────────
 SARS-CoV-2 (COVID-19):  □ DETECTED    □ NOT DETECTED
 
 Ct VALUES (if positive):
 E Gene:                ___
 RdRp Gene:             ___
 N Gene:                ___
 
 INTERPRETATION:
 □ POSITIVE - COVID-19 infection confirmed
 □ NEGATIVE - No COVID-19 infection detected at time of testing
 □ INCONCLUSIVE - Repeat testing recommended
 
 REMARKS:
 `,
   },
   {
     id: "ecg",
     name: "ECG/EKG Report",
     type: "cardiology",
     category: "heart_disease",
     icon: "💓",
     description: "Electrocardiogram interpretation and findings",
     findings: `ELECTROCARDIOGRAM (ECG/EKG) REPORT
 
 PATIENT VITALS AT TIME OF TEST:
 ──────────────────────────────────────────────────────────────
 Heart Rate:            ___ bpm
 Blood Pressure:        ___/___ mmHg
 
 ECG PARAMETERS:
 ──────────────────────────────────────────────────────────────
 Heart Rate:            ___ bpm         (60-100 bpm)
 Rhythm:                ___             (Regular/Irregular)
 PR Interval:           ___ ms          (120-200 ms)
 QRS Duration:          ___ ms          (80-120 ms)
 QT/QTc Interval:       ___/___ ms      (<440 ms)
 Axis:                  ___             (Normal: -30° to +90°)
 
 FINDINGS:
 □ Normal Sinus Rhythm
 □ Sinus Bradycardia
 □ Sinus Tachycardia
 □ Atrial Fibrillation
 □ Atrial Flutter
 □ ST Elevation
 □ ST Depression
 □ T Wave Inversion
 □ Left Ventricular Hypertrophy
 □ Right Ventricular Hypertrophy
 □ Bundle Branch Block (Left/Right)
 □ Other: ___
 
 INTERPRETATION:
 
 CLINICAL CORRELATION:
 `,
   },
   {
     id: "xray",
     name: "X-Ray Report",
     type: "imaging",
     category: "general",
     icon: "📷",
     description: "Radiological examination report template",
     findings: `X-RAY REPORT
 
 EXAMINATION DETAILS:
 ──────────────────────────────────────────────────────────────
 Body Part Examined:    ___
 View(s):               ___
 Technique:             ___
 Clinical History:      ___
 
 FINDINGS:
 ──────────────────────────────────────────────────────────────
 
 
 
 IMPRESSION:
 ──────────────────────────────────────────────────────────────
 
 
 RECOMMENDATION:
 `,
   },
   {
     id: "blank",
     name: "Blank Report",
     type: "",
     category: "",
     icon: "📄",
     description: "Start from scratch with an empty report",
     findings: "",
   },
 ];