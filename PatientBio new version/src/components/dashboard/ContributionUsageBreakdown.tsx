import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Eye, Users, Clock, Database } from "lucide-react";
import { STALE_TIMES } from "@/lib/queryConfig";
import { format, formatDistanceToNow } from "date-fns";

interface Props {
  activeContributionIds: string[];
}

export function ContributionUsageBreakdown({ activeContributionIds }: Props) {
  const { user } = useAuth();

  const { data: accessLogs = [], isLoading } = useQuery({
    queryKey: ["contribution-usage-breakdown", user?.id, activeContributionIds],
    queryFn: async () => {
      if (activeContributionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("contribution_access_log")
        .select("id, contribution_id, researcher_id, query_context, accessed_at")
        .in("contribution_id", activeContributionIds)
        .order("accessed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && activeContributionIds.length > 0,
    staleTime: STALE_TIMES.STANDARD,
  });

  const uniqueResearchers = new Set(accessLogs.map(l => l.researcher_id)).size;
  const lastAccessed = accessLogs.length > 0 ? accessLogs[0].accessed_at : null;

  // Group by research area from query_context
  const areaMap: Record<string, number> = {};
  accessLogs.forEach(log => {
    const area = log.query_context?.split(",")[0]?.trim() || "General Research";
    areaMap[area] = (areaMap[area] || 0) + 1;
  });
  const topAreas = Object.entries(areaMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Monthly access chart data
  const monthMap: Record<string, number> = {};
  accessLogs.forEach(log => {
    const month = format(new Date(log.accessed_at), "MMM yy");
    monthMap[month] = (monthMap[month] || 0) + 1;
  });
  const chartData = Object.entries(monthMap)
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          How Your Data Is Used
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Transparency into researcher access to your contributions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading usage data…</p>
        ) : accessLogs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Your data hasn't been accessed yet.</p>
            <p className="text-xs mt-1">Researchers are notified when new data becomes available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">{uniqueResearchers} researcher{uniqueResearchers !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">{accessLogs.length} total access{accessLogs.length !== 1 ? "es" : ""}</span>
              </div>
              {lastAccessed && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Last {formatDistanceToNow(new Date(lastAccessed), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>

            {/* Top research areas */}
            {topAreas.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5">Top Research Areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {topAreas.map(([area, count]) => (
                    <Badge key={area} variant="outline" className="text-[10px] sm:text-xs">
                      {area} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Mini chart */}
            {chartData.length > 1 && (
              <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value: number) => [`${value} accesses`, "Research Queries"]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
