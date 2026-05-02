import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Copy, Check, Loader2, MessageCircle, Smartphone, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { SharedScopes } from "./DataScopeSelector";

const ADMIN_SCOPES: SharedScopes = {
  all: false, profile: true, health_summary: true, allergies: false, medications: false, records: true, record_ids: [], categories: [], emergency_contact: false, clinical_records: false,
};

interface ShareWithAdminDialogProps {
  trigger?: React.ReactNode;
}

const ShareWithAdminDialog = ({ trigger }: ShareWithAdminDialogProps = {}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { createToken, isCreating } = useAccessTokens();

  const PURPOSE_OPTIONS = [
    { value: "account_support", label: t("shareDialogs.accountSupport") },
    { value: "data_review", label: t("shareDialogs.dataReview") },
    { value: "compliance_audit", label: t("shareDialogs.complianceAudit") },
    { value: "bug_report", label: t("shareDialogs.bugReport") },
    { value: "other", label: t("shareDialogs.other") },
  ];

  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("account_support");
  const [notes, setNotes] = useState("");
  const [anonymize, setAnonymize] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const resetDialog = () => { setPurpose("account_support"); setNotes(""); setAnonymize(false); setGeneratedLink(null); setCopied(false); };
  const handleOpenChange = (isOpen: boolean) => { setOpen(isOpen); if (!isOpen) resetDialog(); };

  const handleCreate = () => {
    setIsGenerating(true);
    const purposeLabel = PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label || purpose;
    createToken({ expiresInHours: 720, label: `Admin: ${purposeLabel}${notes ? ` — ${notes.slice(0, 40)}` : ""}`, sharedScopes: ADMIN_SCOPES }, {
      onSuccess: (token) => { setGeneratedLink(`${window.location.origin}/share/${token.token}`); setIsGenerating(false); },
      onError: () => setIsGenerating(false),
    });
  };

  const handleCopy = async () => { if (!generatedLink) return; await navigator.clipboard.writeText(generatedLink); setCopied(true); toast({ title: t("shareDialogs.linkCopied") }); setTimeout(() => setCopied(false), 2000); };
  const handleWhatsApp = () => { if (!generatedLink) return; window.open(`https://wa.me/?text=${encodeURIComponent(`Sharing health records with platform admin for ${PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label || "support"}:\n${generatedLink}`)}`, "_blank"); };
  const handleSMS = () => { if (!generatedLink) return; window.open(`sms:?body=${encodeURIComponent(`Health records shared with admin: ${generatedLink}`)}`, "_blank"); };

  return (
    <>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 h-auto py-2 sm:py-3 overflow-hidden" onClick={() => handleOpenChange(true)}>
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-foreground" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-xs sm:text-sm leading-tight"><span className="sm:hidden">Admin</span><span className="hidden sm:inline">{t("shareDialogs.shareWithAdmin")}</span></p>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{t("shareDialogs.adminDesc")}</p>
          </div>
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />{t("shareDialogs.adminTitle")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("shareDialogs.adminSubDesc")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {!generatedLink ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("shareDialogs.purpose")}</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PURPOSE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("shareDialogs.notesOptional")}</Label>
                <Textarea placeholder={t("shareDialogs.notesDescContext")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5" />{t("shareDialogs.anonymizeData")}</p>
                  <p className="text-xs text-muted-foreground">{t("shareDialogs.anonymizeRemoveId")}</p>
                </div>
                <Switch checked={anonymize} onCheckedChange={setAnonymize} />
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">{t("shareDialogs.sharedData")}</p>
                <p>✓ {t("shareDialogs.adminSharedIncl")}</p>
                <p>✗ {t("shareDialogs.adminSharedExcl")}</p>
                <p>✓ {t("shareDialogs.accessExpires30")}</p>
              </div>
              <ResponsiveDialogFooter>
                <Button onClick={handleCreate} disabled={isCreating || isGenerating} className="w-full">
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("shareDialogs.generating")}</> : t("shareDialogs.generateAdminLink")}
                </Button>
              </ResponsiveDialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="h-6 w-6 text-primary" /></div>
                <h3 className="font-medium mb-1">{t("shareDialogs.adminLinkCreated")}</h3>
                <p className="text-sm text-muted-foreground mb-3">{PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label} • {t("shareDialogs.30days")}</p>
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

export default ShareWithAdminDialog;
