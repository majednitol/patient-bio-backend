import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Globe2, Link2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ConsentComplianceCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-consent-compliance"],
    queryFn: async () => {
      const [consentRes, transferRes, blockchainRes] = await Promise.all([
        supabase.from("consent_records").select("id, is_active, revoked_at"),
        supabase.from("data_transfer_agreements").select("id, revoked_at"),
        supabase.rpc("verify_blockchain_integrity"),
      ]);

      const consents = consentRes.data || [];
      const transfers = transferRes.data || [];
      const blockchain = blockchainRes.data?.[0];

      return {
        activeConsents: consents.filter((c) => c.is_active).length,
        revokedConsents: consents.filter((c) => c.revoked_at).length,
        totalConsents: consents.length,
        crossBorderTransfers: transfers.length,
        activeTransfers: transfers.filter((t) => !t.revoked_at).length,
        blockchainIntegrity: blockchain?.integrity_percentage ?? 100,
        totalTransactions: blockchain?.total_transactions ?? 0,
        verifiedTransactions: blockchain?.verified_transactions ?? 0,
      };
    },
    refetchInterval: 300000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const integrityColor =
    (data?.blockchainIntegrity ?? 100) >= 99
      ? "text-green-600 dark:text-green-400"
      : (data?.blockchainIntegrity ?? 100) >= 90
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-destructive";

  const items = [
    {
      label: "Active Consents",
      value: data?.activeConsents ?? 0,
      icon: CheckCircle2,
      detail: `of ${data?.totalConsents ?? 0} total`,
      color: "text-green-600 dark:text-green-400",
    },
    {
      label: "Revoked",
      value: data?.revokedConsents ?? 0,
      icon: XCircle,
      detail: "consent withdrawals",
      color: "text-destructive",
    },
    {
      label: "Cross-Border",
      value: data?.crossBorderTransfers ?? 0,
      icon: Globe2,
      detail: `${data?.activeTransfers ?? 0} active`,
      color: "text-primary",
    },
    {
      label: "Blockchain",
      value: `${data?.blockchainIntegrity ?? 100}%`,
      icon: Link2,
      detail: `${data?.verifiedTransactions ?? 0}/${data?.totalTransactions ?? 0} verified`,
      color: integrityColor,
    },
  ];

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-2">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Consent & Compliance
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-sm">
          Data governance at a glance
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <div key={item.label} className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                <span className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</span>
              </div>
              <p className={`text-lg sm:text-xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
