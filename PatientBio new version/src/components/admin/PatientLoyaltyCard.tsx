import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Repeat, TrendingUp, Heart } from "lucide-react";
import { DoctorDemandRow } from "@/hooks/useDoctorDemandAnalytics";

interface Props {
  data: DoctorDemandRow[];
}

export function PatientLoyaltyCard({ data }: Props) {
  const stats = useMemo(() => {
    const totalUnique = data.reduce((s, d) => s + d.unique_patients, 0);
    const totalRepeat = data.reduce((s, d) => s + d.repeat_patients, 0);
    const platformRepeatPct = totalUnique > 0 ? Math.round((totalRepeat / totalUnique) * 100) : 0;
    const avgVisits = data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.avg_visits_per_patient, 0) / data.filter(d => d.unique_patients > 0).length * 10) / 10
      : 0;
    const topLoyalty = [...data]
      .filter((d) => d.unique_patients >= 5)
      .sort((a, b) => b.repeat_patient_pct - a.repeat_patient_pct)
      .slice(0, 5);

    return { totalUnique, totalRepeat, platformRepeatPct, avgVisits, topLoyalty };
  }, [data]);

  const cards = [
    { icon: Users, label: "Total Unique Patients", value: stats.totalUnique.toLocaleString(), color: "text-primary bg-primary/10" },
    { icon: Repeat, label: "Repeat Patients", value: stats.totalRepeat.toLocaleString(), color: "text-chart-2 bg-chart-2/10" },
    { icon: TrendingUp, label: "Platform Repeat Rate", value: `${stats.platformRepeatPct}%`, color: "text-chart-3 bg-chart-3/10" },
    { icon: Heart, label: "Avg Visits / Patient", value: String(stats.avgVisits), color: "text-chart-4 bg-chart-4/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{c.value}</p>
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.topLoyalty.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Doctors by Patient Loyalty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topLoyalty.map((doc, i) => (
                <div key={doc.doctor_id} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{doc.full_name}</p>
                      <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-primary">{doc.repeat_patient_pct}%</p>
                    <p className="text-[10px] text-muted-foreground">{doc.repeat_patients} repeat / {doc.unique_patients} total</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
