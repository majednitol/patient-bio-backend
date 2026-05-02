import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HospitalAdmission {
  id: string;
  admission_date: string;
  actual_discharge: string | null;
  status: string | null;
  diagnosis: string | null;
  admission_reason: string | null;
  bed: {
    bed_number: string;
    ward: { name: string } | null;
  } | null;
  doctor_profile: {
    full_name: string;
    specialty: string | null;
  } | null;
}

export interface HospitalAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  reason: string | null;
  notes: string | null;
  doctor_profile: {
    full_name: string;
    specialty: string | null;
  } | null;
}

export interface HospitalPrescription {
  id: string;
  created_at: string;
  diagnosis: string | null;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
  }>;
  instructions: string | null;
  is_active: boolean | null;
}

export interface HospitalInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  total_amount: number | null;
  amount_paid: number | null;
  notes: string | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export const useHospitalPatientHistory = (patientId: string | null, hospitalId: string) => {
  // Fetch admissions
  const admissionsQuery = useQuery({
    queryKey: ["hospital-patient-admissions", patientId, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admissions")
        .select(`
          id,
          admission_date,
          actual_discharge,
          status,
          diagnosis,
          admission_reason,
          admitting_doctor_id,
          bed:beds(bed_number, ward:wards(name))
        `)
        .eq("hospital_id", hospitalId)
        .eq("patient_id", patientId!)
        .order("admission_date", { ascending: false });

      if (error) throw error;
      
      // Fetch doctor profiles separately due to FK limitations
      const doctorIds = [...new Set(data.map((a) => a.admitting_doctor_id).filter(Boolean))];
      
      let doctorProfiles: Record<string, { full_name: string; specialty: string | null }> = {};
      if (doctorIds.length > 0) {
        const { data: doctors } = await supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty")
          .in("user_id", doctorIds as string[]);
        
        doctorProfiles = (doctors || []).reduce((acc, d) => {
          acc[d.user_id] = { full_name: d.full_name, specialty: d.specialty };
          return acc;
        }, {} as Record<string, { full_name: string; specialty: string | null }>);
      }

      return data.map((admission) => ({
        id: admission.id,
        admission_date: admission.admission_date,
        actual_discharge: admission.actual_discharge,
        status: admission.status,
        diagnosis: admission.diagnosis,
        admission_reason: admission.admission_reason,
        bed: admission.bed,
        doctor_profile: doctorProfiles[admission.admitting_doctor_id] || null,
      })) as HospitalAdmission[];
    },
    enabled: !!patientId && !!hospitalId,
  });

  // Fetch appointments
  const appointmentsQuery = useQuery({
    queryKey: ["hospital-patient-appointments", patientId, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          reason,
          notes,
          doctor_profile:doctor_profiles!appointments_doctor_id_fkey(full_name, specialty)
        `)
        .eq("hospital_id", hospitalId)
        .eq("patient_id", patientId!)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      return data as HospitalAppointment[];
    },
    enabled: !!patientId && !!hospitalId,
  });

  // Fetch prescriptions
  const prescriptionsQuery = useQuery({
    queryKey: ["hospital-patient-prescriptions", patientId, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, created_at, diagnosis, medications, instructions, is_active")
        .eq("hospital_id", hospitalId)
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HospitalPrescription[];
    },
    enabled: !!patientId && !!hospitalId,
  });

  // Fetch invoices
  const invoicesQuery = useQuery({
    queryKey: ["hospital-patient-invoices", patientId, hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          status,
          subtotal,
          tax_amount,
          discount_amount,
          total_amount,
          amount_paid,
          notes,
          items:invoice_items(id, description, quantity, unit_price, total_price)
        `)
        .eq("hospital_id", hospitalId)
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HospitalInvoice[];
    },
    enabled: !!patientId && !!hospitalId,
  });

  // Calculate outstanding balance
  const outstandingBalance = invoicesQuery.data
    ?.filter((i) => i.status !== "paid" && i.status !== "cancelled")
    .reduce((sum, i) => sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0;

  // Calculate total visits (admissions + appointments)
  const totalVisits = (admissionsQuery.data?.length || 0) + (appointmentsQuery.data?.length || 0);

  // Find last visit date
  const lastAdmission = admissionsQuery.data?.[0]?.admission_date;
  const lastAppointment = appointmentsQuery.data?.[0]?.appointment_date;
  let lastVisit: string | null = null;
  if (lastAdmission && lastAppointment) {
    lastVisit = new Date(lastAdmission) > new Date(lastAppointment) ? lastAdmission : lastAppointment;
  } else {
    lastVisit = lastAdmission || lastAppointment || null;
  }

  return {
    admissions: admissionsQuery.data || [],
    appointments: appointmentsQuery.data || [],
    prescriptions: prescriptionsQuery.data || [],
    invoices: invoicesQuery.data || [],
    outstandingBalance,
    totalVisits,
    lastVisit,
    isLoading:
      admissionsQuery.isLoading ||
      appointmentsQuery.isLoading ||
      prescriptionsQuery.isLoading ||
      invoicesQuery.isLoading,
    error:
      admissionsQuery.error ||
      appointmentsQuery.error ||
      prescriptionsQuery.error ||
      invoicesQuery.error,
  };
};
