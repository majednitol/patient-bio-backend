import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FlaskConical, Building2, ArrowLeft, ArrowRight, ShieldCheck, Send } from "lucide-react";
import { Constants } from "@/integrations/supabase/types";
import { useTranslation } from "react-i18next";

const DISEASE_CATEGORIES = Constants.public.Enums.disease_category;

interface Researcher {
  user_id: string;
  full_name: string;
  institution_name: string | null;
  research_focus: string | null;
  is_verified: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  researchers: Researcher[];
  onSubmit: (data: {
    recipient_type: "researcher" | "pharmacy";
    recipient_id: string;
    disease_categories: string[];
    date_range_start?: string;
    date_range_end?: string;
    purpose: string;
  }) => void;
  isSubmitting: boolean;
}

export default function AdminDistributeDataDialog({ open, onOpenChange, researchers, onSubmit, isSubmitting }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [recipientType, setRecipientType] = useState<"researcher" | "pharmacy">("researcher");
  const [recipientId, setRecipientId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [purpose, setPurpose] = useState("");

  const stepLabels = [
    t("adminDistribute.recipientType"),
    t("adminDistribute.selectRecipient"),
    t("adminDistribute.scopeData"),
    t("adminDistribute.purposeNotes"),
    t("adminDistribute.reviewSubmit"),
  ];

  const reset = () => {
    setStep(1);
    setRecipientType("researcher");
    setRecipientId("");
    setSelectedCategories([]);
    setDateStart("");
    setDateEnd("");
    setPurpose("");
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const selectedRecipient = researchers.find((r) => r.user_id === recipientId);

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return !!recipientId;
    if (step === 3) return true;
    if (step === 4) return purpose.trim().length > 0;
    return true;
  };

  const handleSubmit = () => {
    onSubmit({
      recipient_type: recipientType,
      recipient_id: recipientId,
      disease_categories: selectedCategories,
      date_range_start: dateStart || undefined,
      date_range_end: dateEnd || undefined,
      purpose,
    });
    reset();
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("adminDistribute.distributeData")}</DialogTitle>
          <DialogDescription>
            {t("adminDistribute.stepOf", { step })} — {stepLabels[step - 1]}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <RadioGroup value={recipientType} onValueChange={(v) => { setRecipientType(v as "researcher" | "pharmacy"); setRecipientId(""); }}>
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors [&:has([data-state=checked])]:border-primary">
                <RadioGroupItem value="researcher" />
                <FlaskConical className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("adminDistribute.medicalResearchLab")}</p>
                  <p className="text-sm text-muted-foreground">{t("adminDistribute.medicalResearchLabDesc")}</p>
                </div>
              </label>
              <label className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors [&:has([data-state=checked])]:border-primary opacity-50">
                <RadioGroupItem value="pharmacy" disabled />
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t("adminDistribute.pharmacyCompany")}</p>
                  <p className="text-sm text-muted-foreground">{t("adminDistribute.pharmacyComingSoon")}</p>
                </div>
              </label>
            </div>
          </RadioGroup>
        )}

        {step === 2 && (
          <ScrollArea className="max-h-[300px]">
            <RadioGroup value={recipientId} onValueChange={setRecipientId}>
              <div className="space-y-2">
                {researchers.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">{t("adminDistribute.noResearchers")}</p>
                )}
                {researchers.map((r) => (
                  <label key={r.user_id} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors [&:has([data-state=checked])]:border-primary">
                    <RadioGroupItem value={r.user_id} className="mt-1" />
                    <div className="min-w-0">
                      <p className="font-medium">{r.full_name}</p>
                      {r.institution_name && <p className="text-sm text-muted-foreground">{r.institution_name}</p>}
                      {r.research_focus && <p className="text-xs text-muted-foreground truncate">{r.research_focus}</p>}
                    </div>
                    <Badge variant="outline" className="ml-auto shrink-0">{t("adminDistribute.verified")}</Badge>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </ScrollArea>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t("adminDistribute.diseaseCategories")}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t("adminDistribute.leaveCategoriesEmpty")}</p>
              <div className="flex flex-wrap gap-2">
                {DISEASE_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={() => toggleCategory(cat)} />
                    <span className="text-sm capitalize">{cat.replace("_", " ")}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="date-start">{t("adminDistribute.from")}</Label>
                <Input id="date-start" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="date-end">{t("adminDistribute.to")}</Label>
                <Input id="date-end" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="purpose">{t("adminDistribute.purposeLabel")}</Label>
              <Textarea id="purpose" placeholder={t("adminDistribute.purposePlaceholder")} value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={4} />
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{t("adminDistribute.anonymizationEnforced")}</p>
                <p className="text-muted-foreground">{t("adminDistribute.anonymizationDesc")}</p>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-y-2">
              <span className="text-muted-foreground">{t("adminDistribute.recipientTypeLabel")}</span>
              <span className="capitalize font-medium">{recipientType === "researcher" ? t("adminDistribute.researchLab") : t("adminDistribute.pharmacy")}</span>
              <span className="text-muted-foreground">{t("adminDistribute.recipient")}</span>
              <span className="font-medium">{selectedRecipient?.full_name || "—"}</span>
              {selectedRecipient?.institution_name && (
                <>
                  <span className="text-muted-foreground">{t("adminDistribute.institution")}</span>
                  <span>{selectedRecipient.institution_name}</span>
                </>
              )}
              <span className="text-muted-foreground">{t("adminDistribute.categories")}</span>
              <span>{selectedCategories.length > 0 ? selectedCategories.map((c) => c.replace("_", " ")).join(", ") : t("adminDistribute.all")}</span>
              <span className="text-muted-foreground">{t("adminDistribute.dateRange")}</span>
              <span>{dateStart && dateEnd ? `${dateStart} → ${dateEnd}` : dateStart || dateEnd || t("adminDistribute.allTime")}</span>
              <span className="text-muted-foreground">{t("adminDistribute.purpose")}</span>
              <span className="break-words">{purpose}</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{t("adminDistribute.auditLogNote")}</p>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={() => (step > 1 ? setStep(step - 1) : handleClose(false))} disabled={isSubmitting}>
            {step > 1 ? <><ArrowLeft className="h-4 w-4 mr-1" /> {t("adminDistribute.back")}</> : t("adminDistribute.cancel")}
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              {t("adminDistribute.next")} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Send className="h-4 w-4 mr-1" /> {isSubmitting ? t("adminDistribute.distributing") : t("adminDistribute.distribute")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}