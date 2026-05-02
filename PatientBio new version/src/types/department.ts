export interface Department {
  id: string;
  hospital_id: string;
  name: string;
  description: string | null;
  head_staff_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  head_staff?: {
    id: string;
    doctor_profile?: {
      full_name: string;
    } | null;
  } | null;
  staff_count?: number;
}
