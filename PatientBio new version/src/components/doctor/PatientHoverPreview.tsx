/**
 * PatientHoverPreview - Quick summary card shown on hover over a patient name.
 * Shows last vitals, upcoming appointment, and risk flags.
 */
import { usePatientVitalsHistory } from "@/hooks/usePatientVitals";
import { usePatientRiskFlags } from "@/hooks/usePatientRiskFlags";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, Heart, Thermometer, Wind } from "lucide-react";
import { format } from "date-fns";

interface Props {
  patientId: string;
  patientName: string;
  children: React.ReactNode;
}

export function PatientHoverPreview({ patientId, patientName, children }: Props) {
  const { data: vitals } = usePatientVitalsHistory(patientId, 3);
  const { flags, highestLevel } = usePatientRiskFlags(vitals);

  const latest = vitals?.[0];

  return (
    <HoverCard openDelay={400} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-72 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate">{patientName}</p>
          {highestLevel && (
            <Badge
              variant={highestLevel === "critical" ? "destructive" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {flags.length} alert{flags.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {latest ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Latest Vitals</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {latest.bp_systolic && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="h-3 w-3 shrink-0 text-primary" />
                  <span>BP: {latest.bp_systolic}/{latest.bp_diastolic}</span>
                </div>
              )}
              {latest.heart_rate && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Heart className="h-3 w-3 shrink-0 text-destructive" />
                  <span>HR: {latest.heart_rate} bpm</span>
                </div>
              )}
              {latest.spo2 != null && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Wind className="h-3 w-3 shrink-0 text-blue-500" />
                  <span>SpO2: {latest.spo2}%</span>
                </div>
              )}
              {latest.temperature && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Thermometer className="h-3 w-3 shrink-0 text-orange-500" />
                  <span>Temp: {latest.temperature}°C</span>
                </div>
              )}
            </div>
            {latest.recorded_at && (
              <p className="text-[10px] text-muted-foreground/70">
                Recorded {format(new Date(latest.recorded_at), "MMM d, yyyy")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No vitals recorded yet</p>
        )}

        {flags.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Risk Flags</p>
            <div className="flex flex-wrap gap-1">
              {flags.slice(0, 3).map((flag) => (
                <Badge
                  key={flag.id}
                  variant={flag.level === "critical" ? "destructive" : "outline"}
                  className="text-[10px] px-1.5 py-0"
                >
                  {flag.label}
                </Badge>
              ))}
              {flags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{flags.length - 3} more</span>
              )}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
