import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, AlertTriangle, Shield, CheckCircle2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useCreateTransferAgreement,
  JURISDICTION_LABELS,
  TRANSFER_BASIS_LABELS,
  DATA_CATEGORY_OPTIONS,
  requiresCrossBorderConsent,
  getRecommendedTransferBasis,
  type JurisdictionCode,
  type TransferBasis,
} from "@/hooks/useDataTransferAgreements";

interface CrossBorderShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessTokenId?: string;
  onComplete?: () => void;
}

export function CrossBorderShareDialog({
  open,
  onOpenChange,
  accessTokenId,
  onComplete,
}: CrossBorderShareDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [sourceJurisdiction, setSourceJurisdiction] = useState<JurisdictionCode>("US");
  const [destinationJurisdiction, setDestinationJurisdiction] = useState<JurisdictionCode>("US");
  const [transferBasis, setTransferBasis] = useState<TransferBasis>("explicit_consent");
  const [recipientName, setRecipientName] = useState("");
  const [recipientType, setRecipientType] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [purpose, setPurpose] = useState("");
  const [retentionDays, setRetentionDays] = useState<string>("");
  const [acknowledgedRisks, setAcknowledgedRisks] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  const createAgreement = useCreateTransferAgreement();

  const isCrossBorder = requiresCrossBorderConsent(sourceJurisdiction, destinationJurisdiction);
  const recommendedBasis = getRecommendedTransferBasis(sourceJurisdiction, destinationJurisdiction);

  // Update transfer basis when jurisdictions change
  useEffect(() => {
    setTransferBasis(recommendedBasis);
  }, [sourceJurisdiction, destinationJurisdiction, recommendedBasis]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    await createAgreement.mutateAsync({
      accessTokenId,
      sourceJurisdiction,
      destinationJurisdiction,
      transferBasis,
      recipientName: recipientName || undefined,
      recipientType: recipientType as any || undefined,
      dataCategories: selectedCategories,
      purpose,
      retentionPeriodDays: retentionDays ? parseInt(retentionDays) : undefined,
      acknowledgedRisks,
      expiresAt: expiresAt || undefined,
    });

    onOpenChange(false);
    onComplete?.();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSourceJurisdiction("US");
    setDestinationJurisdiction("US");
    setTransferBasis("explicit_consent");
    setRecipientName("");
    setRecipientType("");
    setSelectedCategories([]);
    setPurpose("");
    setRetentionDays("");
    setAcknowledgedRisks(false);
    setExpiresAt("");
  };

  const canProceedStep1 = sourceJurisdiction && destinationJurisdiction;
  const canProceedStep2 = selectedCategories.length > 0 && purpose.trim();
  const canSubmit = acknowledgedRisks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("shareDialogs.crossBorderTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("shareDialogs.crossBorderDesc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
            ))}
          </div>

          {/* Step 1: Jurisdictions */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("shareDialogs.sourceJurisdiction")}</Label>
                  <Select
                    value={sourceJurisdiction}
                    onValueChange={(v) => setSourceJurisdiction(v as JurisdictionCode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(JURISDICTION_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("shareDialogs.sourceJurisdictionDesc")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t("shareDialogs.destinationJurisdiction")}</Label>
                  <Select
                    value={destinationJurisdiction}
                    onValueChange={(v) => setDestinationJurisdiction(v as JurisdictionCode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(JURISDICTION_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("shareDialogs.destinationJurisdictionDesc")}
                  </p>
                </div>
              </div>

              {isCrossBorder ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{t("shareDialogs.crossBorderRequired")}</AlertTitle>
                  <AlertDescription>
                    {t("shareDialogs.crossBorderRequiredDesc", { source: JURISDICTION_LABELS[sourceJurisdiction], dest: JURISDICTION_LABELS[destinationJurisdiction] })}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>{t("shareDialogs.noAdditionalConsent")}</AlertTitle>
                  <AlertDescription>
                    {t("shareDialogs.noAdditionalConsentDesc")}
                  </AlertDescription>
                </Alert>
              )}

              {isCrossBorder && (
                <div className="space-y-2">
                  <Label>{t("shareDialogs.legalBasis")}</Label>
                  <Select
                    value={transferBasis}
                    onValueChange={(v) => setTransferBasis(v as TransferBasis)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRANSFER_BASIS_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {transferBasis === recommendedBasis && (
                    <Badge variant="secondary" className="text-xs">
                      {t("shareDialogs.recommended")}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Data Categories & Purpose */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("shareDialogs.recipientInfo")}</Label>
                <Input
                  placeholder={t("shareDialogs.recipientPlaceholder")}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t("shareDialogs.recipientType")}</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("shareDialogs.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare_provider">{t("shareDialogs.healthcareProviderType")}</SelectItem>
                    <SelectItem value="researcher">{t("shareDialogs.researcherType")}</SelectItem>
                    <SelectItem value="insurance">{t("shareDialogs.insuranceType")}</SelectItem>
                    <SelectItem value="government">{t("shareDialogs.governmentType")}</SelectItem>
                    <SelectItem value="other">{t("shareDialogs.otherType")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>{t("shareDialogs.dataCategories")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DATA_CATEGORY_OPTIONS.map((category) => (
                    <div
                      key={category.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={category.value}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={() => handleCategoryToggle(category.value)}
                      />
                      <label
                        htmlFor={category.value}
                        className="text-sm cursor-pointer"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("shareDialogs.purposeOfTransfer")}</Label>
                <Textarea
                  placeholder={t("shareDialogs.describePurposeTransfer")}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("shareDialogs.retentionPeriod")}</Label>
                  <Input
                    type="number"
                    placeholder={t("shareDialogs.retentionPlaceholder")}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("shareDialogs.agreementExpires")}</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Consent & Risks */}
          {step === 3 && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>{t("shareDialogs.reviewAgreement")}</AlertTitle>
                <AlertDescription>
                  {t("shareDialogs.reviewDesc")}
                </AlertDescription>
              </Alert>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("shareDialogs.from")}</span>
                  <span className="font-medium">{JURISDICTION_LABELS[sourceJurisdiction]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("shareDialogs.to")}</span>
                  <span className="font-medium">{JURISDICTION_LABELS[destinationJurisdiction]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("shareDialogs.legalBasisLabel")}</span>
                  <span className="font-medium">{TRANSFER_BASIS_LABELS[transferBasis]}</span>
                </div>
                {recipientName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("shareDialogs.recipient")}</span>
                    <span className="font-medium">{recipientName}</span>
                  </div>
                )}
                <Separator />
                <div>
                  <span className="text-muted-foreground">{t("shareDialogs.dataCategoriesLabel")}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCategories.map((cat) => (
                      <Badge key={cat} variant="secondary">
                        {DATA_CATEGORY_OPTIONS.find((c) => c.value === cat)?.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("shareDialogs.purposeLabel")}</span>
                  <p className="mt-1">{purpose}</p>
                </div>
              </div>

              {isCrossBorder && (
                <Alert variant="destructive">
                  <Shield className="h-4 w-4" />
                  <AlertTitle>{t("shareDialogs.riskDisclosure")}</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      {t("shareDialogs.riskDisclosureDesc", { dest: JURISDICTION_LABELS[destinationJurisdiction] })}
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>{t("shareDialogs.riskDifferentStandards")}</li>
                      <li>{t("shareDialogs.riskLimitedRecourse")}</li>
                      <li>{t("shareDialogs.riskForeignAccess")}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="acknowledge-risks"
                  checked={acknowledgedRisks}
                  onCheckedChange={(checked) => setAcknowledgedRisks(checked === true)}
                />
                <label htmlFor="acknowledge-risks" className="text-sm cursor-pointer">
                  {t("shareDialogs.consentAcknowledge", { basis: TRANSFER_BASIS_LABELS[transferBasis] })}
                </label>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                {t("shareDialogs.back")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2)
                }
              >
                {t("shareDialogs.continue")}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createAgreement.isPending}
              >
                {createAgreement.isPending ? t("shareDialogs.creating") : t("shareDialogs.createAgreement")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CrossBorderShareDialog;
