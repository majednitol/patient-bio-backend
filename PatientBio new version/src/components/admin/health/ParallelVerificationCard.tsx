import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, RefreshCw, CheckCircle, XCircle, Link2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ParallelVerificationCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("verify_audit_parallel" as any, { p_block_size: 100 });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        totalBlocks: Number(row?.total_blocks ?? 0),
        validBlocks: Number(row?.valid_blocks ?? 0),
        invalidBlocks: Number(row?.invalid_blocks ?? 0),
        interBlockValid: Boolean(row?.inter_block_valid),
        brokenRanges: (row?.broken_block_ranges ?? []) as string[],
        brokenLinks: (row?.broken_inter_links ?? []) as string[],
        overallValid: Boolean(row?.overall_valid),
      };
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: merkleBlocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["admin-merkle-blocks"],
    staleTime: STALE_TIMES.ANALYTICS,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_merkle_blocks" as any)
        .select("block_start, block_end, entry_count, computed_at")
        .order("block_start", { ascending: true })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  const result = verifyMutation.data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              {t("adminHealth.parallelVerification", "Parallel Block Verification")}
            </CardTitle>
            <CardDescription>
              {t("adminHealth.parallelVerificationDesc", "Merkle root verification per block + inter-block link checks")}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${verifyMutation.isPending ? "animate-spin" : ""}`} />
            {verifyMutation.isPending ? t("adminHealth.verifying", "Verifying…") : t("adminHealth.runVerification", "Run Verification")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Merkle block summary */}
        {blocksLoading ? (
          <Skeleton className="h-[60px] w-full" />
        ) : merkleBlocks && merkleBlocks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {merkleBlocks.map((b: any) => (
              <Badge key={b.block_start} variant="outline" className="text-xs font-mono">
                #{b.block_start}–{b.block_end} ({b.entry_count})
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("adminHealth.noMerkleBlocks", "No Merkle blocks computed yet. Run verification to generate.")}</p>
        )}

        {/* Verification results */}
        {result && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-2.5 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">{t("adminHealth.totalBlocks", "Total Blocks")}</p>
              <p className="text-lg font-bold">{result.totalBlocks}</p>
            </div>
            <div className="p-2.5 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">{t("adminHealth.validBlocks", "Valid Blocks")}</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                {result.validBlocks}
              </p>
            </div>
            <div className="p-2.5 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">{t("adminHealth.interBlockLinks", "Inter-Block Links")}</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                {result.interBlockValid ? (
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    <Link2 className="h-3 w-3 mr-1" />
                    {t("adminHealth.allValid")}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1" />
                    {t("adminHealth.broken")}
                  </Badge>
                )}
              </p>
            </div>
            {result.overallValid ? (
              <div className="col-span-3 p-2 bg-primary/10 rounded-lg text-center">
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t("adminHealth.overallIntegrityValid", "Overall Integrity: Valid")}
                </Badge>
              </div>
            ) : (
              <div className="col-span-3 p-2 bg-destructive/10 rounded-lg text-center space-y-1">
                <Badge variant="destructive" className="text-xs">
                  <XCircle className="h-3 w-3 mr-1" />
                  {t("adminHealth.overallIntegrityInvalid", "Overall Integrity: Invalid")}
                </Badge>
                {result.brokenRanges.length > 0 && (
                  <p className="text-xs text-destructive">Broken blocks: {result.brokenRanges.join(", ")}</p>
                )}
                {result.brokenLinks.length > 0 && (
                  <p className="text-xs text-destructive">Broken links: {result.brokenLinks.join(", ")}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
