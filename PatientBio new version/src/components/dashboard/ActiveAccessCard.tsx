import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAccessSummary, ActiveAccessEntry } from "@/hooks/useActiveAccessSummary";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { AccessAnomalyAlert } from "./AccessAnomalyAlert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Stethoscope,
  Link2,
  XCircle,
  Eye,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const typeIcons: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  consent: Shield,
  token: Link2,
};

function AccessEntryRow({ entry }: { entry: ActiveAccessEntry }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const revoke = useMutation({
    mutationFn: async () => {
      if (entry.type === "consent") {
        await supabase
          .from("consent_records")
          .update({ is_active: false, revoked_at: new Date().toISOString(), revocation_reason: "Revoked from dashboard" })
          .eq("id", entry.sourceId);
      } else if (entry.type === "doctor_access") {
        await supabase
          .from("doctor_patient_access")
          .update({ is_active: false })
          .eq("id", entry.sourceId);
      } else if (entry.type === "token") {
        await supabase
          .from("access_tokens")
          .update({ is_revoked: true })
          .eq("id", entry.sourceId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-access-summary"] });
      toast({ title: t("activeAccess.accessRevoked"), description: t("activeAccess.accessRevokedDesc", { name: entry.providerName }) });
    },
    onError: () => {
      toast({ title: t("activeAccess.failedToRevoke"), variant: "destructive" });
    },
  });

  const renewConsent = useMutation({
    mutationFn: async () => {
      if (entry.type !== "consent") return;
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 90);
      await supabase
        .from("consent_records")
        .update({ expires_at: newExpiry.toISOString() })
        .eq("id", entry.sourceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-access-summary"] });
      toast({ title: t("activeAccess.consentRenewed"), description: t("activeAccess.consentRenewedDesc") });
    },
  });

  const Icon = typeIcons[entry.providerType] || Shield;
  const daysToExpiry = entry.expiresAt ? differenceInDays(new Date(entry.expiresAt), new Date()) : null;
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 7 && daysToExpiry > 0;

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors dark:border-border/60">
      <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium truncate">{entry.providerName}</p>
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
          <span className="capitalize shrink-0">{t(`activeAccess.type_${entry.type}`, entry.type.replace("_", " "))}</span>
          {entry.expiresAt && (
            <>
              <span>·</span>
              <span className={`truncate ${isExpiringSoon ? "text-amber-600 font-medium" : ""}`}>
                {isExpiringSoon && <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />}
                {formatDistanceToNow(new Date(entry.expiresAt), { addSuffix: true })}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {isExpiringSoon && entry.type === "consent" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => renewConsent.mutate()}
            disabled={renewConsent.isPending}
            title={t("activeAccess.renew")}
          >
            {renewConsent.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => revoke.mutate()}
          disabled={revoke.isPending}
          title={t("activeAccess.revoke")}
        >
          {revoke.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function ActiveAccessCard() {
  const { t } = useTranslation();
  const { activeEntries, activeCount, isLoadingAccess } = useActiveAccessSummary();
  const { data: recentActivity } = useRecentActivity();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const bulkRevoke = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      await supabase
        .from("consent_records")
        .update({ is_active: false, revoked_at: new Date().toISOString(), revocation_reason: "Bulk revoke from dashboard" })
        .eq("patient_id", user.id)
        .eq("is_active", true);
      await supabase
        .from("doctor_patient_access")
        .update({ is_active: false })
        .eq("patient_id", user.id)
        .eq("is_active", true);
      await supabase
        .from("access_tokens")
        .update({ is_revoked: true })
        .eq("user_id", user.id)
        .eq("is_revoked", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-access-summary"] });
      toast({ title: t("activeAccess.allAccessRevoked"), description: t("activeAccess.allAccessRevokedDesc") });
    },
  });

  const accessEvents = (recentActivity || []).filter((a) => a.type === "access").slice(0, 3);

  if (isLoadingAccess) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 dark:border-primary/30 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
            <span className="truncate">{t("activeAccess.whoHasAccess")}</span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
              {activeCount} {t("activeAccess.active")}
            </Badge>
            {activeCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive px-1.5 sm:px-2">
                    {t("activeAccess.revokeAll")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("activeAccess.revokeAllTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("activeAccess.revokeAllDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bulkRevoke.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {bulkRevoke.isPending ? t("activeAccess.revoking") : t("activeAccess.revokeAllAccess")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 sm:space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
        <AccessAnomalyAlert />

        {activeEntries.length === 0 ? (
          <div className="text-center py-4">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t("activeAccess.noAccess")}</p>
          </div>
        ) : (
          <>
            {activeEntries.slice(0, 4).map((entry) => (
              <AccessEntryRow key={entry.id} entry={entry} />
            ))}
            {activeEntries.length > 4 && (
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-1">
                +{activeEntries.length - 4} {t("activeAccess.more")}
              </p>
            )}
          </>
        )}

        {accessEvents.length > 0 && (
          <div className="border-t pt-2 mt-2 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("activeAccess.recentActivity")}</p>
            {accessEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground py-0.5 sm:py-1">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                <span className="truncate">{event.description}</span>
              </div>
            ))}
          </div>
        )}

        <Link to="/dashboard/consents" className="block pt-1.5 sm:pt-2">
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
            {t("activeAccess.manageAllConsents")}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}