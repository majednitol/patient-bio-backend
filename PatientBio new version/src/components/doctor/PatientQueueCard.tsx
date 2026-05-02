import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePatientQueue, QueueEntry } from "@/hooks/usePatientQueue";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useAverageConsultationDuration } from "@/hooks/useAverageConsultationDuration";
import {
  Users,
  UserCheck,
  PhoneForwarded,
  SkipForward,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Loader2,
  Timer,
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

const priorityConfig = {
  emergency: { icon: Flame, label: "Emergency", className: "bg-destructive text-destructive-foreground" },
  urgent: { icon: AlertTriangle, label: "Urgent", className: "bg-orange-500 text-white" },
  normal: { icon: Clock, label: "Normal", className: "bg-muted text-muted-foreground" },
};

/** Live timer that ticks every second */
function LiveTimer({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = Math.floor((now - new Date(since).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return (
    <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-0.5 animate-pulse">
      <Timer className="h-2.5 w-2.5" />
      {m}:{s.toString().padStart(2, "0")}
    </Badge>
  );
}

function QueueItem({
  entry,
  position,
  isActive,
  estimatedWaitMin,
  onCall,
  onSkip,
  onComplete,
  isPending,
}: {
  entry: QueueEntry;
  position: number;
  isActive: boolean;
  estimatedWaitMin: number | null;
  onCall: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isPending: boolean;
}) {
  const pConfig = priorityConfig[entry.priority];
  const PriorityIcon = pConfig.icon;
  const waitTime = formatDistanceToNow(new Date(entry.checked_in_at), { addSuffix: false });

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors ${
        isActive
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent/30"
      }`}
    >
      {/* Position indicator */}
      {!isActive && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-muted-foreground">{position}</span>
        </div>
      )}
      {isActive && (
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <UserCheck className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
        <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
          {entry.patient_name?.[0]?.toUpperCase() || "P"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium truncate">{entry.patient_name}</span>
          {entry.priority !== "normal" && (
            <Badge className={`text-[10px] px-1.5 py-0 ${pConfig.className}`}>
              <PriorityIcon className="h-2.5 w-2.5 mr-0.5" />
              {pConfig.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {entry.appointment_time && (
            <span>{entry.appointment_time.slice(0, 5)}</span>
          )}
          {entry.appointment_reason && (
            <>
              <span>·</span>
              <span className="truncate">{entry.appointment_reason}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Live timer for in-consultation, est. wait for waiting */}
        {isActive && entry.called_at ? (
          <LiveTimer since={entry.called_at} />
        ) : (
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap block">
              {waitTime}
            </span>
            {estimatedWaitMin !== null && (
              <span className="text-[9px] text-muted-foreground/70 whitespace-nowrap block">
                ~{estimatedWaitMin}m wait
              </span>
            )}
          </div>
        )}
        {isActive ? (
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={onComplete}
            disabled={isPending}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Done
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onSkip}
              disabled={isPending}
            >
              <SkipForward className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onCall}
              disabled={isPending}
            >
              <PhoneForwarded className="h-3 w-3 mr-1" />
              Call
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export const PatientQueueCard = React.memo(function PatientQueueCard() {
  const { effectiveDoctorId } = useStaffAccess();
  const {
    waiting,
    inConsultation,
    isLoading,
    callNext,
    skipPatient,
    completePatient,
  } = usePatientQueue(effectiveDoctorId || undefined);
  const { data: avgDuration } = useAverageConsultationDuration();

  const isPending = callNext.isPending || skipPatient.isPending || completePatient.isPending;
  const avgMin = avgDuration ?? 15; // fallback 15min

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!inConsultation && waiting.length === 0) {
    return null; // Don't show if queue is empty
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Patient Queue
          </span>
          <div className="flex items-center gap-2">
            {inConsultation && (
              <Badge variant="default" className="text-xs">
                <UserCheck className="h-3 w-3 mr-1" />
                1 In Session
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {waiting.length} Waiting
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Currently in consultation */}
        {inConsultation && (
          <QueueItem
            entry={inConsultation}
            position={0}
            isActive
            estimatedWaitMin={null}
            onCall={() => {}}
            onSkip={() => {}}
            onComplete={() => completePatient.mutate(inConsultation.id)}
            isPending={isPending}
          />
        )}

        {/* Waiting list */}
        {waiting.map((entry, idx) => (
          <QueueItem
            key={entry.id}
            entry={entry}
            position={idx + 1}
            isActive={false}
            estimatedWaitMin={Math.round(
              (inConsultation
                ? Math.max(0, avgMin - differenceInMinutes(new Date(), new Date(inConsultation.called_at || inConsultation.checked_in_at)))
                : 0) + idx * avgMin
            )}
            onCall={() => callNext.mutate(entry.id)}
            onSkip={() => skipPatient.mutate(entry.id)}
            onComplete={() => {}}
            isPending={isPending}
          />
        ))}

        {/* Call next shortcut */}
        {!inConsultation && waiting.length > 0 && (
          <Button
            className="w-full mt-2"
            onClick={() => callNext.mutate(waiting[0].id)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <PhoneForwarded className="h-4 w-4 mr-2" />
            )}
            Call Next Patient
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
