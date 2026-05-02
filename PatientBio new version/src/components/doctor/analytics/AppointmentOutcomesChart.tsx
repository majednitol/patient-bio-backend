import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { UserX, Activity } from "lucide-react";
import { tooltipStyle } from "./AnalyticsChartTypes";

interface Props {
  data: { name: string; value: number }[];
  noShowRate: number;
}

const OUTCOME_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-4))",
];

export function AppointmentOutcomesChart({ data, noShowRate }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <UserX className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Appointment Outcomes</span>
          </span>
          <Badge
            variant={noShowRate > 15 ? "destructive" : "secondary"}
            className="text-xs flex-shrink-0 whitespace-nowrap"
          >
            {noShowRate.toFixed(1)}% no-show
          </Badge>
        </CardTitle>
        <CardDescription>Completed vs no-show vs cancelled breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={OUTCOME_COLORS[index % 3]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
            <Activity className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">No completed appointments yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
