import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Download, FileJson, FileSpreadsheet, Loader2, FileHeart } from "lucide-react";
import { ExportOptions, useResearchDataExport } from "@/hooks/useResearchDataExport";

interface ShareRecord {
  id: string;
  patient_id: string;
  is_anonymized: boolean;
  disease_category: string | null;
  status: string;
  shared_at: string;
  viewed_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  research_purpose: string | null;
}

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shares: ShareRecord[];
}

const ExportDataDialog = ({ open, onOpenChange, shares }: ExportDataDialogProps) => {
  const { t } = useTranslation();
  const { exportData, isExporting, progress } = useResearchDataExport();

  const [options, setOptions] = useState<ExportOptions>({
    format: "csv",
    includeFields: {
      profile: true,
      healthData: true,
      recordsList: true,
      shareStatus: true,
      clinicalRecords: true,
      prescriptions: true,
    },
    filterByStatus: "all",
  });

  const handleExport = async () => {
    const success = await exportData(shares, options);
    if (success) {
      onOpenChange(false);
    }
  };

  const toggleField = (field: keyof ExportOptions["includeFields"]) => {
    setOptions((prev) => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: !prev.includeFields[field],
      },
    }));
  };

  const statusCounts = shares.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredCount =
    options.filterByStatus === "all"
      ? shares.length
      : statusCounts[options.filterByStatus] || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {t("exportData.title")}
          </DialogTitle>
          <DialogDescription>
            {t("exportData.description", { count: shares.length })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("exportData.exportFormat")}</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value) =>
                setOptions((prev) => ({ ...prev, format: value as "csv" | "json" | "fhir" }))
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4 text-primary" />
                  JSON
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fhir" id="format-fhir" />
                <Label htmlFor="format-fhir" className="flex items-center gap-2 cursor-pointer">
                  <FileHeart className="h-4 w-4 text-primary" />
                  FHIR
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("exportData.filterByStatus")}</Label>
            <Select
              value={options.filterByStatus}
              onValueChange={(value) =>
                setOptions((prev) => ({
                  ...prev,
                  filterByStatus: value as ExportOptions["filterByStatus"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("exportData.allStatuses", { count: shares.length })}</SelectItem>
                <SelectItem value="pending">{t("exportData.pending", { count: statusCounts["pending"] || 0 })}</SelectItem>
                <SelectItem value="viewed">{t("exportData.inProgress", { count: statusCounts["viewed"] || 0 })}</SelectItem>
                <SelectItem value="completed">{t("exportData.completed", { count: statusCounts["completed"] || 0 })}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("exportData.recordsExported", { count: filteredCount })}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("exportData.includeDataFields")}</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="field-status" checked={options.includeFields.shareStatus} onCheckedChange={() => toggleField("shareStatus")} />
                <Label htmlFor="field-status" className="cursor-pointer text-sm">{t("exportData.shareStatusDates")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="field-profile" checked={options.includeFields.profile} onCheckedChange={() => toggleField("profile")} />
                <Label htmlFor="field-profile" className="cursor-pointer text-sm">
                  {t("exportData.patientProfile")}
                  <span className="text-xs text-muted-foreground ml-1">— {t("exportData.onlyNonAnonymized")}</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="field-health" checked={options.includeFields.healthData} onCheckedChange={() => toggleField("healthData")} />
                <Label htmlFor="field-health" className="cursor-pointer text-sm">{t("exportData.healthData")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="field-records" checked={options.includeFields.recordsList} onCheckedChange={() => toggleField("recordsList")} />
                <Label htmlFor="field-records" className="cursor-pointer text-sm">{t("exportData.medicalRecordsList")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="field-clinical" checked={options.includeFields.clinicalRecords} onCheckedChange={() => toggleField("clinicalRecords")} />
                <Label htmlFor="field-clinical" className="cursor-pointer text-sm">
                  Clinical Records
                  <span className="text-xs text-muted-foreground ml-1">— ICD-10/LOINC coded data</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="field-prescriptions" checked={options.includeFields.prescriptions} onCheckedChange={() => toggleField("prescriptions")} />
                <Label htmlFor="field-prescriptions" className="cursor-pointer text-sm">
                  Prescriptions
                  <span className="text-xs text-muted-foreground ml-1">— Medication orders &amp; dosages</span>
                </Label>
              </div>
            </div>
          </div>

          {isExporting && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("exportData.fetchingData")}</span>
                <span className="font-medium">{t("exportData.progressLabel", { current: progress.current, total: progress.total })}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleExport} disabled={isExporting || filteredCount === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("exportData.exporting")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t("exportData.exportRecords", { count: filteredCount })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDataDialog;
