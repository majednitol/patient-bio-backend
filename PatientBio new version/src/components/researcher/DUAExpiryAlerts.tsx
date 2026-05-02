import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDataUseAgreements, DataUseAgreement } from "@/hooks/useDataUseAgreements";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";

interface DUAExpiryAlertsProps {
  onRenew?: (dua: DataUseAgreement) => void;
}

export function DUAExpiryAlerts({ onRenew }: DUAExpiryAlertsProps) {
  const { expiringWithin, renewAgreement, isRenewing } = useDataUseAgreements();

  const expiring30 = expiringWithin(30);
  const expiring60 = expiringWithin(60);
  const expiring90 = expiringWithin(90);

  if (expiring90.length === 0) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-500/5">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-medium text-sm">Expiring Agreements</p>
              <div className="flex gap-3 mt-1.5">
                {expiring30.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{expiring30.length} within 30 days</Badge>
                )}
                {expiring60.length > expiring30.length && (
                  <Badge variant="secondary" className="text-xs">{expiring60.length} within 60 days</Badge>
                )}
                {expiring90.length > expiring60.length && (
                  <Badge variant="outline" className="text-xs">{expiring90.length} within 90 days</Badge>
                )}
              </div>
            </div>
            {expiring30.length > 0 && (
              <div className="space-y-2">
                {expiring30.slice(0, 3).map((dua) => (
                  <div key={dua.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {dua.study_title} — {dua.institution_name}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-7 text-xs shrink-0"
                      disabled={isRenewing}
                      onClick={async () => {
                        await renewAgreement(dua);
                        onRenew?.(dua);
                      }}
                    >
                      {isRenewing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Renew
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
