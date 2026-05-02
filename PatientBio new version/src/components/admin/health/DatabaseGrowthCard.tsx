import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";

interface TableGrowth {
  table: string;
  current: number;
  previous: number | null;
  delta: number | null;
  deltaPercent: number | null;
}

export default function DatabaseGrowthCard() {
  const { t } = useTranslation();
  const snapshotCaptured = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-db-growth"],
    queryFn: async (): Promise<TableGrowth[]> => {
      const tables = [
        "user_profiles", "health_records", "appointments", "prescriptions",
        "access_logs", "audit_trail", "blockchain_transactions", "consent_records",
      ] as const;

      const counts = await Promise.all(
        tables.map(async (table) => {
          const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
          return { table, count: count || 0 };
        })
      );

      // Get previous snapshot from db_growth_snapshots
      const { data: snapshots } = await supabase
        .from("db_growth_snapshots")
        .select("table_name, row_count, captured_at")
        .order("captured_at", { ascending: false })
        .limit(tables.length);

      // Build map of most recent snapshot per table
      const previousCounts: Record<string, number> = {};
      if (snapshots) {
        const seen = new Set<string>();
        for (const snap of snapshots) {
          if (!seen.has(snap.table_name)) {
            previousCounts[snap.table_name] = Number(snap.row_count);
            seen.add(snap.table_name);
          }
        }
      }

      return counts.map(({ table, count }) => {
        const prev = previousCounts[table] ?? null;
        const delta = prev !== null ? count - prev : null;
        const deltaPercent = prev !== null && prev > 0 ? Math.round((delta! / prev) * 100) : null;
        return { table, current: count, previous: prev, delta, deltaPercent };
      });
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 300000,
  });

  // Capture snapshot on load, max once per hour
  useEffect(() => {
    if (snapshotCaptured.current || !data) return;
    snapshotCaptured.current = true;

    (async () => {
      // Check if a snapshot was taken in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("db_growth_snapshots")
        .select("id")
        .gte("captured_at", oneHourAgo)
        .limit(1);

      if (!recent || recent.length === 0) {
        await supabase.rpc("capture_db_growth_snapshot");
      }
    })();
  }, [data]);

  const getDeltaIcon = (delta: number | null) => {
    if (delta === null) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    if (delta > 0) return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
    if (delta < 0) return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getDeltaColor = (delta: number | null) => {
    if (delta === null) return "text-muted-foreground";
    if (delta > 0) return "text-primary";
    if (delta < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t("adminHealth.databaseGrowth")}
        </CardTitle>
        <CardDescription>{t("adminHealth.databaseGrowthDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(data || []).map((row) => (
              <div key={row.table} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0">
                <span className="font-medium">{row.table.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground tabular-nums">{row.current.toLocaleString()}</span>
                  <div className={`flex items-center gap-1 min-w-[60px] justify-end ${getDeltaColor(row.delta)}`}>
                    {getDeltaIcon(row.delta)}
                    <span className="text-xs tabular-nums">
                      {row.delta !== null
                        ? `${row.delta > 0 ? "+" : ""}${row.deltaPercent}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
