import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Copy, Check, Loader2, MessageCircle, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { SharedScopes } from "./DataScopeSelector";

const PHARMACY_SCOPES: SharedScopes = {
  all: false, profile: true, health_summary: false, allergies: true, medications: true, records: false, record_ids: [], categories: [], emergency_contact: false, clinical_records: false,
};

interface ShareWithPharmacyDialogProps {
  trigger?: React.ReactNode;
}

const ShareWithPharmacyDialog = ({ trigger }: ShareWithPharmacyDialogProps = {}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createToken, isCreating } = useAccessTokens();

  const [open, setOpen] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const resetDialog = () => { setPharmacyName(""); setGeneratedLink(null); setCopied(false); };
  const handleOpenChange = (isOpen: boolean) => { setOpen(isOpen); if (!isOpen) resetDialog(); };

  const handleCreate = () => {
    setIsGenerating(true);
    createToken({ expiresInHours: 48, label: `Pharmacy: ${pharmacyName || "Unnamed"}`, sharedScopes: PHARMACY_SCOPES }, {
      onSuccess: (token) => { setGeneratedLink(`${window.location.origin}/share/${token.token}`); setIsGenerating(false); },
      onError: () => setIsGenerating(false),
    });
  };

  const handleCopy = async () => { if (!generatedLink) return; await navigator.clipboard.writeText(generatedLink); setCopied(true); toast({ title: t("shareDialogs.linkCopied") }); setTimeout(() => setCopied(false), 2000); };
  const handleWhatsApp = () => { if (!generatedLink) return; window.open(`https://wa.me/?text=${encodeURIComponent(`Sharing my prescription details for pickup at ${pharmacyName || "pharmacy"}:\n${generatedLink}`)}`, "_blank"); };
  const handleSMS = () => { if (!generatedLink) return; window.open(`sms:?body=${encodeURIComponent(`Prescription details for pharmacy pickup: ${generatedLink}`)}`, "_blank"); };

  return (
    <>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 h-auto py-2 sm:py-3 overflow-hidden" onClick={() => handleOpenChange(true)}>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Pill className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-accent-foreground" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-xs sm:text-sm leading-tight"><span className="sm:hidden">Pharmacy</span><span className="hidden sm:inline">{t("shareDialogs.shareWithPharmacy")}</span></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("shareDialogs.pharmacyDesc")}</p>
          </div>
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-accent-foreground" />{t("shareDialogs.pharmacyTitle")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("shareDialogs.pharmacySubDesc")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {!generatedLink ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("shareDialogs.pharmacyName")}</Label>
                <Input placeholder={t("shareDialogs.pharmacyPlaceholder")} value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} />
              </div>
              <div className="bg-accent/5 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{t("shareDialogs.sharedData")}</p>
                <p>✓ {t("shareDialogs.pharmacySharedIncl")}</p>
                <p>✗ {t("shareDialogs.pharmacySharedExcl")}</p>
                <p>✓ {t("shareDialogs.accessExpires48")}</p>
              </div>
              <ResponsiveDialogFooter>
                <Button onClick={handleCreate} disabled={isCreating || isGenerating} className="w-full">
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("shareDialogs.generating")}</> : t("shareDialogs.generatePharmacyLink")}
                </Button>
              </ResponsiveDialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="h-6 w-6 text-primary" /></div>
                <h3 className="font-medium mb-1">{t("shareDialogs.pharmacyLinkCreated")}</h3>
                <p className="text-sm text-muted-foreground mb-3">{pharmacyName || t("shareDialogs.shareWithPharmacy")} • {t("shareDialogs.24hours").replace("24", "48")}</p>
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

export default ShareWithPharmacyDialog;
