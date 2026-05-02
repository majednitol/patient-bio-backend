import { format, addDays, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DoctorAvailability, DoctorTimeOff } from "@/types/hospital";
import { DoctorScheduleInfo } from "@/hooks/useHospitalDoctorSchedule";

interface DoctorScheduleGridProps {
  doctors: DoctorScheduleInfo[];
  availabilityMap: Map<string, DoctorAvailability[]>;
  timeOffMap: Map<string, DoctorTimeOff[]>;
  weekStart: Date;
  hospitalId: string;
}

function formatTime(timeStr: string): string {
  // Convert "HH:MM:SS" to "HH:MM" or "H AM/PM"
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return minutes === "00" ? `${displayHour}${ampm}` : `${displayHour}:${minutes}${ampm}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface CellData {
  type: "available" | "not-set" | "time-off-hospital" | "time-off-global";
  content: string;
  reason?: string;
}

function getCellData(
  doctorId: string,
  date: Date,
  availabilityMap: Map<string, DoctorAvailability[]>,
  timeOffMap: Map<string, DoctorTimeOff[]>,
  hospitalId: string
): CellData {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dateStr = format(date, "yyyy-MM-dd");

  // Check time off first (higher priority)
  const timeOffs = timeOffMap.get(doctorId) || [];
  for (const to of timeOffs) {
    const startDate = parseISO(to.start_date);
    const endDate = parseISO(to.end_date);
    
    if (
      isWithinInterval(date, { start: startDate, end: endDate }) ||
      isSameDay(date, startDate) ||
      isSameDay(date, endDate)
    ) {
      // Determine if hospital-specific or global
      const isGlobal = to.hospital_id === null;
      return {
        type: isGlobal ? "time-off-global" : "time-off-hospital",
        content: "OFF",
        reason: to.reason || undefined,
      };
    }
  }

  // Check availability
  const availabilities = availabilityMap.get(doctorId) || [];
  const dayAvailability = availabilities.find((a) => a.day_of_week === dayOfWeek);

  if (dayAvailability) {
    const startTime = formatTime(dayAvailability.start_time);
    const endTime = formatTime(dayAvailability.end_time);
    return {
      type: "available",
      content: `${startTime}-${endTime}`,
    };
  }

  return {
    type: "not-set",
    content: "—",
  };
}

export function DoctorScheduleGrid({
  doctors,
  availabilityMap,
  timeOffMap,
  weekStart,
  hospitalId,
}: DoctorScheduleGridProps) {
  // Generate 7 days starting from weekStart
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  if (doctors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No doctors found at this hospital.</p>
        <p className="text-sm mt-2">Add doctors via the Staff page.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-3 bg-muted/50 border-b border-border min-w-[200px]">
              Doctor
            </th>
            {days.map((day) => (
              <th
                key={day.toISOString()}
                className={cn(
                  "text-center p-3 bg-muted/50 border-b border-border min-w-[100px]",
                  isSameDay(day, today) && "bg-primary/10"
                )}
              >
                <div className="font-medium">{format(day, "EEE")}</div>
                <div className={cn(
                  "text-sm",
                  isSameDay(day, today) ? "text-primary font-semibold" : "text-muted-foreground"
                )}>
                  {format(day, "MMM d")}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doctors.map((doctor) => (
            <tr key={doctor.user_id} className="border-b border-border hover:bg-muted/30">
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={doctor.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(doctor.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-foreground">
                      {doctor.full_name}
                    </div>
                    {doctor.specialty && (
                      <div className="text-xs text-muted-foreground">
                        {doctor.specialty}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              {days.map((day) => {
                const cellData = getCellData(
                  doctor.user_id,
                  day,
                  availabilityMap,
                  timeOffMap,
                  hospitalId
                );

                return (
                  <td
                    key={day.toISOString()}
                    className={cn(
                      "text-center p-3 transition-colors",
                      isSameDay(day, today) && "bg-primary/5",
                      cellData.type === "available" && "bg-green-500/10",
                      cellData.type === "time-off-hospital" && "bg-red-500/10",
                      cellData.type === "time-off-global" && "bg-orange-500/10",
                      cellData.type === "not-set" && "bg-muted/30"
                    )}
                    title={cellData.reason}
                  >
                    <span
                      className={cn(
                        "text-sm",
                        cellData.type === "available" && "text-green-700 dark:text-green-400 font-medium",
                        cellData.type === "time-off-hospital" && "text-red-600 dark:text-red-400",
                        cellData.type === "time-off-global" && "text-orange-600 dark:text-orange-400",
                        cellData.type === "not-set" && "text-muted-foreground"
                      )}
                    >
                      {cellData.content}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
