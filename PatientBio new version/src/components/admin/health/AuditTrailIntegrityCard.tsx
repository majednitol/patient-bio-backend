import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, CheckCircle, XCircle, Wrench, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { integritySeverity, severityGaugeStroke } from "@/utils/healthSeverity";

export default function AuditTrailIntegrityCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-audit-integrity"],
    queryFn: async () => {
      // Use incremental verification (only checks entries since last checkpoint)
      const { data, error } = await supabase.rpc("verify_audit_trail_incremental" as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total: Number(row?.total_new_entries ?? 0),
        verified: Number(row?.verified_entries ?? 0),
        broken: Number(row?.broken_chain_count ?? 0),
        percentage: Number(row?.integrity_percentage ?? 100),
        checkpointBlock: Number(row?.checkpoint_block ?? 0),
        isIncremental: Boolean(row?.is_incremental),
      };
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 300000,
  });

  const repairMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("repair_audit_trail_chain");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total: Number(row?.total_records ?? 0),
        repaired: Number(row?.repaired_records ?? 0),
      };
    },
    onSuccess: (result) => {
      toast({
        title: t("adminHealth.repairComplete", "Repair Complete"),
        description: t("adminHealth.repairResult", "Repaired {{repaired}} of {{total}} records.", {
          repaired: result.repaired,
          total: result.total,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-integrity"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blockchain-integrity"] });
    },
    onError: (err: Error) => {
      toast({
        title: t("adminHealth.repairFailed", "Repair Failed"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleVerifyNow = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-audit-integrity"] });
  };

  const percentage = data?.percentage ?? 100;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("adminHealth.auditTrailIntegrity", "Audit Trail Integrity")}
            </CardTitle>
            <CardDescription>{t("adminHealth.auditTrailDesc", "Hash chain verification of audit events")}</CardDescription>
          </div>
          <div className="flex gap-2">
            {(data?.broken ?? 0) > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => repairMutation.mutate()}
                disabled={repairMutation.isPending}
              >
                <Wrench className={`h-3.5 w-3.5 mr-1.5 ${repairMutation.isPending ? "animate-spin" : ""}`} />
                {repairMutation.isPending
                  ? t("adminHealth.repairing", "Repairing…")
                  : t("adminHealth.repairChain", "Repair Chain")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleVerifyNow} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              {t("adminHealth.verifyNow")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : (
          <div className="flex items-center gap-6">
            {/* Circular gauge */}
            <div className="relative flex-shrink-0">
              <svg width="100" height="100" className="-rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={severityGaugeStroke(integritySeverity(percentage))}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{percentage}%</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="p-2.5 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t("adminHealth.entriesChecked", "Entries Checked")}</p>
                <p className="text-lg font-bold">{data?.total?.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t("adminHealth.verifiedEntries", "Verified")}</p>
                <p className="text-lg font-bold flex items-center justify-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  {data?.verified?.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t("adminHealth.brokenLinks")}</p>
                <p className="text-lg font-bold flex items-center justify-center gap-1">
                  {(data?.broken ?? 0) > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      <XCircle className="h-3 w-3 mr-1" />
                      {data?.broken} {t("adminHealth.broken")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t("adminHealth.allValid")}
                    </Badge>
                  )}
                </p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t("adminHealth.checkpoint", "Checkpoint")}</p>
                <p className="text-lg font-bold flex items-center justify-center gap-1">
                  {data?.isIncremental ? (
                    <Badge variant="outline" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Block #{data?.checkpointBlock}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("adminHealth.fullScan", "Full scan")}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
