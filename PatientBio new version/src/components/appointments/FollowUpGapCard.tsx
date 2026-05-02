import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFollowUpGaps } from "@/hooks/useFollowUpGaps";
import { AlertTriangle, Calendar, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface FollowUpGapCardProps {
  doctorId: string;
}

export function FollowUpGapCard({ doctorId }: FollowUpGapCardProps) {
  const { data: gaps, isLoading } = useFollowUpGaps(doctorId);

  if (isLoading) return null;
  if (!gaps || gaps.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Follow-Up Gaps
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {gaps.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {gaps.slice(0, 4).map((gap) => (
          <div
            key={gap.patientId}
            className="flex items-center justify-between text-xs bg-background/60 rounded-lg px-2.5 py-2 border border-border/40"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{gap.patientName}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                Last visit: {format(parseISO(gap.lastAppointmentDate), "MMM d")}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] shrink-0 border-amber-400/50 text-amber-600 dark:text-amber-400"
            >
              {gap.daysSinceVisit}d ago
            </Badge>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">
          Patients with no follow-up scheduled after their last visit
        </p>
      </CardContent>
    </Card>
  );
}
