import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Briefcase, Copy, Check, Loader2, MessageCircle, Smartphone, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { SharedScopes } from "./DataScopeSelector";

const INSURANCE_SCOPES: SharedScopes = {
  all: false, profile: true, health_summary: true, allergies: false, medications: true, records: true, record_ids: [], categories: [], emergency_contact: false, clinical_records: false,
};

interface ShareWithInsuranceDialogProps {
  trigger?: React.ReactNode;
}

const ShareWithInsuranceDialog = ({ trigger }: ShareWithInsuranceDialogProps = {}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createToken, isCreating } = useAccessTokens();

  const [open, setOpen] = useState(false);
  const [insurerName, setInsurerName] = useState("");
  const [claimRef, setClaimRef] = useState("");
  const [requireVerification, setRequireVerification] = useState(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const resetDialog = () => { setInsurerName(""); setClaimRef(""); setRequireVerification(true); setGeneratedLink(null); setCopied(false); };
  const handleOpenChange = (isOpen: boolean) => { setOpen(isOpen); if (!isOpen) resetDialog(); };

  const handleCreate = () => {
    setIsGenerating(true);
    createToken({ expiresInHours: 2160, label: `Insurance: ${insurerName || "Unnamed"}${claimRef ? ` (${claimRef})` : ""}`, sharedScopes: INSURANCE_SCOPES }, {
      onSuccess: (token) => { setGeneratedLink(`${window.location.origin}/share/${token.token}`); setIsGenerating(false); },
      onError: () => setIsGenerating(false),
    });
  };

  const handleCopy = async () => { if (!generatedLink) return; await navigator.clipboard.writeText(generatedLink); setCopied(true); toast({ title: t("shareDialogs.linkCopied") }); setTimeout(() => setCopied(false), 2000); };
  const handleWhatsApp = () => { if (!generatedLink) return; window.open(`https://wa.me/?text=${encodeURIComponent(`Sharing health records for insurance claim with ${insurerName || "insurer"}:\n${generatedLink}`)}`, "_blank"); };
  const handleSMS = () => { if (!generatedLink) return; window.open(`sms:?body=${encodeURIComponent(`Health records for insurance claim: ${generatedLink}`)}`, "_blank"); };

  return (
    <>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 h-auto py-2 sm:py-3 overflow-hidden" onClick={() => handleOpenChange(true)}>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
            <Briefcase className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-secondary-foreground" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-xs sm:text-sm leading-tight"><span className="sm:hidden">Insurance</span><span className="hidden sm:inline">{t("shareDialogs.shareWithInsurance")}</span></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("shareDialogs.claimsRelevant")}</p>
          </div>
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-secondary-foreground" />{t("shareDialogs.shareWithInsurance")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("shareDialogs.shareClaimsData")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("shareDialogs.insuranceCompany")}</Label>
              <Input placeholder={t("shareDialogs.insurancePlaceholder")} value={insurerName} onChange={(e) => setInsurerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("shareDialogs.claimRefOptional")}</Label>
              <Input placeholder={t("shareDialogs.claimRefPlaceholder")} value={claimRef} onChange={(e) => setClaimRef(e.target.value)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{t("shareDialogs.requireVerification")}</p>
                <p className="text-xs text-muted-foreground">{t("shareDialogs.recipientsMustIdentify")}</p>
              </div>
              <Switch checked={requireVerification} onCheckedChange={setRequireVerification} />
            </div>
            <div className="bg-secondary/5 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">{t("shareDialogs.sharedData")}</p>
              <p>✓ {t("shareDialogs.insuranceSharedIncl")}</p>
              <p>✗ {t("shareDialogs.insuranceSharedExcl")}</p>
              <p>✓ {t("shareDialogs.accessExpires90")}</p>
            </div>
            <ResponsiveDialogFooter>
              <Button onClick={handleCreate} disabled={isCreating || isGenerating} className="w-full">
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("shareDialogs.generating")}</> : t("shareDialogs.generateInsuranceLink")}
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="h-6 w-6 text-primary" /></div>
              <h3 className="font-medium mb-1">{t("shareDialogs.insuranceLinkCreated")}</h3>
              <p className="text-sm text-muted-foreground mb-3">{insurerName || t("shareDialogs.shareWithInsurance")} • {t("shareDialogs.90days")}</p>
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

export default ShareWithInsuranceDialog;
