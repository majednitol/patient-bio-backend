/**
 * CrossChainConsistencyCard - Cross-chain consistency verification
 * Improvement #3: Cross-Chain Consistency Verification
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { GitCompareArrows, RefreshCw, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { crossChainSeverity } from "@/utils/healthSeverity";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const EXCLUDED_EVENT_TYPES = ["DATA_ACCESS", "FHIR_EXPORT", "SYSTEM_BACKUP", "SYSTEM_RESTORE"];

export default function CrossChainConsistencyCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["cross-chain-consistency"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_cross_chain_consistency");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        totalBlockchain: Number(row?.total_blockchain ?? 0),
        totalAudit: Number(row?.total_audit ?? 0),
        matched: Number(row?.matched ?? 0),
        blockchainOnly: Number(row?.blockchain_only ?? 0),
        auditOnly: Number(row?.audit_only ?? 0),
        percentage: Number(row?.consistency_percentage ?? 100),
      };
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 300000,
  });

  const percentage = data?.percentage ?? 100;
  const status = crossChainSeverity(percentage);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitCompareArrows className="h-5 w-5" />
            Cross-Chain Consistency
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>Verifies events appear in both blockchain and audit trail</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {status === "healthy" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Consistency</span>
                  <Badge variant={status === "healthy" ? "default" : status === "warning" ? "secondary" : "destructive"}>
                    {percentage}%
                  </Badge>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Blockchain Txns</p>
                <p className="font-semibold">{data?.totalBlockchain.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Audit Trail Entries</p>
                <p className="font-semibold">{data?.totalAudit.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Matched</p>
                <p className="font-semibold text-green-600">{data?.matched.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Orphaned</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        <p className="text-xs">
                          Excludes operational events that only appear in the audit trail: {EXCLUDED_EVENT_TYPES.join(", ")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="font-semibold text-yellow-600">
                  {((data?.blockchainOnly ?? 0) + (data?.auditOnly ?? 0)).toLocaleString()}
                </p>
              </div>
            </div>

            {((data?.blockchainOnly ?? 0) + (data?.auditOnly ?? 0)) > 0 && (
              <p className="text-xs text-muted-foreground">
                {data?.blockchainOnly} blockchain-only · {data?.auditOnly} audit-only
              </p>
            )}

            <p className="text-xs text-muted-foreground/70 italic">
              System events (access logs, exports, backups) are excluded from mismatch counts as they are audit-only by design.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
