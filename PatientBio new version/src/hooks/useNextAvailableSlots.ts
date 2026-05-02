import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parse, addMinutes, isBefore, isAfter, isEqual } from "date-fns";

/**
 * For a list of doctor IDs, find the next available appointment slot for each.
 * Returns a map of doctorId -> { date, time } or null if none found within 7 days.
 */
export function useNextAvailableSlots(doctorIds: string[]) {
  return useQuery({
    queryKey: ["next-available-slots", ...doctorIds.sort()],
    queryFn: async (): Promise<Record<string, { date: string; time: string } | null>> => {
      if (doctorIds.length === 0) return {};

      const result: Record<string, { date: string; time: string } | null> = {};

      // Fetch all availability for these doctors
      const { data: allAvailability } = await supabase
        .from("doctor_availability")
        .select("doctor_id, day_of_week, start_time, end_time, slot_duration_minutes")
        .in("doctor_id", doctorIds)
        .eq("is_active", true);

      if (!allAvailability?.length) {
        doctorIds.forEach(id => { result[id] = null; });
        return result;
      }

      // Fetch appointments for next 7 days for all doctors
      const today = new Date();
      const weekEnd = addDays(today, 7);
      const { data: allAppointments } = await supabase
        .from("appointments")
        .select("doctor_id, appointment_date, start_time, end_time")
        .in("doctor_id", doctorIds)
        .gte("appointment_date", format(today, "yyyy-MM-dd"))
        .lte("appointment_date", format(weekEnd, "yyyy-MM-dd"))
        .neq("status", "cancelled");

      // Fetch time off
      const { data: allTimeOff } = await supabase
        .from("doctor_time_off")
        .select("doctor_id, start_date, end_date")
        .in("doctor_id", doctorIds)
        .lte("start_date", format(weekEnd, "yyyy-MM-dd"))
        .gte("end_date", format(today, "yyyy-MM-dd"));

      for (const doctorId of doctorIds) {
        const docAvail = allAvailability.filter(a => a.doctor_id === doctorId);
        const docAppts = allAppointments?.filter(a => a.doctor_id === doctorId) || [];
        const docTimeOff = allTimeOff?.filter(t => t.doctor_id === doctorId) || [];

        let found: { date: string; time: string } | null = null;

        for (let dayOffset = 0; dayOffset < 7 && !found; dayOffset++) {
          const checkDate = addDays(today, dayOffset);
          const dateStr = format(checkDate, "yyyy-MM-dd");
          const dow = checkDate.getDay();

          // Check time off
          const isOff = docTimeOff.some(t => dateStr >= t.start_date && dateStr <= t.end_date);
          if (isOff) continue;

          const dayAvail = docAvail.find(a => a.day_of_week === dow);
          if (!dayAvail) continue;

          const dayAppts = docAppts.filter(a => a.appointment_date === dateStr);

          // Find first open slot
          const startTime = parse(dayAvail.start_time, "HH:mm:ss", checkDate);
          const endTime = parse(dayAvail.end_time, "HH:mm:ss", checkDate);
          let cursor = startTime;

          while (isBefore(cursor, endTime)) {
            const slotEnd = addMinutes(cursor, dayAvail.slot_duration_minutes);
            if (isAfter(slotEnd, endTime)) break;

            // Skip past slots for today
            if (dayOffset === 0 && isBefore(cursor, new Date())) {
              cursor = slotEnd;
              continue;
            }

            const slotStartStr = format(cursor, "HH:mm:ss");
            const isBooked = dayAppts.some(appt => {
              const aStart = parse(appt.start_time, "HH:mm:ss", checkDate);
              const aEnd = parse(appt.end_time, "HH:mm:ss", checkDate);
              return (
                ((isAfter(cursor, aStart) || isEqual(cursor, aStart)) && isBefore(cursor, aEnd)) ||
                (isAfter(slotEnd, aStart) && (isBefore(slotEnd, aEnd) || isEqual(slotEnd, aEnd))) ||
                ((isBefore(cursor, aStart) || isEqual(cursor, aStart)) && (isAfter(slotEnd, aEnd) || isEqual(slotEnd, aEnd)))
              );
            });

            if (!isBooked) {
              found = { date: dateStr, time: slotStartStr };
              break;
            }
            cursor = slotEnd;
          }
        }

        result[doctorId] = found;
      }

      return result;
    },
    enabled: doctorIds.length > 0,
    staleTime: STALE_TIMES.FREQUENT,
  });
}
