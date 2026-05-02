import { formatDoctorName } from "@/utils/formatDoctorName";
import { differenceInDays, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bed, Calendar, Clock, User, Stethoscope } from "lucide-react";
import type { HospitalAdmission } from "@/hooks/useHospitalPatientHistory";

interface PatientAdmissionHistoryCardProps {
  admission: HospitalAdmission;
}

export default function PatientAdmissionHistoryCard({ admission }: PatientAdmissionHistoryCardProps) {
  const getStayDuration = () => {
    const endDate = admission.actual_discharge 
      ? new Date(admission.actual_discharge) 
      : new Date();
    const days = differenceInDays(endDate, new Date(admission.admission_date));
    return days === 0 ? "Same day" : days === 1 ? "1 day" : `${days} days`;
  };

  const getStatusBadge = () => {
    switch (admission.status) {
      case "admitted":
        return <Badge variant="default">Currently Admitted</Badge>;
      case "discharged":
        return <Badge variant="secondary">Discharged</Badge>;
      default:
        return <Badge variant="outline">{admission.status}</Badge>;
    }
  };

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* Date and Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(admission.admission_date), "MMM d, yyyy")}
                </span>
                {admission.actual_discharge && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">
                      {format(new Date(admission.actual_discharge), "MMM d, yyyy")}
                    </span>
                  </>
                )}
              </div>
              {getStatusBadge()}
            </div>

            {/* Ward and Bed */}
            {admission.bed && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Bed className="h-3.5 w-3.5" />
                <span>{admission.bed.ward?.name || "Unknown Ward"}</span>
                <span>•</span>
                <span>Bed {admission.bed.bed_number}</span>
              </div>
            )}

            {/* Doctor */}
            {admission.doctor_profile && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{formatDoctorName(admission.doctor_profile.full_name)}</span>
                {admission.doctor_profile.specialty && (
                  <>
                    <span>•</span>
                    <span>{admission.doctor_profile.specialty}</span>
                  </>
                )}
              </div>
            )}

            {/* Diagnosis */}
            {admission.diagnosis && (
              <div className="flex items-center gap-1.5 text-sm">
                <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{admission.diagnosis}</span>
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Stay: {getStayDuration()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
