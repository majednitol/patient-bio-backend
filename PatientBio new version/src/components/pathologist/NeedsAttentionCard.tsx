import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Receipt, ArrowRight } from "lucide-react";
import { differenceInHours, differenceInDays, parseISO } from "date-fns";
import type { DoctorPathologistShare } from "@/hooks/useDoctorPathologistShares";
import type { PatientPathologistShare } from "@/hooks/usePatientPathologistShares";

interface NeedsAttentionProps {
  receivedShares: DoctorPathologistShare[];
  patientShares: PatientPathologistShare[];
}

interface AttentionItem {
  id: string;
  type: "sla" | "stale_share" | "expiring";
  title: string;
  description: string;
  severity: "warning" | "critical";
  link: string;
}

export function NeedsAttentionCard({ receivedShares, patientShares }: NeedsAttentionProps) {
  const items = useMemo(() => {
    const result: AttentionItem[] = [];
    const now = new Date();

    // SLA-breaching pending doctor shares (pending > 48h)
    receivedShares
      .filter((s) => s.status === "pending" && s.shared_at)
      .forEach((s) => {
        const hours = differenceInHours(now, parseISO(s.shared_at));
        if (hours >= 48) {
          result.push({
            id: `sla-${s.id}`,
            type: "sla",
            title: `Doctor referral pending ${Math.floor(hours / 24)}d`,
            description: s.patient_name || "Patient data",
            severity: hours >= 72 ? "critical" : "warning",
            link: "/pathologist/from-doctors",
          });
        }
      });

    // Stale patient shares (pending > 3 days)
    patientShares
      .filter((s) => s.status === "pending" && s.shared_at)
      .forEach((s) => {
        const days = differenceInDays(now, parseISO(s.shared_at));
        if (days >= 3) {
          result.push({
            id: `stale-${s.id}`,
            type: "stale_share",
            title: `Patient share unreviewed ${days}d`,
            description: s.disease_category || "General",
            severity: days >= 5 ? "critical" : "warning",
            link: "/pathologist/patient-shares",
          });
        }
      });

    // Expiring patient shares (within 24h)
    patientShares
      .filter((s) => s.status !== "revoked" && s.expires_at)
      .forEach((s) => {
        const hoursLeft = differenceInHours(parseISO(s.expires_at!), now);
        if (hoursLeft > 0 && hoursLeft <= 24) {
          result.push({
            id: `exp-${s.id}`,
            type: "expiring",
            title: `Share expires in ${hoursLeft}h`,
            description: s.disease_category || "Patient data",
            severity: "critical",
            link: "/pathologist/patient-shares",
          });
        }
      });

    // Sort by severity then type
    return result.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
      return 0;
    });
  }, [receivedShares, patientShares]);

  if (items.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Needs Attention
          <Badge className="bg-amber-200 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200 text-xs">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <Link key={item.id} to={item.link}>
            <div
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-background ${
                item.severity === "critical"
                  ? "border-red-200 dark:border-red-800/50"
                  : "border-amber-200 dark:border-amber-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock
                  className={`h-4 w-4 ${
                    item.severity === "critical"
                      ? "text-red-500 dark:text-red-400"
                      : "text-amber-500 dark:text-amber-400"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
