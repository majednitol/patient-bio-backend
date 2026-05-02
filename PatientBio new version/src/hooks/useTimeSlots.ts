import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TimeSlot, DoctorAvailability, DoctorTimeOff, Appointment } from "@/types/hospital";
import { format, parse, addMinutes, isBefore, isAfter, isEqual } from "date-fns";

interface UseTimeSlotsOptions {
  doctorId: string;
  hospitalId?: string;
  date: Date;
}

export function useTimeSlots({ doctorId, hospitalId, date }: UseTimeSlotsOptions) {
  const dateString = format(date, "yyyy-MM-dd");
  const dayOfWeek = date.getDay();

  return useQuery({
    queryKey: ["time-slots", doctorId, hospitalId, dateString],
    queryFn: async () => {
      // 1. Get doctor's availability for that day of week
      let availabilityQuery = supabase
        .from("doctor_availability")
        .select("id, doctor_id, hospital_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active")
        .eq("doctor_id", doctorId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_active", true);

      if (hospitalId) {
        availabilityQuery = availabilityQuery.eq("hospital_id", hospitalId);
      }

      const { data: availability, error: availError } = await availabilityQuery.maybeSingle();
      
      if (availError) throw availError;
      if (!availability) return []; // No availability for this day

      // 2. Check for time off on this date
      let timeOffQuery = supabase
        .from("doctor_time_off")
        .select("id, doctor_id, hospital_id, start_date, end_date")
        .eq("doctor_id", doctorId)
        .lte("start_date", dateString)
        .gte("end_date", dateString);

      if (hospitalId) {
        timeOffQuery = timeOffQuery.eq("hospital_id", hospitalId);
      }

      const { data: timeOff, error: timeOffError } = await timeOffQuery;
      if (timeOffError) throw timeOffError;

      // If doctor is on time off, no slots available
      if (timeOff && timeOff.length > 0) return [];

      // 3. Get existing appointments for this date
      let appointmentsQuery = supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("doctor_id", doctorId)
        .eq("appointment_date", dateString)
        .neq("status", "cancelled");

      if (hospitalId) {
        appointmentsQuery = appointmentsQuery.eq("hospital_id", hospitalId);
      }

      const { data: appointments, error: apptError } = await appointmentsQuery;
      if (apptError) throw apptError;

      // 4. Calculate available slots
      const slots = calculateAvailableSlots(
        availability as DoctorAvailability,
        appointments as Pick<Appointment, 'start_time' | 'end_time'>[],
        date
      );

      return slots;
    },
    enabled: !!doctorId && !!date,
  });
}

function calculateAvailableSlots(
  availability: DoctorAvailability,
  bookedAppointments: Pick<Appointment, 'start_time' | 'end_time'>[],
  date: Date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const slotDuration = availability.slot_duration_minutes;
  
  // Parse start and end times
  const startTime = parse(availability.start_time, "HH:mm:ss", date);
  const endTime = parse(availability.end_time, "HH:mm:ss", date);
  
  // Generate all possible slots
  let currentSlotStart = startTime;
  
  while (isBefore(currentSlotStart, endTime)) {
    const currentSlotEnd = addMinutes(currentSlotStart, slotDuration);
    
    // Don't add slot if it exceeds end time
    if (isAfter(currentSlotEnd, endTime)) break;
    
    const slotStartStr = format(currentSlotStart, "HH:mm:ss");
    const slotEndStr = format(currentSlotEnd, "HH:mm:ss");
    
    // Check if slot overlaps with any booked appointment
    const isBooked = bookedAppointments.some((appt) => {
      const apptStart = parse(appt.start_time, "HH:mm:ss", date);
      const apptEnd = parse(appt.end_time, "HH:mm:ss", date);
      
      // Check for overlap
      return (
        (isAfter(currentSlotStart, apptStart) || isEqual(currentSlotStart, apptStart)) && 
        isBefore(currentSlotStart, apptEnd)
      ) || (
        isAfter(currentSlotEnd, apptStart) && 
        (isBefore(currentSlotEnd, apptEnd) || isEqual(currentSlotEnd, apptEnd))
      ) || (
        (isBefore(currentSlotStart, apptStart) || isEqual(currentSlotStart, apptStart)) && 
        (isAfter(currentSlotEnd, apptEnd) || isEqual(currentSlotEnd, apptEnd))
      );
    });

    // Don't include past slots for today
    const now = new Date();
    const slotDateTime = parse(slotStartStr, "HH:mm:ss", date);
    const isPast = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd") && 
                   isBefore(slotDateTime, now);
    
    slots.push({
      start_time: slotStartStr,
      end_time: slotEndStr,
      is_available: !isBooked && !isPast,
    });
    
    currentSlotStart = currentSlotEnd;
  }
  
  return slots;
}

// Hook to get available doctors for a hospital
export function useAvailableDoctors(hospitalId?: string) {
  return useQuery({
    queryKey: ["available-doctors", hospitalId],
    queryFn: async () => {
      // Get distinct doctor IDs with availability
      let availabilityQuery = supabase
        .from("doctor_availability")
        .select("doctor_id, hospital_id")
        .eq("is_active", true);

      if (hospitalId) {
        availabilityQuery = availabilityQuery.eq("hospital_id", hospitalId);
      }

      const { data: availabilityData, error: availError } = await availabilityQuery;
      if (availError) throw availError;

      if (!availabilityData || availabilityData.length === 0) return [];

      // Get unique doctor IDs
      const doctorIds = [...new Set(availabilityData.map((a) => a.doctor_id))];

      // Fetch doctor profiles
      const { data: profiles, error: profileError } = await supabase
        .from("doctor_profiles")
        .select("id, user_id, full_name, specialty, avatar_url")
        .in("user_id", doctorIds);

      if (profileError) throw profileError;

      // Map profiles with hospital_id
      return profiles?.map((profile) => {
        const availability = availabilityData.find((a) => a.doctor_id === profile.user_id);
        return {
          id: profile.user_id,
          hospital_id: availability?.hospital_id || null,
          full_name: profile.full_name,
          specialty: profile.specialty,
          avatar_url: profile.avatar_url,
        };
      }) || [];
    },
    enabled: true,
  });
}
