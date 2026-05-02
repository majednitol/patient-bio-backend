import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DoctorDemandRow } from "@/hooks/useDoctorDemandAnalytics";
import { tooltipStyle } from "@/components/doctor/analytics/AnalyticsChartTypes";

interface Props {
  data: DoctorDemandRow[];
}

export function SpecialtyDemandChart({ data }: Props) {
  const chartData = useMemo(() => {
    const map: Record<string, { specialty: string; appointments: number; doctors: number; repeat_pct: number }> = {};
    data.forEach((d) => {
      const key = d.specialty || "Unknown";
      if (!map[key]) map[key] = { specialty: key, appointments: 0, doctors: 0, repeat_pct: 0 };
      map[key].appointments += d.total_appointments;
      map[key].doctors += 1;
      map[key].repeat_pct += d.repeat_patient_pct;
    });
    return Object.values(map)
      .map((s) => ({ ...s, repeat_pct: Math.round(s.repeat_pct / s.doctors) }))
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 12);
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Specialty Demand</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="specialty" type="category" className="text-xs" width={75} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Appointments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
