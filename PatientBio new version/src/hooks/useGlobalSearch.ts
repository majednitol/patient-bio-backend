import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useDebounce } from "@/hooks/useDebounce";

export interface SearchResultAction {
  label: string;
  url: string;
  icon?: string;
}

export interface SearchResult {
  id: string;
  type: "patient" | "appointment" | "record" | "prescription" | "report" | "doctor" | "hospital";
  title: string;
  subtitle: string;
  url: string;
  icon: string;
  actions?: SearchResultAction[];
}

const SEARCH_LIMIT = 8;

export const useGlobalSearch = (query: string) => {
  const { user } = useAuth();
  const { data: role } = useUserRole();
  const debouncedQuery = useDebounce(query, 300);

  return useQuery({
    queryKey: ["global-search", debouncedQuery, role, user?.id],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedQuery.trim() || !user?.id || !role) return [];

      const q = debouncedQuery.trim().toLowerCase();
      const results: SearchResult[] = [];

      const searches = getSearchesForRole(role, q, user.id);
      const settled = await Promise.allSettled(searches.map((s) => s.fn()));

      settled.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          results.push(...result.value);
        }
      });

      return results.slice(0, 20);
    },
    enabled: debouncedQuery.trim().length >= 2 && !!user?.id && !!role,
    staleTime: STALE_TIMES.REALTIME,
    placeholderData: (prev) => prev,
  });
};

function getSearchesForRole(role: AppRole, query: string, userId: string) {
  const searches: { fn: () => Promise<SearchResult[]> }[] = [];

  searches.push({ fn: () => searchAppointments(query, role, userId) });

  if (role === "user") {
    searches.push({ fn: () => searchHealthRecords(query, userId) });
    searches.push({ fn: () => searchPrescriptions(query, userId) });
    searches.push({ fn: () => searchDoctorConnections(query, userId) });
  }

  if (role === "doctor" || role === "doctor_staff") {
    searches.push({ fn: () => searchPatients(query, role) });
    searches.push({ fn: () => searchDoctorPrescriptions(query, userId) });
  }

  if (role === "hospital_admin") {
    searches.push({ fn: () => searchPatients(query, role) });
    searches.push({ fn: () => searchHospitalStaff(query) });
  }

  if (role === "pathologist") {
    searches.push({ fn: () => searchPathologistReports(query, userId) });
    searches.push({ fn: () => searchPatients(query, role) });
  }

  if (role === "admin") {
    searches.push({ fn: () => searchPatients(query, role) });
    searches.push({ fn: () => searchHospitals(query) });
  }

  return searches;
}

async function searchAppointments(query: string, role: AppRole, userId: string): Promise<SearchResult[]> {
  let qb = supabase
    .from("appointments")
    .select("id, appointment_date, start_time, reason, status, doctor_id, patient_id")
    .or(`reason.ilike.%${query}%,status.ilike.%${query}%`)
    .limit(SEARCH_LIMIT);

  if (role === "user") qb = qb.eq("patient_id", userId);
  if (role === "doctor" || role === "doctor_staff") qb = qb.eq("doctor_id", userId);

  const { data } = await qb;
  return (data || []).map((a) => ({
    id: a.id,
    type: "appointment",
    title: a.reason || "Appointment",
    subtitle: `${a.appointment_date} at ${a.start_time} · ${a.status}`,
    url: getAppointmentUrl(role),
    icon: "calendar",
    actions: role === "doctor" || role === "doctor_staff"
      ? [{ label: "View", url: `/doctor/appointments` }]
      : undefined,
  }));
}

async function searchHealthRecords(query: string, userId: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("health_records")
    .select("id, title, category, disease_category")
    .eq("user_id", userId)
    .or(`title.ilike.%${query}%,category.ilike.%${query}%,disease_category.ilike.%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((r) => ({
    id: r.id,
    type: "record",
    title: r.title,
    subtitle: `${r.category || "Record"} · ${r.disease_category || "General"}`,
    url: "/dashboard/prescriptions",
    icon: "file-text",
  }));
}

async function searchPrescriptions(query: string, userId: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("prescriptions")
    .select("id, diagnosis, created_at")
    .eq("patient_id", userId)
    .ilike("diagnosis", `%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((p) => ({
    id: p.id,
    type: "prescription",
    title: p.diagnosis || "Prescription",
    subtitle: new Date(p.created_at || "").toLocaleDateString(),
    url: "/dashboard/prescriptions",
    icon: "pill",
  }));
}

async function searchDoctorConnections(query: string, userId: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("doctor_connections")
    .select("id, doctor_name, specialty, hospital_clinic")
    .eq("user_id", userId)
    .or(`doctor_name.ilike.%${query}%,specialty.ilike.%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((d) => ({
    id: d.id,
    type: "doctor",
    title: d.doctor_name,
    subtitle: `${d.specialty || "Doctor"} · ${d.hospital_clinic || ""}`,
    url: "/dashboard/doctors",
    icon: "stethoscope",
  }));
}

async function searchPatients(query: string, role: AppRole): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, phone, patient_passport_id")
    .or(`display_name.ilike.%${query}%,phone.ilike.%${query}%,patient_passport_id.ilike.%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((p) => {
    const url = role === "doctor" || role === "doctor_staff"
      ? `/doctor/patients/${p.user_id}`
      : role === "hospital_admin"
        ? `#patient-${p.user_id}`
        : "#";

    const actions: SearchResultAction[] = [];
    if (role === "doctor" || role === "doctor_staff") {
      actions.push({ label: "View Details", url: `/doctor/patients/${p.user_id}` });
    }

    return {
      id: p.user_id,
      type: "patient" as const,
      title: p.display_name || "Unknown Patient",
      subtitle: p.patient_passport_id || p.phone || "",
      url,
      icon: "user",
      actions: actions.length > 0 ? actions : undefined,
    };
  });
}

async function searchDoctorPrescriptions(query: string, doctorId: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("prescriptions")
    .select("id, diagnosis, created_at")
    .eq("doctor_id", doctorId)
    .ilike("diagnosis", `%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((p) => ({
    id: p.id,
    type: "prescription",
    title: p.diagnosis || "Prescription",
    subtitle: new Date(p.created_at || "").toLocaleDateString(),
    url: "/doctor/prescriptions",
    icon: "pill",
    actions: [{ label: "View", url: `/doctor/prescriptions` }],
  }));
}

async function searchHospitalStaff(query: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("doctor_profiles")
    .select("user_id, full_name, specialty")
    .or(`full_name.ilike.%${query}%,specialty.ilike.%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((d) => ({
    id: d.user_id,
    type: "doctor",
    title: d.full_name,
    subtitle: d.specialty || "Doctor",
    url: "#",
    icon: "stethoscope",
  }));
}

async function searchPathologistReports(query: string, userId: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("pathologist_reports")
    .select("id, report_name, report_type, created_at")
    .eq("pathologist_id", userId)
    .or(`report_name.ilike.%${query}%,report_type.ilike.%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((r) => ({
    id: r.id,
    type: "report",
    title: r.report_name || "Report",
    subtitle: `${r.report_type || "Lab"} · ${new Date(r.created_at || "").toLocaleDateString()}`,
    url: "/pathologist/reports",
    icon: "microscope",
    actions: [{ label: "View Report", url: `/pathologist/reports` }],
  }));
}

async function searchHospitals(query: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from("hospitals")
    .select("id, name, city, phone")
    .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
    .limit(SEARCH_LIMIT);

  return (data || []).map((h) => ({
    id: h.id,
    type: "hospital",
    title: h.name,
    subtitle: `${h.city || ""} · ${h.phone || ""}`,
    url: `/admin/hospitals`,
    icon: "building-2",
  }));
}

function getAppointmentUrl(role: AppRole): string {
  switch (role) {
    case "user": return "/dashboard/appointments";
    case "doctor":
    case "doctor_staff": return "/doctor/appointments";
    case "hospital_admin": return "#";
    default: return "#";
  }
}
