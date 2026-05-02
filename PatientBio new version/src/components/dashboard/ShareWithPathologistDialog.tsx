import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Microscope, Loader2, Check } from "lucide-react";
import { usePatientPathologistShares } from "@/hooks/usePatientPathologistShares";
import { PathologistDirectoryPicker } from "@/components/doctor/PathologistDirectoryPicker";
import { type PathologistSearchResult } from "@/hooks/useSearchPathologists";
import { addHours } from "date-fns";

interface ShareWithPathologistDialogProps {
  trigger?: React.ReactNode;
}

const ShareWithPathologistDialog = ({ trigger }: ShareWithPathologistDialogProps) => {
  const { t } = useTranslation();
  const { createShare, isCreating } = usePatientPathologistShares();

  const DISEASE_CATEGORIES = [
    { value: "cancer", label: t("shareDialogs.cancer") },
    { value: "covid19", label: t("shareDialogs.covid19") },
    { value: "diabetes", label: t("shareDialogs.diabetes") },
    { value: "heart_disease", label: t("shareDialogs.heartDisease") },
    { value: "general", label: t("shareDialogs.general") },
  ];

  const EXPIRY_OPTIONS = [
    { value: "168", label: t("shareDialogs.7days") },
    { value: "720", label: t("shareDialogs.30days") },
    { value: "2160", label: t("shareDialogs.90days") },
    { value: "8760", label: t("shareDialogs.1year") },
  ];

  const [open, setOpen] = useState(false);
  const [selectedPathologist, setSelectedPathologist] = useState<PathologistSearchResult | null>(null);
  const [diseaseCategory, setDiseaseCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [isAnonymized, setIsAnonymized] = useState(true);
  const [expiryHours, setExpiryHours] = useState("720");
  const [success, setSuccess] = useState(false);

  const resetDialog = () => { setSelectedPathologist(null); setDiseaseCategory(""); setNotes(""); setIsAnonymized(true); setExpiryHours("720"); setSuccess(false); };
  const handleOpenChange = (isOpen: boolean) => { setOpen(isOpen); if (!isOpen) resetDialog(); };

  const handleShare = () => {
    if (!selectedPathologist) return;
    const expiresAt = addHours(new Date(), parseInt(expiryHours)).toISOString();
    createShare(
      { pathologist_id: selectedPathologist.user_id, disease_category: diseaseCategory || undefined, notes: notes || undefined, is_anonymized: isAnonymized, expires_at: expiresAt },
      { onSuccess: () => setSuccess(true) }
    );
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => handleOpenChange(true)}>{trigger}</div>
      ) : (
        <Button variant="outline" className="w-full h-auto py-3 justify-start gap-3" onClick={() => handleOpenChange(true)}>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Microscope className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-medium">{t("shareDialogs.shareWithPathologist")}</span>
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2 text-foreground">
              <Microscope className="h-5 w-5 text-primary" />
              {t("shareDialogs.shareDataWithPathologist")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("shareDialogs.pathologistDesc")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {success ? (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="h-6 w-6 text-primary" /></div>
                <h3 className="font-medium mb-1">{t("shareDialogs.dataSharedSuccess")}</h3>
                <p className="text-sm text-muted-foreground">{t("shareDialogs.pathologistNotified", { anon: isAnonymized ? t("shareDialogs.anonymized") : "" })}</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => handleOpenChange(false)}>{t("common.close")}</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("shareDialogs.selectPathologist")}</Label>
                <PathologistDirectoryPicker selectedId={selectedPathologist?.user_id || ""} onSelect={setSelectedPathologist} />
              </div>
              <div className="space-y-2">
                <Label>{t("shareDialogs.diseaseCategoryOptional")}</Label>
                <Select value={diseaseCategory} onValueChange={setDiseaseCategory}>
                  <SelectTrigger><SelectValue placeholder={t("shareDialogs.selectCategory")} /></SelectTrigger>
                  <SelectContent>{DISEASE_CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pathologist-notes">{t("shareDialogs.notesOptional")}</Label>
                <Textarea id="pathologist-notes" placeholder={t("shareDialogs.notesPathologistPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t("shareDialogs.accessExpiresIn")}</Label>
                <Select value={expiryHours} onValueChange={setExpiryHours}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPIRY_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="pathologist-anonymized" className="cursor-pointer">{t("shareDialogs.anonymizeData")}</Label>
                  <p className="text-xs text-muted-foreground">{t("shareDialogs.hidePersonalFromPathologist")}</p>
                </div>
                <Switch id="pathologist-anonymized" checked={isAnonymized} onCheckedChange={setIsAnonymized} />
              </div>
              <ResponsiveDialogFooter className="pt-2">
                <Button onClick={handleShare} disabled={!selectedPathologist || isCreating} className="w-full bg-primary hover:bg-primary/90">
                  {isCreating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("shareDialogs.sharing")}</>) : (<><Microscope className="mr-2 h-4 w-4" />{t("shareDialogs.shareWithPathologist")}</>)}
                </Button>
              </ResponsiveDialogFooter>
            </div>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
};

export default ShareWithPathologistDialog;
