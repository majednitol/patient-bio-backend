import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartSkeleton, useRechartsComponents } from "@/components/shared/LazyChart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { isThisWeek, isThisMonth } from "date-fns";

interface Order {
  created_at: string;
  received_at?: string | null;
  processing_started_at?: string | null;
  quality_checked_at?: string | null;
  completed_at?: string | null;
  status: string;
}

interface SampleTATAnalyticsProps {
  orders: Order[];
}

type TimeFilter = "week" | "month" | "all";

function hoursBetween(start: string, end: string): number {
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60));
}

export function SampleTATAnalytics({ orders }: SampleTATAnalyticsProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<TimeFilter>("month");
  const { components, isLoading } = useRechartsComponents();

  const data = useMemo(() => {
    const completed = orders.filter(o => {
      if (o.status !== "completed" || !o.completed_at) return false;
      const date = new Date(o.created_at);
      if (filter === "week") return isThisWeek(date);
      if (filter === "month") return isThisMonth(date);
      return true;
    });

    if (completed.length === 0) return null;

    let totalOrderToReceipt = 0;
    let totalReceiptToProcessing = 0;
    let totalProcessingToQC = 0;
    let totalQCToComplete = 0;
    let count = 0;

    completed.forEach(o => {
      if (!o.received_at || !o.processing_started_at || !o.quality_checked_at || !o.completed_at) return;
      totalOrderToReceipt += hoursBetween(o.created_at, o.received_at);
      totalReceiptToProcessing += hoursBetween(o.received_at, o.processing_started_at);
      totalProcessingToQC += hoursBetween(o.processing_started_at, o.quality_checked_at);
      totalQCToComplete += hoursBetween(o.quality_checked_at, o.completed_at);
      count++;
    });

    if (count === 0) return null;

    return [
      {
        name: "Avg TAT",
        "Order → Receipt": +(totalOrderToReceipt / count).toFixed(1),
        "Receipt → Processing": +(totalReceiptToProcessing / count).toFixed(1),
        "Processing → QC": +(totalProcessingToQC / count).toFixed(1),
        "QC → Complete": +(totalQCToComplete / count).toFixed(1),
      },
    ];
  }, [orders, filter]);

  const COLORS = ["hsl(var(--primary))", "hsl(210, 70%, 55%)", "hsl(270, 60%, 55%)", "hsl(150, 60%, 40%)"];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Turnaround Time Analytics
              </CardTitle>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex gap-1 mb-4">
              {(["week", "month", "all"] as TimeFilter[]).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  className="text-xs h-7"
                  onClick={() => setFilter(f)}
                >
                  {f === "week" ? "This Week" : f === "month" ? "This Month" : "All Time"}
                </Button>
              ))}
            </div>

            {!data ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No completed orders with full tracking data in this period
              </p>
            ) : isLoading || !components ? (
              <ChartSkeleton height={120} />
            ) : (
              <components.ResponsiveContainer width="100%" height={120}>
                <components.BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <components.CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <components.XAxis type="number" tick={{ fontSize: 11 }} unit="h" />
                  <components.YAxis type="category" dataKey="name" hide />
                  <components.Tooltip
                    formatter={(value: number, name: string) => [`${value}h`, name]}
                  />
                  <components.Legend wrapperStyle={{ fontSize: 11 }} />
                  {["Order → Receipt", "Receipt → Processing", "Processing → QC", "QC → Complete"].map((key, i) => (
                    <components.Bar key={key} dataKey={key} stackId="a" fill={COLORS[i]} />
                  ))}
                </components.BarChart>
              </components.ResponsiveContainer>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
