import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { DAYS_OF_WEEK } from "@/types/hospital";

function formatTime12(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function groupAvailability(
  availability: { day_of_week: number; start_time: string; end_time: string }[]
) {
  if (availability.length === 0) return [];
  const sorted = [...availability].sort((a, b) => a.day_of_week - b.day_of_week);
  const groups: { days: number[]; start: string; end: string }[] = [];

  for (const slot of sorted) {
    const timeKey = `${slot.start_time}-${slot.end_time}`;
    const lastGroup = groups[groups.length - 1];
    const lastTimeKey = lastGroup ? `${lastGroup.start}-${lastGroup.end}` : null;
    const lastDay = lastGroup ? lastGroup.days[lastGroup.days.length - 1] : -2;

    if (lastGroup && lastTimeKey === timeKey && (slot.day_of_week === lastDay + 1 || (lastDay === 6 && slot.day_of_week === 0))) {
      lastGroup.days.push(slot.day_of_week);
    } else {
      groups.push({ days: [slot.day_of_week], start: slot.start_time, end: slot.end_time });
    }
  }

  return groups.map((g) => {
    const dayLabel = (d: number) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label.slice(0, 3) || "";
    const daysStr =
      g.days.length === 1
        ? dayLabel(g.days[0])
        : `${dayLabel(g.days[0])} - ${dayLabel(g.days[g.days.length - 1])}`;
    return `${daysStr}: ${formatTime12(g.start)} - ${formatTime12(g.end)}`;
  });
}

export interface QuickProfileReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string;
  is_anonymous: boolean;
}

export function useDoctorQuickProfile(doctorId: string | null) {
  const profileQuery = useQuery({
    queryKey: ["doctor-quick-profile", doctorId],
    queryFn: async () => {
      const [profileRes, availRes, hospitalRes] = await Promise.all([
        supabase
          .from("doctor_profiles")
          .select("user_id, full_name, specialty, avatar_url, qualification, experience_years, consultation_fee, is_verified, is_online, last_seen_at, bio, practice_type, diseases_treated, languages_spoken")
          .eq("user_id", doctorId!)
          .maybeSingle(),
        supabase
          .from("doctor_availability")
          .select("day_of_week, start_time, end_time, slot_duration_minutes")
          .eq("doctor_id", doctorId!)
          .eq("is_active", true)
          .order("day_of_week"),
        supabase
          .from("hospital_staff")
          .select("hospital_id, hospitals!inner(name)")
          .eq("user_id", doctorId!)
          .eq("is_active", true)
          .eq("role", "doctor")
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;

      const hospital = hospitalRes.data
        ? (hospitalRes.data.hospitals as unknown as { name: string })?.name
        : null;

      return {
        profile: profileRes.data,
        availability: availRes.data || [],
        hospitalName: hospital,
      };
    },
    enabled: !!doctorId,
    staleTime: STALE_TIMES.STANDARD,
  });

  const reviewsQuery = useQuery({
    queryKey: ["doctor-quick-reviews", doctorId],
    queryFn: async (): Promise<QuickProfileReview[]> => {
      const { data, error } = await supabase
        .from("consultation_feedback")
        .select("id, rating, comment, created_at, is_anonymous, patient_id")
        .eq("doctor_id", doctorId!)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      if (!data?.length) return [];

      // Fetch patient names
      const patientIds = data.filter(r => !r.is_anonymous).map(r => r.patient_id);
      let nameMap: Record<string, string> = {};
      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, display_name")
          .in("user_id", patientIds);
        if (profiles) {
          for (const p of profiles) {
            nameMap[p.user_id] = p.display_name || "Patient";
          }
        }
      }

      return data.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        is_anonymous: r.is_anonymous ?? false,
        patient_name: r.is_anonymous ? "Anonymous" : (nameMap[r.patient_id] || "Patient"),
      }));
    },
    enabled: !!doctorId,
    staleTime: STALE_TIMES.STANDARD,
  });

  return { profileQuery, reviewsQuery };
}
