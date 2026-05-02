import { useProviderVerification, ProviderType } from "@/hooks/useProviderVerification";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  XCircle, 
  CheckCircle2,
  FileText,
  AlertTriangle 
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { VerificationSubmitDialog } from "./VerificationSubmitDialog";
import { useTranslation } from "react-i18next";

interface VerificationStatusCardProps {
  providerType: ProviderType;
}

export const VerificationStatusCard = ({ providerType }: VerificationStatusCardProps) => {
  const { verification, isLoading } = useProviderVerification();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getStatusConfig = () => {
    if (!verification) {
      return {
        icon: ShieldAlert,
        iconColor: "text-muted-foreground",
        badge: <Badge variant="outline">{t("providerVerifications.notSubmitted")}</Badge>,
        title: t("providerVerifications.verificationRequired"),
        description: t("providerVerifications.verificationRequiredDesc"),
        showAction: true,
        actionLabel: t("providerVerifications.submitVerification"),
      };
    }

    switch (verification.status) {
      case "pending":
        return {
          icon: Clock,
          iconColor: "text-warning",
          badge: <Badge variant="secondary" className="bg-warning/10 text-warning">{t("providerVerifications.pendingReview")}</Badge>,
          title: t("providerVerifications.underReview"),
          description: t("providerVerifications.underReviewDesc", { date: format(new Date(verification.submitted_at), "PPP") }),
          showAction: false,
        };
      case "approved":
        return {
          icon: CheckCircle2,
          iconColor: "text-secondary",
          badge: <Badge className="bg-secondary text-secondary-foreground">{t("providerVerifications.verified")}</Badge>,
          title: t("providerVerifications.verifiedProvider"),
          description: t("providerVerifications.verifiedDesc", { date: format(new Date(verification.reviewed_at!), "PPP") }),
          showAction: false,
        };
      case "rejected":
        return {
          icon: XCircle,
          iconColor: "text-destructive",
          badge: <Badge variant="destructive">{t("common.rejected")}</Badge>,
          title: t("providerVerifications.rejectedTitle"),
          description: verification.rejection_reason || t("providerVerifications.rejectedDesc"),
          showAction: true,
          actionLabel: t("providerVerifications.resubmitVerification"),
        };
      case "expired":
        return {
          icon: AlertTriangle,
          iconColor: "text-warning",
          badge: <Badge variant="outline" className="border-warning text-warning">{t("providerVerifications.expired")}</Badge>,
          title: t("providerVerifications.expiredTitle"),
          description: t("providerVerifications.expiredDesc"),
          showAction: true,
          actionLabel: t("providerVerifications.renewVerification"),
        };
      default:
        return {
          icon: ShieldAlert,
          iconColor: "text-muted-foreground",
          badge: <Badge variant="outline">{t("providerVerifications.unknown")}</Badge>,
          title: t("providerVerifications.unknownStatus"),
          description: t("providerVerifications.unknownStatusDesc"),
          showAction: false,
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-full bg-muted shrink-0 ${config.iconColor}`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg truncate">{config.title}</CardTitle>
                <div className="mt-1">{config.badge}</div>
              </div>
            </div>
            {verification?.status === "approved" && (
              <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-secondary shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-sm">
            {config.description}
          </CardDescription>

          {verification && verification.status !== "approved" && (
            <div className="space-y-2 text-sm">
              {verification.license_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{t("providerVerifications.license")}: {verification.license_number}</span>
                </div>
              )}
              {verification.issuing_authority && (
                <div className="text-muted-foreground">
                  {t("providerVerifications.issuer")}: {verification.issuing_authority}
                </div>
              )}
            </div>
          )}

          {config.showAction && (
            <Button 
              onClick={() => setShowSubmitDialog(true)}
              className="w-full"
            >
              {config.actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>

      <VerificationSubmitDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        providerType={providerType}
        isResubmit={verification?.status === "rejected" || verification?.status === "expired"}
      />
    </>
  );
};
