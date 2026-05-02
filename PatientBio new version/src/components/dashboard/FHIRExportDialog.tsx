import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFHIRExport } from "@/hooks/useFHIRExport";
import { useCCDAExport } from "@/hooks/useCCDAExport";
import { validateFHIRBundle, ValidationResult } from "@/lib/fhirValidator";
import { FHIRValidationReport } from "@/components/dashboard/FHIRValidationReport";
import {
  Download,
  FileJson,
  Loader2,
  ShieldCheck,
  FileText,
  Pill,
  Heart,
  AlertCircle,
  Activity,
  CheckCircle2,
  FileCode,
  Database,
} from "lucide-react";

interface FHIRExportDialogProps {
  trigger?: React.ReactNode;
}

type ExportFormat = "fhir" | "ccda" | "ndjson";

export const FHIRExportDialog = ({ trigger }: FHIRExportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("fhir");
  const [includeRecords, setIncludeRecords] = useState(true);
  const [includePrescriptions, setIncludePrescriptions] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [runValidation, setRunValidation] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationReport, setShowValidationReport] = useState(false);
  
  const { exportFHIR, isExporting: isFHIRExporting } = useFHIRExport();
  const { exportCCDA, isExporting: isCCDAExporting } = useCCDAExport();
  
  const isExporting = isFHIRExporting || isCCDAExporting;

  const handleExport = async () => {
    if (selectedFormat === "fhir") {
      const result = await exportFHIR({
        format: "json",
        includeRecords,
        includePrescriptions,
      });

      if (result) {
        if (runValidation) {
          const validation = validateFHIRBundle(result);
          setValidationResult(validation);
          
          if (!validation.isValid) {
            setShowValidationReport(true);
            return;
          }
        }
        setOpen(false);
      }
    } else if (selectedFormat === "ccda") {
      const result = await exportCCDA({ format: "ccda" });
      if (result) {
        setOpen(false);
      }
    } else if (selectedFormat === "ndjson") {
      const result = await exportCCDA({ format: "ndjson" });
      if (result) {
        setOpen(false);
      }
    }
  };

  const handleDownloadAnyway = () => {
    setShowValidationReport(false);
    setOpen(false);
  };

  const handleCloseValidation = () => {
    setShowValidationReport(false);
  };

  const resetState = () => {
    setValidationResult(null);
    setShowValidationReport(false);
  };

  const formatInfo = {
    fhir: {
      title: "FHIR R4 (JSON)",
      description: "Standard healthcare interoperability format. Best for modern EHR systems.",
      icon: FileJson,
      badge: "Recommended",
    },
    ccda: {
      title: "C-CDA (XML)",
      description: "Consolidated Clinical Document Architecture. For legacy hospital systems.",
      icon: FileCode,
      badge: "Legacy",
    },
    ndjson: {
      title: "FHIR Bulk (NDJSON)",
      description: "Newline-delimited JSON for large-scale data exchange.",
      icon: Database,
      badge: "Bulk",
    },
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileJson className="h-4 w-4" />
            Export Health Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {showValidationReport && validationResult ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Validation Results
              </DialogTitle>
              <DialogDescription>
                Review the validation issues before downloading
              </DialogDescription>
            </DialogHeader>
            <FHIRValidationReport
              result={validationResult}
              onDownloadAnyway={handleDownloadAnyway}
              onClose={handleCloseValidation}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Export Health Data
              </DialogTitle>
              <DialogDescription>
                Export your health data in international healthcare standards formats.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Format Selection */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Export Format</h4>
                <Tabs value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ExportFormat)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="fhir" className="text-xs">FHIR R4</TabsTrigger>
                    <TabsTrigger value="ccda" className="text-xs">C-CDA</TabsTrigger>
                    <TabsTrigger value="ndjson" className="text-xs">Bulk</TabsTrigger>
                  </TabsList>
                  
                  {(["fhir", "ccda", "ndjson"] as ExportFormat[]).map((format) => (
                    <TabsContent key={format} value={format} className="mt-3">
                      <Card className="p-4 bg-muted/50">
                        <div className="flex items-start gap-3">
                          {(() => {
                            const Icon = formatInfo[format].icon;
                            return <Icon className="h-5 w-5 text-primary mt-0.5" />;
                          })()}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">{formatInfo[format].title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {formatInfo[format].badge}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatInfo[format].description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* Data Included - Only for FHIR */}
              {selectedFormat === "fhir" && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Data Included</h4>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <Heart className="h-4 w-4 text-destructive" />
                      <span className="text-sm flex-1">Patient Profile & Health Data</span>
                      <Badge variant="secondary" className="text-xs">
                        Always included
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <Checkbox
                        id="includeMetrics"
                        checked={includeMetrics}
                        onCheckedChange={(checked) =>
                          setIncludeMetrics(checked === true)
                        }
                      />
                      <Label
                        htmlFor="includeMetrics"
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        <Activity className="h-4 w-4 text-secondary" />
                        <span className="text-sm">Health Metrics (Vitals)</span>
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <Checkbox
                        id="includeRecords"
                        checked={includeRecords}
                        onCheckedChange={(checked) =>
                          setIncludeRecords(checked === true)
                        }
                      />
                      <Label
                        htmlFor="includeRecords"
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm">Health Records</span>
                      </Label>
                    </div>

                    <div className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <Checkbox
                        id="includePrescriptions"
                        checked={includePrescriptions}
                        onCheckedChange={(checked) =>
                          setIncludePrescriptions(checked === true)
                        }
                      />
                      <Label
                        htmlFor="includePrescriptions"
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        <Pill className="h-4 w-4 text-secondary" />
                        <span className="text-sm">Prescriptions</span>
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation toggle - Only for FHIR */}
              {selectedFormat === "fhir" && (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <div>
                      <Label htmlFor="runValidation" className="text-sm font-medium cursor-pointer">
                        Validate before export
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Check FHIR R4 compliance
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="runValidation"
                    checked={runValidation}
                    onCheckedChange={setRunValidation}
                  />
                </div>
              )}

              {/* Privacy note */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Your data is exported securely and only you have access to the
                  downloaded file. No data is shared with third parties.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download {selectedFormat.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
