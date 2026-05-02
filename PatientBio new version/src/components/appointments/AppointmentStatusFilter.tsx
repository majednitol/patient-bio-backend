import { Badge } from "@/components/ui/badge";
import { APPOINTMENT_STATUS_OPTIONS, AppointmentStatus, Appointment } from "@/types/hospital";

interface AppointmentStatusFilterProps {
  selectedStatus: AppointmentStatus | "all";
  onStatusChange: (status: AppointmentStatus | "all") => void;
  appointments: Appointment[];
}

export function AppointmentStatusFilter({
  selectedStatus,
  onStatusChange,
  appointments,
}: AppointmentStatusFilterProps) {
  const allCount = appointments.length;

  const statusCounts = APPOINTMENT_STATUS_OPTIONS.reduce((acc, opt) => {
    acc[opt.value] = appointments.filter((a) => a.status === opt.value).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-nowrap">
      <button
        onClick={() => onStatusChange("all")}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
          selectedStatus === "all"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
        }`}
      >
        All
        <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
          {allCount}
        </Badge>
      </button>
      {APPOINTMENT_STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onStatusChange(opt.value)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
            selectedStatus === opt.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
          }`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${opt.color}`} />
          {opt.label}
          {statusCounts[opt.value] > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
              {statusCounts[opt.value]}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
}
