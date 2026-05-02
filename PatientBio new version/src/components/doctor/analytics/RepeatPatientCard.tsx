import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Repeat, Users, Heart, TrendingUp } from "lucide-react";
import { useDoctorRepeatPatients } from "@/hooks/useDoctorDemandAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  doctorId: string | undefined;
}

export function RepeatPatientCard({ doctorId }: Props) {
  const { data, isLoading } = useDoctorRepeatPatients(doctorId);

  if (isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>;
  }

  if (!data || data.unique_patients === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Repeat className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Patient loyalty data will appear once you have appointments</p>
        </CardContent>
      </Card>
    );
  }

  const loyaltyScore = Math.min(100, Math.round(
    (data.repeat_patient_pct * 0.5) + (Math.min(data.avg_visits_per_patient, 5) * 10)
  ));

  const stats = [
    { icon: Users, label: "Unique Patients", value: data.unique_patients, color: "text-primary bg-primary/10" },
    { icon: Repeat, label: "Repeat Patients", value: data.repeat_patients, color: "text-chart-2 bg-chart-2/10" },
    { icon: TrendingUp, label: "Repeat Rate", value: `${data.repeat_patient_pct}%`, color: "text-chart-3 bg-chart-3/10" },
    { icon: Heart, label: "Loyalty Score", value: loyaltyScore, color: "text-chart-4 bg-chart-4/10" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            Patient Loyalty
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {data.avg_visits_per_patient} avg visits
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        {data.repeat_patient_pct >= 40 && (
          <p className="text-xs text-primary mt-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Excellent! Your repeat rate is above the typical 30% benchmark.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
