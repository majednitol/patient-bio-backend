import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProviderVerification, ProviderType } from "@/hooks/useProviderVerification";
import { Loader2, Upload, FileText, ShieldCheck, X, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface VerificationSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerType: ProviderType;
  isResubmit?: boolean;
}

const countries = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Bangladesh",
  "China",
  "Japan",
  "Brazil",
  "Other",
];

export const VerificationSubmitDialog = ({
  open,
  onOpenChange,
  providerType,
  isResubmit = false,
}: VerificationSubmitDialogProps) => {
  const { submitVerification, resubmitVerification, isSubmitting, isResubmitting } = useProviderVerification();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    license_number: "",
    issuing_authority: "",
    issuing_country: "",
    license_expiry_date: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.license_number || !formData.issuing_authority || !formData.issuing_country) {
      toast.error(t("providerVerifications.fillRequired"));
      return;
    }

    const data = {
      provider_type: providerType,
      license_number: formData.license_number,
      issuing_authority: formData.issuing_authority,
      issuing_country: formData.issuing_country,
      license_expiry_date: formData.license_expiry_date || undefined,
      notes: formData.notes || undefined,
      file: file || undefined,
      additionalFiles: additionalFiles.length > 0 ? additionalFiles : undefined,
    };

    const onSuccess = () => {
      onOpenChange(false);
      setFormData({
        license_number: "",
        issuing_authority: "",
        issuing_country: "",
        license_expiry_date: "",
        notes: "",
      });
      setFile(null);
      setAdditionalFiles([]);
    };

    if (isResubmit) {
      resubmitVerification(data, { onSuccess });
    } else {
      submitVerification(data, { onSuccess });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error(t("providerVerifications.fileSizeError"));
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAdditionalFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name}: ${t("providerVerifications.fileSizeError")}`);
        return false;
      }
      return true;
    });
    setAdditionalFiles(prev => [...prev, ...validFiles]);
    // Reset input so same file can be added again
    e.target.value = "";
  };

  const removeAdditionalFile = (index: number) => {
    setAdditionalFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isLoading = isSubmitting || isResubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isResubmit ? t("providerVerifications.resubmitTitle") : t("providerVerifications.submitTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("providerVerifications.submitDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="license_number">
              {t("providerVerifications.licenseNumber")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="license_number"
              placeholder={t("providerVerifications.licenseNumberPlaceholder")}
              value={formData.license_number}
              onChange={(e) =>
                setFormData({ ...formData, license_number: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuing_authority">
              {t("providerVerifications.issuingAuthority")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="issuing_authority"
              placeholder={t("providerVerifications.issuingAuthorityPlaceholder")}
              value={formData.issuing_authority}
              onChange={(e) =>
                setFormData({ ...formData, issuing_authority: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issuing_country">
              {t("providerVerifications.country")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.issuing_country}
              onValueChange={(value) =>
                setFormData({ ...formData, issuing_country: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("providerVerifications.selectCountry")} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license_expiry_date">{t("providerVerifications.expiryDate")}</Label>
            <Input
              id="license_expiry_date"
              type="date"
              value={formData.license_expiry_date}
              onChange={(e) =>
                setFormData({ ...formData, license_expiry_date: e.target.value })
              }
            />
          </div>

          {/* Primary Document */}
          <div className="space-y-2">
            <Label htmlFor="document">{t("providerVerifications.licenseDocument")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("document")?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? file.name : t("providerVerifications.uploadDocument")}
              </Button>
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="truncate flex-1">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  {t("common.delete")}
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {t("providerVerifications.fileFormats")}
            </p>
          </div>

          {/* Additional Documents */}
          <div className="space-y-2">
            <Label>{t("providerVerifications.additionalDocuments")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("providerVerifications.additionalDocumentsDesc")}
            </p>
            <Input
              id="additional-documents"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleAdditionalFiles}
              className="hidden"
              multiple
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => document.getElementById("additional-documents")?.click()}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("providerVerifications.addMoreDocuments")}
            </Button>
            {additionalFiles.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {additionalFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded px-2 py-1">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">{f.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => removeAdditionalFile(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("providerVerifications.additionalNotes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("providerVerifications.additionalNotesPlaceholder")}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("providerVerifications.submitting")}
                </>
              ) : (
                t("common.submit")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
