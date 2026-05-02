import { ProviderVerification } from "@/hooks/useProviderVerification";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface VerificationHistoryTimelineProps {
  history: ProviderVerification[];
  currentId: string;
}

export function VerificationHistoryTimeline({ history, currentId }: VerificationHistoryTimelineProps) {
  const { t } = useTranslation();

  if (history.length <= 1) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-secondary" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-secondary text-secondary-foreground text-[10px]">{t("common.approved")}</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="text-[10px]">{t("common.rejected")}</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-warning/10 text-warning text-[10px]">{t("common.pending")}</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{t("providerVerifications.submissionHistory")}</span>
      <div className="relative pl-5 space-y-3">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        {history.map((entry) => (
          <div key={entry.id} className={`relative flex gap-3 ${entry.id === currentId ? 'opacity-100' : 'opacity-60'}`}>
            <div className="absolute -left-5 mt-1 bg-background p-0.5 rounded-full">
              {getStatusIcon(entry.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(entry.status)}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.submitted_at), "PP")}
                </span>
                {entry.id === currentId && (
                  <Badge variant="outline" className="text-[10px]">{t("providerVerifications.current")}</Badge>
                )}
              </div>
              {entry.status === "rejected" && entry.rejection_reason && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {entry.rejection_reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
