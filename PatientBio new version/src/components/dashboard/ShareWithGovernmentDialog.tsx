import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Landmark, Copy, Check, Loader2, MessageCircle, Smartphone, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { SharedScopes } from "./DataScopeSelector";
import ComplianceBadges from "./ComplianceBadges";
import { JURISDICTION_LABELS, type JurisdictionCode } from "@/hooks/useDataTransferAgreements";

const GOVERNMENT_SCOPES: SharedScopes = {
  all: false, profile: true, health_summary: true, allergies: false, medications: false, records: true, record_ids: [], categories: [], emergency_contact: false, clinical_records: false,
};

interface ShareWithGovernmentDialogProps {
  trigger?: React.ReactNode;
}

const ShareWithGovernmentDialog = ({ trigger }: ShareWithGovernmentDialogProps = {}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createToken, isCreating } = useAccessTokens();

  const REPORT_TYPES = [
    { value: "vaccination", label: t("shareDialogs.vaccinationRegistry") },
    { value: "disease_surveillance", label: t("shareDialogs.diseaseSurveillance") },
    { value: "public_health", label: t("shareDialogs.publicHealthReport") },
    { value: "census", label: t("shareDialogs.healthCensus") },
    { value: "other", label: t("shareDialogs.other") },
  ];

  const [open, setOpen] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [reportType, setReportType] = useState("public_health");
  const [jurisdiction, setJurisdiction] = useState<JurisdictionCode>("US");
  const [requireVerification, setRequireVerification] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const resetDialog = () => { setAgencyName(""); setReportType("public_health"); setJurisdiction("US"); setRequireVerification(true); setGeneratedLink(null); setCopied(false); };
  const handleOpenChange = (isOpen: boolean) => { setOpen(isOpen); if (!isOpen) resetDialog(); };

  const handleCreate = () => {
    setIsGenerating(true);
    const reportLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label || reportType;
    createToken({ expiresInHours: 720, label: `Gov: ${agencyName || "Agency"} (${reportLabel})`, sharedScopes: GOVERNMENT_SCOPES }, {
      onSuccess: (token) => { setGeneratedLink(`${window.location.origin}/share/${token.token}`); setIsGenerating(false); },
      onError: () => setIsGenerating(false),
    });
  };

  const handleCopy = async () => { if (!generatedLink) return; await navigator.clipboard.writeText(generatedLink); setCopied(true); toast({ title: t("shareDialogs.linkCopied") }); setTimeout(() => setCopied(false), 2000); };
  const handleWhatsApp = () => { if (!generatedLink) return; window.open(`https://wa.me/?text=${encodeURIComponent(`Sharing health records for public health reporting with ${agencyName || "agency"}:\n${generatedLink}`)}`, "_blank"); };
  const handleSMS = () => { if (!generatedLink) return; window.open(`sms:?body=${encodeURIComponent(`Health records for public health reporting: ${generatedLink}`)}`, "_blank"); };

  return (
    <>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 h-auto py-2 sm:py-3 overflow-hidden" onClick={() => handleOpenChange(true)}>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Landmark className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-foreground" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-xs sm:text-sm leading-tight"><span className="sm:hidden">Government</span><span className="hidden sm:inline">{t("shareDialogs.shareWithGovernment")}</span></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("shareDialogs.publicHealthReporting")}</p>
          </div>
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" />{t("shareDialogs.govTitle")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("shareDialogs.govDesc")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("shareDialogs.agencyName")}</Label>
              <Input placeholder={t("shareDialogs.agencyPlaceholder")} value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("shareDialogs.reportType")}</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REPORT_TYPES.map((rt) => (<SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("shareDialogs.jurisdiction")}</Label>
              <Select value={jurisdiction} onValueChange={(v) => setJurisdiction(v as JurisdictionCode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(JURISDICTION_LABELS).map(([code, label]) => (<SelectItem key={code} value={code}>{label}</SelectItem>))}</SelectContent>
              </Select>
              <ComplianceBadges destinationJurisdiction={jurisdiction} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{t("shareDialogs.requireVerification")}</p>
                <p className="text-xs text-muted-foreground">{t("shareDialogs.officialsMustIdentify")}</p>
              </div>
              <Switch checked={requireVerification} onCheckedChange={setRequireVerification} />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">{t("shareDialogs.sharedData")}</p>
              <p>✓ {t("shareDialogs.govSharedIncl")}</p>
              <p>✗ {t("shareDialogs.govSharedExcl")}</p>
              <p>✓ {t("shareDialogs.accessExpires30")}</p>
            </div>
            <ResponsiveDialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || isGenerating} className="w-full">
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("shareDialogs.generating")}</> : t("shareDialogs.generateGovLink")}
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="h-6 w-6 text-primary" /></div>
              <h3 className="font-medium mb-1">{t("shareDialogs.govLinkCreated")}</h3>
              <p className="text-sm text-muted-foreground mb-3">{agencyName || t("shareDialogs.shareWithGovernment")} • {t("shareDialogs.30days")}</p>
              <div className="bg-background border rounded-md p-2 text-xs font-mono break-all">{generatedLink}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}<span className="ml-1">{copied ? t("common.copied") : t("common.copy")}</span></Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-green-600"><MessageCircle className="h-3 w-3 mr-1" />{t("shareDialogs.whatsApp")}</Button>
              <Button variant="outline" size="sm" onClick={handleSMS}><Smartphone className="h-3 w-3 mr-1" />{t("shareDialogs.sms")}</Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={resetDialog}>{t("shareDialogs.createAnotherLink")}</Button>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
    </>
  );
};

export default ShareWithGovernmentDialog;
