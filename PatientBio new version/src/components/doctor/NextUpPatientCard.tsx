import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, Clock, Zap } from "lucide-react";
import { PatientRiskIndicator } from "@/components/doctor/PatientRiskIndicator";

interface NextUpPatientCardProps {
  appointment: {
    id: string;
    patient_id: string;
    start_time: string;
    end_time: string;
    reason?: string | null;
    status: string;
    patient_profile?: {
      display_name?: string | null;
    } | null;
  };
}

export const NextUpPatientCard = React.memo(function NextUpPatientCard({ appointment }: NextUpPatientCardProps) {
  const name = appointment.patient_profile?.display_name || "Patient";
  const initials = name[0]?.toUpperCase() || "P";

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-sm">
      <CardContent className="p-2.5 sm:p-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-2.5 w-2.5 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary bg-primary/10">
                NEXT UP
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-semibold truncate">{name}</span>
              <PatientRiskIndicator patientId={appointment.patient_id} />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{appointment.start_time?.slice(0, 5)} - {appointment.end_time?.slice(0, 5)}</span>
              {appointment.reason && (
                <>
                  <span>·</span>
                  <span className="truncate">{appointment.reason}</span>
                </>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-primary/60 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
});
