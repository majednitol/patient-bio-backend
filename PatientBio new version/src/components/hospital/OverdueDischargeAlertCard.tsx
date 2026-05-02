import { useAdmissions } from "@/hooks/useAdmissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Eye } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface OverdueDischargeAlertCardProps {
  hospitalId: string;
}

export default function OverdueDischargeAlertCard({ hospitalId }: OverdueDischargeAlertCardProps) {
  const { data: admissions } = useAdmissions(hospitalId);
  const navigate = useNavigate();

  const now = new Date();
  const overduePatients = (admissions || []).filter(
    (a) =>
      a.status === "admitted" &&
      a.expected_discharge &&
      new Date(a.expected_discharge) < now
  );

  if (overduePatients.length === 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Overdue Discharges ({overduePatients.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {overduePatients.slice(0, 5).map((adm) => {
            const daysOverdue = differenceInDays(now, new Date(adm.expected_discharge!));
            return (
              <div
                key={adm.id}
                className="flex items-center justify-between p-2 rounded-lg bg-background border"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {adm.patient_profile?.display_name || "Patient"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expected: {format(new Date(adm.expected_discharge!), "MMM d")} •{" "}
                    <span className="text-destructive font-medium">
                      {daysOverdue}d overdue
                    </span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/hospital/${hospitalId}/admissions`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {overduePatients.length > 5 && (
            <Button
              variant="link"
              size="sm"
              className="text-destructive"
              onClick={() => navigate(`/hospital/${hospitalId}/admissions`)}
            >
              View all {overduePatients.length} overdue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
