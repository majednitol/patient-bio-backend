import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useHealthData } from "@/hooks/useHealthData";
import { usePatientPrescriptions } from "@/hooks/usePrescriptions";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { generateDoctorVisitPackPDF } from "@/utils/generateDoctorVisitPackPDF";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { subDays, subMonths } from "date-fns";

interface DoctorVisitPackButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const DoctorVisitPackButton = ({
  variant = "default",
  size = "sm",
  className = "",
}: DoctorVisitPackButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  const { healthData } = useHealthData();
  const { data: prescriptions = [] } = usePatientPrescriptions();
  const { records } = useHealthRecords();
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["user-profile-name", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("display_name, date_of_birth, gender, phone, patient_passport_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Fetch latest vitals for this patient
  const { data: latestVitals } = useQuery({
    queryKey: ["visit-pack-vitals", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("patient_vitals")
        .select("bp_systolic, bp_diastolic, heart_rate, spo2, temperature, weight, recorded_at")
        .eq("patient_id", user!.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Fetch recent symptom screenings (last 90 days, up to 3)
  const { data: recentScreenings } = useQuery({
    queryKey: ["visit-pack-screenings", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const ninetyDaysAgo = subDays(new Date(), 90).toISOString();
      const { data } = await supabase
        .from("symptom_screenings")
        .select("symptoms, urgency, urgency_label, summary, reasoning, recommendations, home_remedies, warning_signs, duration, severity, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", ninetyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data || []) as {
        symptoms: string;
        urgency: string;
        urgency_label: string | null;
        summary: string | null;
        reasoning: string | null;
        recommendations: string[] | null;
        home_remedies: string[] | null;
        warning_signs: string[] | null;
        duration: string | null;
        severity: string | null;
        created_at: string;
      }[];
    },
  });

  // Fetch upcoming appointment
  const { data: upcomingAppointment } = useQuery({
    queryKey: ["visit-pack-appointment", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("appointments")
        .select("appointment_date, start_time, reason, doctor_id, hospital_id")
        .eq("patient_id", user!.id)
        .gte("appointment_date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("appointment_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!data) return null;

      // Fetch doctor name
      let doctorName = "—";
      if (data.doctor_id) {
        const { data: doc } = await supabase
          .from("doctor_profiles")
          .select("full_name")
          .eq("user_id", data.doctor_id)
          .maybeSingle();
        if (doc?.full_name) doctorName = doc.full_name;
      }

      // Fetch hospital name
      let hospitalName = "—";
      if (data.hospital_id) {
        const { data: hosp } = await supabase
          .from("hospitals")
          .select("name")
          .eq("id", data.hospital_id)
          .maybeSingle();
        if (hosp?.name) hospitalName = hosp.name;
      }

      return {
        appointment_date: data.appointment_date,
        start_time: data.start_time,
        reason: data.reason,
        doctor_name: doctorName,
        hospital_name: hospitalName,
      };
    },
  });

  // Fetch visit stats (last 12 months)
  const { data: visitStats } = useQuery({
    queryKey: ["visit-pack-stats", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const twelveMonthsAgo = subMonths(new Date(), 12).toISOString().split("T")[0];

      const { data: completed, count } = await supabase
        .from("appointments")
        .select("appointment_date, doctor_id", { count: "exact" })
        .eq("patient_id", user!.id)
        .eq("status", "completed")
        .gte("appointment_date", twelveMonthsAgo)
        .order("appointment_date", { ascending: false })
        .limit(1);

      let lastVisitDoctor = "—";
      if (completed && completed.length > 0 && completed[0].doctor_id) {
        const { data: doc } = await supabase
          .from("doctor_profiles")
          .select("full_name")
          .eq("user_id", completed[0].doctor_id)
          .maybeSingle();
        if (doc?.full_name) lastVisitDoctor = doc.full_name;
      }

      return {
        totalVisits12m: count || 0,
        lastVisitDate: completed?.[0]?.appointment_date || null,
        lastVisitDoctor,
      };
    },
  });

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const labRecords = records.filter((r) => r.category === "lab_result");

      await generateDoctorVisitPackPDF({
        patientName: profile?.display_name || user?.email || "Patient",
        healthData,
        prescriptions,
        labRecords,
        patientProfile: profile ? {
          dateOfBirth: profile.date_of_birth ?? null,
          gender: profile.gender ?? null,
          phone: profile.phone ?? null,
          patientPassportId: profile.patient_passport_id ?? null,
        } : undefined,
        latestVitals: latestVitals ? {
          bp_systolic: latestVitals.bp_systolic,
          bp_diastolic: latestVitals.bp_diastolic,
          heart_rate: latestVitals.heart_rate,
          spo2: latestVitals.spo2,
          temperature: latestVitals.temperature,
          weight: latestVitals.weight,
          recorded_at: latestVitals.recorded_at,
        } : undefined,
        recentScreenings: recentScreenings && recentScreenings.length > 0
          ? recentScreenings.map(s => ({
              symptoms: s.symptoms,
              urgency: s.urgency || "self_care",
              urgency_label: s.urgency_label || "Unknown",
              summary: s.summary || null,
              reasoning: s.reasoning || null,
              recommendations: s.recommendations || [],
              home_remedies: s.home_remedies || [],
              warning_signs: s.warning_signs || [],
              duration: s.duration || null,
              severity: s.severity || null,
              created_at: s.created_at,
            }))
          : undefined,
        upcomingAppointment: upcomingAppointment || undefined,
        visitStats: visitStats || undefined,
      });

      toast({
        title: t("visitPack.ready"),
        description: t("visitPack.readyDesc"),
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast({
        title: t("visitPack.failed"),
        description: t("visitPack.failedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [healthData, prescriptions, records, profile, user, toast, latestVitals, recentScreenings, upcomingAppointment, visitStats]);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleGenerate}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-1 sm:mr-1.5 h-3.5 w-3.5 animate-spin" />
          <span className="hidden sm:inline">{t("visitPack.generating")}</span>
          <span className="sm:hidden">{t("visitPack.generatingShort")}</span>
        </>
      ) : (
        <>
          <FileDown className="mr-1 sm:mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("visitPack.prepareForVisit")}</span>
          <span className="sm:hidden">{t("visitPack.visitPack")}</span>
        </>
      )}
    </Button>
  );
};
