import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STALE_TIMES } from "@/lib/queryConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { integritySeverity, severityGaugeStroke } from "@/utils/healthSeverity";

export default function BlockchainIntegrityCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-blockchain-integrity"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_blockchain_integrity");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total: Number(row?.total_transactions ?? 0),
        verified: Number(row?.verified_transactions ?? 0),
        broken: Number(row?.broken_links ?? 0),
        percentage: Number(row?.integrity_percentage ?? 100),
      };
    },
    staleTime: STALE_TIMES.ANALYTICS,
    refetchInterval: 300000,
  });

  const handleVerifyNow = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-blockchain-integrity"] });
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
              <Shield className="h-5 w-5 text-primary" />
              {t("adminHealth.blockchainIntegrity")}
            </CardTitle>
            <CardDescription>{t("adminHealth.blockchainDesc")}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleVerifyNow} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
            {t("adminHealth.verifyNow")}
          </Button>
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
                <p className="text-xs text-muted-foreground">{t("adminHealth.totalTx")}</p>
                <p className="text-lg font-bold">{data?.total?.toLocaleString()}</p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">{t("adminHealth.verifiedTx")}</p>
                <p className="text-lg font-bold flex items-center justify-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  {data?.verified?.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 bg-muted/50 rounded-lg text-center col-span-2">
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
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
