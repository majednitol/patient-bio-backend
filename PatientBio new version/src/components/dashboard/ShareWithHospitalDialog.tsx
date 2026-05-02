import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Building2, Copy, Check, Loader2, MessageCircle, Smartphone, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { SharedScopes } from "./DataScopeSelector";
import ComplianceBadges from "./ComplianceBadges";
import { JURISDICTION_LABELS, type JurisdictionCode } from "@/hooks/useDataTransferAgreements";

const HOSPITAL_SCOPES: SharedScopes = {
  all: false,
  profile: true,
  health_summary: true,
  allergies: true,
  medications: true,
  records: true,
  record_ids: [],
  categories: [],
  emergency_contact: true,
  clinical_records: true,
};

interface ShareWithHospitalDialogProps {
  trigger?: React.ReactNode;
}

const ShareWithHospitalDialog = ({ trigger }: ShareWithHospitalDialogProps = {}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createToken, isCreating } = useAccessTokens();

  const [open, setOpen] = useState(false);
  const [hospitalName, setHospitalName] = useState("");
  const [jurisdiction, setJurisdiction] = useState<JurisdictionCode>("US");
  const [requireVerification, setRequireVerification] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const resetDialog = () => {
    setHospitalName("");
    setJurisdiction("US");
    setRequireVerification(true);
    setGeneratedLink(null);
    setCopied(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetDialog();
  };

  const handleCreate = () => {
    setIsGenerating(true);
    createToken(
      {
        expiresInHours: 720,
        label: `Hospital: ${hospitalName || "Unnamed"}`,
        sharedScopes: HOSPITAL_SCOPES,
      },
      {
        onSuccess: (token) => {
          setGeneratedLink(`${window.location.origin}/share/${token.token}`);
          setIsGenerating(false);
        },
        onError: () => setIsGenerating(false),
      }
    );
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({ title: t("shareDialogs.linkCopied") });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!generatedLink) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Sharing my health records with ${hospitalName || "your hospital"} via Patient Bio:\n${generatedLink}`)}`, "_blank");
  };

  const handleSMS = () => {
    if (!generatedLink) return;
    window.open(`sms:?body=${encodeURIComponent(`Sharing my health records with ${hospitalName || "your hospital"} via Patient Bio: ${generatedLink}`)}`, "_blank");
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 h-auto py-2 sm:py-3 overflow-hidden" onClick={() => handleOpenChange(true)}>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-xs sm:text-sm leading-tight"><span className="sm:hidden">Hospital</span><span className="hidden sm:inline">{t("shareDialogs.shareWithHospital")}</span></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("shareDialogs.fullClinicalRecords")}</p>
          </div>
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {t("shareDialogs.shareWithHospital")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("shareDialogs.fullClinicalSharing")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {!generatedLink ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("shareDialogs.hospitalName")}</Label>
                <Input placeholder={t("shareDialogs.hospitalNamePlaceholder")} value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>{t("shareDialogs.hospitalJurisdiction")}</Label>
                <Select value={jurisdiction} onValueChange={(v) => setJurisdiction(v as JurisdictionCode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(JURISDICTION_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ComplianceBadges destinationJurisdiction={jurisdiction} />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{t("shareDialogs.requireVerification")}</p>
                  <p className="text-xs text-muted-foreground">{t("shareDialogs.recipientsMustIdentify")}</p>
                </div>
                <Switch checked={requireVerification} onCheckedChange={setRequireVerification} />
              </div>

              <div className="bg-primary/5 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{t("shareDialogs.sharedData")}</p>
                <p>✓ {t("shareDialogs.scopeProfile", "Profile & Overview")}</p>
                <p>✓ {t("shareDialogs.scopeHealthSummary", "Health Summary")}</p>
                <p>✓ {t("shareDialogs.scopeClinicalRecords", "Clinical Records")}</p>
                <p>✓ {t("shareDialogs.scopeMedications", "Medications")}</p>
                <p>✓ {t("shareDialogs.scopeAllergies", "Allergies")}</p>
                <p>✓ {t("shareDialogs.scopeEmergencyContact", "Emergency Contact")}</p>
                <p>✓ {t("shareDialogs.scopeRecords", "Health Records")}</p>
                <p>✓ {t("shareDialogs.accessExpires30")}</p>
              </div>

              <ResponsiveDialogFooter>
                <Button onClick={handleCreate} disabled={isCreating || isGenerating} className="w-full">
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("shareDialogs.generating")}</> : t("shareDialogs.generateHospitalLink")}
                </Button>
              </ResponsiveDialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium mb-1">{t("shareDialogs.hospitalLinkCreated")}</h3>
                <p className="text-sm text-muted-foreground mb-3">{hospitalName || t("shareDialogs.hospital")} • {t("shareDialogs.30days")}</p>
                <div className="bg-background border rounded-md p-2 text-xs font-mono break-all">{generatedLink}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span className="ml-1">{copied ? t("common.copied") : t("common.copy")}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleWhatsApp} className="text-green-600">
                  <MessageCircle className="h-3 w-3 mr-1" />{t("shareDialogs.whatsApp")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSMS}>
                  <Smartphone className="h-3 w-3 mr-1" />{t("shareDialogs.sms")}
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={resetDialog}>{t("shareDialogs.createAnotherLink")}</Button>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};

export default ShareWithHospitalDialog;
