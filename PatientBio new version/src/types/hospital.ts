export type HospitalType = 'hospital' | 'clinic' | 'diagnostic' | 'pharmacy';

export interface Hospital {
  id: string;
  name: string;
  type: HospitalType | null;
  registration_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface HospitalStaff {
  id: string;
  hospital_id: string;
  user_id: string;
  role: 'admin' | 'doctor' | 'receptionist' | 'nurse';
  department: string | null;
  department_id: string | null;
  employee_id: string | null;
  is_active: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  hospital?: Hospital;
  doctor_profile?: DoctorProfile;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  license_number: string | null;
  specialty: string | null;
  qualification: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_verified: boolean;
  is_online: boolean;
  last_seen_at: string | null;
  practice_type: string;
  diseases_treated: string[] | null;
  follow_up_fee: number | null;
  follow_up_window_days: number;
  languages_spoken: string[] | null;
  created_at: string;
  updated_at: string;
}

export const COMMON_DISEASES = [
  // Original 20
  'Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Migraine',
  'Arthritis', 'Thyroid Disorders', 'Depression', 'Anxiety', 'Skin Disorders',
  'Back Pain', 'Allergies', 'GERD', 'Anemia', 'Obesity', 'COPD',
  'Kidney Disease', 'Liver Disease', 'Cancer', 'Stroke',
  // Infectious
  'Tuberculosis', 'Malaria', 'Dengue', 'Typhoid Fever', 'COVID-19',
  'Pneumonia', 'HIV/AIDS', 'Hepatitis B', 'Hepatitis C', 'Urinary Tract Infection',
  // Cardiovascular
  'Coronary Artery Disease', 'Arrhythmia', 'Hyperlipidemia',
  'Congestive Heart Failure', 'Deep Vein Thrombosis',
  // Endocrine/Metabolic
  'Polycystic Ovary Syndrome', 'Gout', 'Vitamin D Deficiency',
  // Neurological
  'Epilepsy', 'Parkinson\'s Disease', 'Alzheimer\'s Disease', 'Neuropathy', 'Vertigo',
  // Respiratory
  'Bronchitis', 'Sleep Apnea', 'Sinusitis',
  // GI
  'Irritable Bowel Syndrome', 'Peptic Ulcer', 'Hemorrhoids',
  'Fatty Liver Disease', 'Celiac Disease',
  // Musculoskeletal
  'Osteoporosis', 'Fibromyalgia', 'Herniated Disc', 'Carpal Tunnel Syndrome',
  // Dermatological
  'Psoriasis', 'Eczema', 'Acne Vulgaris', 'Vitiligo',
  // Mental Health
  'Bipolar Disorder', 'PTSD', 'OCD', 'ADHD', 'Eating Disorders',
  // Renal/Urological
  'Chronic Kidney Disease', 'Kidney Stones', 'Prostate Enlargement',
  // Autoimmune
  'Lupus', 'Rheumatoid Arthritis', 'Multiple Sclerosis',
  // Women's Health
  'Endometriosis', 'Menstrual Irregularity',
  // Pediatric
  'Childhood Asthma', 'Rickets',
];

export interface DoctorApplication {
  id: string;
  hospital_id: string;
  user_id: string;
  full_name: string;
  license_number: string | null;
  specialty: string | null;
  qualification: string | null;
  experience_years: number | null;
  phone: string | null;
  cover_letter: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  hospital?: Hospital;
}

export type HospitalStaffRole = 'admin' | 'doctor' | 'receptionist' | 'nurse';

export const STAFF_ROLES: { value: HospitalStaffRole; label: string }[] = [
  { value: 'admin', label: 'Administrator' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'nurse', label: 'Nurse' },
];

export const SPECIALTIES = [
  'Addiction Medicine',
  'Adolescent Medicine',
  'Aerospace Medicine',
  'Allergy & Immunology',
  'Anatomy',
  'Andriology',
  'Anesthesiology',
  'Audiology',
  'Ayurvedic Medicine',
  'Bariatric Surgery',
  'Biochemistry',
  'Breast Surgery',
  'Burn Surgery',
  'Cardiac Electrophysiology',
  'Cardiology',
  'Cardiothoracic Surgery',
  'Child & Adolescent Psychiatry',
  'Clinical Genetics',
  'Clinical Nutrition',
  'Clinical Pathology',
  'Clinical Pharmacology',
  'Colorectal Surgery',
  'Community Medicine',
  'Craniofacial Surgery',
  'Critical Care Medicine',
  'Cytopathology',
  'Dentistry',
  'Dermatology',
  'Developmental Pediatrics',
  'Diabetology',
  'Diagnostic Radiology',
  'Emergency Medicine',
  'Endocrinology',
  'ENT / Otolaryngology',
  'Family Medicine',
  'Fetal Medicine',
  'Forensic Medicine',
  'Gastroenterology',
  'General Medicine',
  'General Practice',
  'General Surgery',
  'Geriatrics',
  'Gynecologic Oncology',
  'Gynecology',
  'Hand Surgery',
  'Hematology',
  'Hepatology',
  'Homeopathic Medicine',
  'Hospice & Palliative Medicine',
  'Hyperbaric Medicine',
  'Immunology',
  'Infectious Disease',
  'Integrative Medicine',
  'Internal Medicine',
  'Interventional Cardiology',
  'Interventional Radiology',
  'Laboratory Medicine',
  'Maternal-Fetal Medicine',
  'Medical Genetics & Genomics',
  'Medical Oncology',
  'Microbiology',
  'Molecular Medicine',
  'Neonatology',
  'Nephrology',
  'Neuroradiology',
  'Neurology',
  'Neuropsychiatry',
  'Neurosurgery',
  'Nuclear Medicine',
  'Obstetrics & Gynecology',
  'Occupational Medicine',
  'Oncology',
  'Ophthalmology',
  'Optometry',
  'Oral & Maxillofacial Surgery',
  'Orthodontics',
  'Orthopedics',
  'Osteopathic Medicine',
  'Pain Medicine',
  'Palliative Care',
  'Pathology',
  'Pediatric Cardiology',
  'Pediatric Dentistry',
  'Pediatric Emergency Medicine',
  'Pediatric Endocrinology',
  'Pediatric Gastroenterology',
  'Pediatric Hematology-Oncology',
  'Pediatric Infectious Disease',
  'Pediatric Nephrology',
  'Pediatric Neurology',
  'Pediatric Orthopedics',
  'Pediatric Pulmonology',
  'Pediatric Rheumatology',
  'Pediatric Surgery',
  'Pediatric Urology',
  'Pediatrics',
  'Perinatology',
  'Pharmacology',
  'Physical Medicine & Rehabilitation',
  'Physiology',
  'Plastic Surgery',
  'Podiatry',
  'Preventive Medicine',
  'Proctology',
  'Prosthodontics',
  'Psychiatry',
  'Psychology',
  'Public Health',
  'Pulmonology',
  'Radiation Oncology',
  'Radiology',
  'Reconstructive Surgery',
  'Reproductive Endocrinology',
  'Reproductive Medicine / IVF',
  'Rheumatology',
  'Sexology',
  'Sleep Medicine',
  'Spine Surgery',
  'Sports Medicine',
  'Surgery',
  'Surgical Oncology',
  'Thoracic Surgery',
  'Toxicology',
  'Traditional Medicine',
  'Transfusion Medicine',
  'Transplant Surgery',
  'Trauma Surgery',
  'Tropical Medicine',
  'Unani Medicine',
  'Urgent Care',
  'Urogynecology',
  'Urology',
  'Vascular Medicine',
  'Vascular Surgery',
  'Venereology',
  'Virology',
  'Wound Care',
  'Other',
];

// Appointment Scheduling Types
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  hospital_id: string | null;
  day_of_week: number; // 0=Sunday, 1=Monday, etc.
  start_time: string; // TIME format "HH:MM:SS"
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string | null;
  appointment_date: string; // DATE format "YYYY-MM-DD"
  start_time: string; // TIME format "HH:MM:SS"
  end_time: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  checked_in_at: string | null;
  recurrence_pattern: string | null;
  recurrence_end_date: string | null;
  parent_appointment_id: string | null;
  appointment_type: string | null;
  // Joined fields
  doctor_profile?: DoctorProfile;
  patient_profile?: {
    display_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  hospital?: Hospital;
}

export interface DoctorTimeOff {
  id: string;
  doctor_id: string;
  hospital_id: string | null;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const APPOINTMENT_STATUS_OPTIONS: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-500' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'no_show', label: 'No Show', color: 'bg-orange-500' },
];
