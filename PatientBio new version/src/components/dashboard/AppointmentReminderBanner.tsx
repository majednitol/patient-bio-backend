import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { hapticWarning } from "@/lib/haptics";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Push-notification-style banner shown on dashboard when an appointment
 * is within 1 hour. Mobile-only, non-intrusive, dismissible.
 */
export const AppointmentReminderBanner = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Only show on dashboard home
  const isOnDashboard = location.pathname === "/dashboard";

  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["upcoming-appointments-reminder", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const today = now.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, doctor_id, doctor_profile:doctor_profiles!appointments_doctor_id_fkey(full_name)")
        .eq("patient_id", user.id)
        .eq("appointment_date", today)
        .in("status", ["scheduled", "confirmed"])
        .order("start_time", { ascending: true })
        .limit(5);

      if (error || !data) return [];

      // Filter to appointments within the next hour
      return data.filter((apt) => {
        const aptTime = new Date(`${apt.appointment_date}T${apt.start_time}`);
        return aptTime > now && aptTime <= oneHourLater;
      });
    },
    enabled: !!user?.id && isOnDashboard,
    refetchInterval: 60_000, // Check every minute
    staleTime: STALE_TIMES.REALTIME,
  });

  const visibleReminder = useMemo(
    () => upcomingAppointments.find((a) => !dismissedIds.has(a.id)) ?? null,
    [upcomingAppointments, dismissedIds]
  );

  useEffect(() => {
    if (visibleReminder) hapticWarning();
  }, [visibleReminder?.id]);

  if (!isOnDashboard || !visibleReminder) return null;

  const aptTime = new Date(`${visibleReminder.appointment_date}T${visibleReminder.start_time}`);
  const doctorProfile = visibleReminder.doctor_profile as { full_name: string } | null;
  const timeUntil = formatDistanceToNow(aptTime, { addSuffix: false });

  return (
    <AnimatePresence>
      <motion.div
        key={visibleReminder.id}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="lg:hidden mb-3"
      >
        <button
          onClick={() => navigate("/dashboard/appointments")}
          className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-left press-feedback"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              Appointment in {timeUntil}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {doctorProfile?.full_name
                ? `Dr. ${doctorProfile.full_name}`
                : "Doctor"}{" "}
              · {visibleReminder.start_time.substring(0, 5)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissedIds((prev) => new Set(prev).add(visibleReminder.id));
            }}
            className="flex-shrink-0 p-1.5 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
