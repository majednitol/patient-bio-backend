import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Globe,
  Shield,
  FileText,
  Webhook,
  XCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  BarChart3,
  Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  useDataTransferAgreements,
  useRevokeTransferAgreement,
  useTransferAgreementStats,
  JURISDICTION_LABELS,
  TRANSFER_BASIS_LABELS,
  type JurisdictionCode,
} from "@/hooks/useDataTransferAgreements";
import ComplianceBadges, { JURISDICTION_REGULATIONS } from "@/components/dashboard/ComplianceBadges";
import AuditTrailExport from "@/components/dashboard/AuditTrailExport";
import { format, formatDistanceToNow } from "date-fns";

import { DataExchangeLog } from "@/components/dashboard/DataExchangeLog";

const REGULATION_DETAILS: Record<string, { rights: string[]; description: string }> = {
  HIPAA: {
    description: "U.S. federal law protecting health information privacy and security.",
    rights: ["Right to access your health records", "Right to request corrections", "Right to know who accessed your data", "Right to restrict certain disclosures"],
  },
  GDPR: {
    description: "EU regulation for data protection and privacy rights.",
    rights: ["Right to erasure ('right to be forgotten')", "Right to data portability", "Right to restrict processing", "Right to object to processing"],
  },
  DISHA: {
    description: "India's framework for digital health data protection.",
    rights: ["Right to privacy of health data", "Right to refuse data sharing", "Right to data ownership", "Right to data correction"],
  },
  BDPA: {
    description: "Bangladesh's Digital Security Act and data protection framework.",
    rights: ["Right to privacy of personal data", "Right to data correction", "Right to withdraw consent", "Right to data security"],
  },
  PIPEDA: {
    description: "Canada's federal privacy law for the private sector.",
    rights: ["Right to access personal information", "Right to challenge compliance", "Right to withdraw consent", "Right to data accuracy"],
  },
  LGPD: {
    description: "Brazil's data protection regulation.",
    rights: ["Right to confirm data processing", "Right to anonymization", "Right to data portability", "Right to revoke consent"],
  },
  PDPA: {
    description: "Singapore's data protection standard.",
    rights: ["Right to access data", "Right to correction", "Right to withdraw consent", "Right to data portability"],
  },
};

const InternationalDataPage = () => {
  const { t } = useTranslation();
  const { data: agreements = [], isLoading } = useDataTransferAgreements();
  const { data: stats } = useTransferAgreementStats();
  const revokeMutation = useRevokeTransferAgreement();
  const [defaultJurisdiction, setDefaultJurisdiction] = useState<JurisdictionCode>("US");

  const activeAgreements = agreements.filter(
    (a) => !a.revoked_at && (!a.expires_at || new Date(a.expires_at) > new Date())
  );
  const revokedAgreements = agreements.filter((a) => a.revoked_at);

  // Compliance score: percentage of agreements that are active (not revoked/expired)
  const complianceScore = agreements.length > 0
    ? Math.round((activeAgreements.length / agreements.length) * 100)
    : 100;

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Compliance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">{complianceScore}%</p>
                <p className="text-xs text-muted-foreground">{t("internationalPage.complianceScore")}</p>
                <Progress value={complianceScore} className="h-1.5 mt-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.active || 0}</p>
                <p className="text-xs text-muted-foreground">{t("internationalPage.activeAgreements")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-muted">
                <Globe className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(stats?.byDestination || {}).length}</p>
                <p className="text-xs text-muted-foreground">{t("internationalPage.jurisdictions")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader className="pb-4 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Globe className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            {t("internationalPage.internationalDataSettings")}
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            {t("internationalPage.configurePreferences")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 md:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm md:text-base">{t("internationalPage.defaultJurisdiction")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("internationalPage.primaryLocation")}
              </p>
            </div>
            <div className="space-y-2">
              <Select value={defaultJurisdiction} onValueChange={(v) => setDefaultJurisdiction(v as JurisdictionCode)}>
                <SelectTrigger className="w-full sm:w-48 md:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JURISDICTION_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ComplianceBadges sourceJurisdiction={defaultJurisdiction} />
            </div>
          </div>

          <Separator />

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Link to="/dashboard/subscriptions">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Webhook className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base">{t("internationalPage.fhirSubscriptions")}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{t("internationalPage.manageWebhooks")}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
            <Link to="/dashboard/consents">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardContent className="flex items-center gap-3 md:gap-4 p-4 md:p-5">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 md:h-6 md:w-6 text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm md:text-base">{t("internationalPage.consentManagement")}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{t("internationalPage.reviewConsents")}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Regulation Quick Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-primary" />
            {t("internationalPage.regulationReference")}
          </CardTitle>
          <CardDescription>{t("internationalPage.yourRights")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(REGULATION_DETAILS).map(([code, info]) => (
            <Collapsible key={code}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={JURISDICTION_REGULATIONS[Object.keys(JURISDICTION_REGULATIONS).find(k => JURISDICTION_REGULATIONS[k].code === code) || ""]?.color || ""}>
                    {code}
                  </Badge>
                  <span className="text-sm font-medium">{info.description}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <ul className="space-y-1.5 ml-4">
                  {info.rights.map((right, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      {right}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Data Exchange Log */}
      <DataExchangeLog />

      {/* Audit Trail Export */}
      <AuditTrailExport />

      {/* Active Transfer Agreements */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-start gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
            <span>{t("internationalPage.activeTransferAgreements")}</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t("internationalPage.currentAuthorizations")}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeAgreements.length === 0 ? (
            <InlineEmptyState icon={Globe} title={t("internationalPage.noActiveAgreements")} description={t("internationalPage.noActiveAgreementsDesc")} />
          ) : (
            <div className="space-y-3">
              {activeAgreements.map((agreement) => (
                <div key={agreement.id} className="border rounded-lg p-3 sm:p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="default" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                        <Badge variant="outline" className="text-xs">
                          {TRANSFER_BASIS_LABELS[agreement.transfer_basis as keyof typeof TRANSFER_BASIS_LABELS]}
                        </Badge>
                        <ComplianceBadges
                          sourceJurisdiction={agreement.source_jurisdiction}
                          destinationJurisdiction={agreement.destination_jurisdiction}
                          compact
                          showIcon={false}
                        />
                      </div>
                      <p className="text-sm font-medium">
                        {JURISDICTION_LABELS[agreement.source_jurisdiction as JurisdictionCode]} →{" "}
                        {JURISDICTION_LABELS[agreement.destination_jurisdiction as JurisdictionCode]}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive shrink-0 w-full sm:w-auto">
                           <XCircle className="h-4 w-4 mr-1" />{t("internationalPage.revokeAgreement")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("internationalPage.revokeTransferAgreement")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("internationalPage.revokeTransferDesc")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => revokeMutation.mutate({ id: agreement.id })}
                          >{t("internationalPage.revokeAgreement")}</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("internationalPage.purpose")}</span>
                      <p className="truncate">{agreement.purpose}</p>
                    </div>
                    {agreement.recipient_name && (
                      <div>
                        <span className="text-muted-foreground">{t("internationalPage.recipient")}</span>
                        <p>{agreement.recipient_name}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Created {formatDistanceToNow(new Date(agreement.consent_timestamp), { addSuffix: true })}
                    </span>
                    {agreement.expires_at && (
                      <span>Expires {format(new Date(agreement.expires_at), "MMM d, yyyy")}</span>
                    )}
                  </div>

                  {agreement.data_categories && agreement.data_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(agreement.data_categories as string[]).map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">{cat.replace("_", " ")}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked Agreements */}
      {revokedAgreements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">{t("internationalPage.revokedAgreements")} ({revokedAgreements.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revokedAgreements.slice(0, 3).map((agreement) => (
                <div key={agreement.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {JURISDICTION_LABELS[agreement.source_jurisdiction as JurisdictionCode]} →{" "}
                      {JURISDICTION_LABELS[agreement.destination_jurisdiction as JurisdictionCode]}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Revoked {agreement.revoked_at && formatDistanceToNow(new Date(agreement.revoked_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InternationalDataPage;
