import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS, tooltipStyle } from "@/components/doctor/analytics/AnalyticsChartTypes";
import type { PatientResearcherShare } from "@/hooks/usePatientResearcherShares";
import type { BroadcastRequest } from "@/hooks/useBroadcastRequests";
import { ShieldCheck, Clock, Activity, Database } from "lucide-react";

interface ShareInsightsPanelProps {
  shares: PatientResearcherShare[];
  broadcasts: BroadcastRequest[];
}

const ShareInsightsPanel = ({ shares, broadcasts }: ShareInsightsPanelProps) => {
  const insights = useMemo(() => {
    // Disease distribution
    const diseaseCounts: Record<string, number> = {};
    for (const s of shares) {
      const cat = s.disease_category || "General";
      diseaseCounts[cat] = (diseaseCounts[cat] || 0) + 1;
    }
    const diseaseData = Object.entries(diseaseCounts)
      .map(([name, value]) => ({ name: name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), value }))
      .sort((a, b) => b.value - a.value);

    // Anonymized ratio
    const anonymized = shares.filter((s) => s.is_anonymized).length;
    const identified = shares.length - anonymized;

    // Average response time (broadcast created → share created)
    let avgResponseHours = 0;
    if (broadcasts.length > 0 && shares.length > 0) {
      const broadcastDates = broadcasts.reduce((acc, b) => {
        acc[b.disease_category] = new Date(b.created_at).getTime();
        return acc;
      }, {} as Record<string, number>);

      const responseTimes: number[] = [];
      for (const s of shares) {
        const bc = broadcastDates[s.disease_category || ""];
        if (bc) {
          const diff = new Date(s.shared_at).getTime() - bc;
          if (diff > 0) responseTimes.push(diff);
        }
      }
      if (responseTimes.length > 0) {
        avgResponseHours = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / (1000 * 60 * 60));
      }
    }

    // Data freshness
    const now = Date.now();
    const recentShares = shares.filter((s) => now - new Date(s.shared_at).getTime() < 7 * 24 * 60 * 60 * 1000).length;

    return { diseaseData, anonymized, identified, avgResponseHours, recentShares };
  }, [shares, broadcasts]);

  if (shares.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Disease Distribution Mini Chart */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Disease Categories</p>
          <div className="flex items-center gap-2">
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={insights.diseaseData} dataKey="value" cx="50%" cy="50%" innerRadius={12} outerRadius={28} strokeWidth={1}>
                    {insights.diseaseData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs space-y-0.5">
              {insights.diseaseData.slice(0, 3).map((d, i) => (
                <div key={d.name} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anonymized Ratio */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Privacy Split</p>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-lg font-bold">{insights.anonymized}/{insights.identified}</p>
              <p className="text-xs text-muted-foreground">Anon / Identified</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg Response Time */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Avg Response</p>
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-lg font-bold">
                {insights.avgResponseHours > 0 ? `${insights.avgResponseHours}h` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Broadcast → Share</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Freshness */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Data Freshness</p>
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary/60" />
            <div>
              <p className="text-lg font-bold">{insights.recentShares}</p>
              <p className="text-xs text-muted-foreground">New this week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareInsightsPanel;
