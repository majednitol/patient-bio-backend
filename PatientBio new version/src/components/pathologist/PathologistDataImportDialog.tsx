import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  ClipboardList,
  History,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { usePathologistDataImport } from "@/hooks/usePathologistDataImport";
import { cn } from "@/lib/utils";

type ImportType = "test_catalog" | "report_templates" | "historical_reports";

interface PathologistDataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultImportType?: string | null;
  retryImportId?: string | null;
}

const IMPORT_TYPES = [
  {
    id: "test_catalog" as ImportType,
    title: "Test Catalog",
    description: "Tests, prices, reference ranges",
    icon: ClipboardList,
    columns: ["test_code", "name", "category", "sample_type", "price", "turnaround_time", "reference_ranges", "template_id"],
    columnHints: {
      test_code: "Unique code (e.g. CBC, LFT)",
      name: "Full test name",
      category: "blood_work, pathology, etc.",
      sample_type: "Blood, Urine, etc.",
      price: "Numeric price in local currency",
      turnaround_time: "e.g. '1 day', '4 hours'",
      reference_ranges: "Normal range text",
      template_id: "Optional template ID",
    },
  },
  {
    id: "report_templates" as ImportType,
    title: "Custom Templates",
    description: "Lab-specific report structures",
    icon: FileText,
    columns: ["name", "category", "test_type", "template_structure"],
    columnHints: {
      name: "Template name",
      category: "Test category",
      test_type: "Type of test",
      template_structure: "JSON structure definition",
    },
  },
  {
    id: "historical_reports" as ImportType,
    title: "Historical Reports",
    description: "Past reports for reference",
    icon: History,
    columns: ["patient_email", "ghpid", "report_date", "report_name", "report_type", "disease_category", "findings"],
    columnHints: {
      patient_email: "Patient's email address",
      ghpid: "Patient passport ID (optional)",
      report_date: "YYYY-MM-DD format",
      report_name: "Report title",
      report_type: "blood_work, imaging, etc.",
      disease_category: "general, cancer, etc.",
      findings: "Diagnostic findings text",
    },
  },
];

const CSV_TEMPLATES: Record<ImportType, string> = {
  test_catalog: `test_code,name,category,sample_type,price,turnaround_time,preparation_instructions,reference_ranges,template_id
CBC,Complete Blood Count,blood_work,Blood,500,1 day,Fasting not required,See template,cbc
LFT,Liver Function Test,biochemistry,Blood,800,2 days,Fasting 8-12 hours,,lft
LIPID,Lipid Profile,biochemistry,Blood,600,1 day,Fasting 12 hours,Total Cholesterol <200,lipid`,
  report_templates: `name,category,test_type,template_structure
Dengue NS1,microbiology,rapid_test,"{""fields"":[{""name"":""Result"",""type"":""select"",""options"":[""Positive"",""Negative""]}],""reference"":""Negative""}"
Vitamin D Panel,biochemistry,vitamin,"{""fields"":[{""name"":""25-OH Vitamin D"",""type"":""number"",""unit"":""ng/mL"",""reference"":""30-100""}]}"`,
  historical_reports: `patient_email,ghpid,report_date,report_name,report_type,disease_category,findings
rahim@example.com,PB-202601-000001-5,2026-01-15,CBC Report,blood_work,general,"Hemoglobin: 14.2 g/dL"
fatema@example.com,,2026-01-20,Lipid Profile,blood_work,heart_disease,"Total Cholesterol: 185 mg/dL"`,
};

export function PathologistDataImportDialog({
  open,
  onOpenChange,
  defaultImportType,
  retryImportId,
}: PathologistDataImportDialogProps) {
  const validDefault = IMPORT_TYPES.find((t) => t.id === defaultImportType)?.id || null;
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ImportType | null>(validDefault);
  const [csvContent, setCsvContent] = useState<string>("");
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [conflictResolution, setConflictResolution] = useState<"merge" | "replace" | "skip">("merge");
  const [deactivateUnlisted, setDeactivateUnlisted] = useState(false);
  const [successNavType, setSuccessNavType] = useState<ImportType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { importData, isImporting, importResult } = usePathologistDataImport();

  // Sync selectedType when defaultImportType changes (e.g. opening from a specific card)
  useEffect(() => {
    if (open && defaultImportType) {
      const valid = IMPORT_TYPES.find((t) => t.id === defaultImportType)?.id || null;
      setSelectedType(valid);
    }
  }, [open, defaultImportType]);

  // Handle retry: set import type and jump to upload step
  useEffect(() => {
    if (open && retryImportId) {
      // You could fetch the original import details here if needed
      // For now, just advance to upload step
      setStep(2);
    }
  }, [open, retryImportId]);

  const resetDialog = () => {
    setStep(1);
    setSelectedType(null);
    setCsvContent("");
    setParsedData(null);
    setConflictResolution("merge");
    setDeactivateUnlisted(false);
    setSuccessNavType(null);
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const parseCSV = (content: string) => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return null;

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1, 7).map((line) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    return { headers, rows };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setParsedData(parseCSV(content));
      setStep(2);
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.name.endsWith(".csv")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setParsedData(parseCSV(content));
      setStep(2);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    if (!selectedType) return;
    const template = CSV_TEMPLATES[selectedType];
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!selectedType || !csvContent) return;

    await importData({
      importType: selectedType,
      csvContent,
      conflictResolution,
      options: selectedType === "test_catalog" ? { deactivateUnlisted } : undefined,
    });

    setSuccessNavType(selectedType);
    setStep(4);
  };

  const selectedTypeInfo = IMPORT_TYPES.find((t) => t.id === selectedType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Bulk import your test catalog, templates, or historical reports
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
          {["Select Type", "Upload", "Configure", "Complete"].map((label, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                  step > idx + 1
                    ? "bg-[hsl(var(--diagnostic-primary))] text-white"
                    : step === idx + 1
                    ? "bg-[hsl(var(--diagnostic-primary))] text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step > idx + 1 ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <span className={cn("text-sm", step === idx + 1 ? "font-medium" : "text-muted-foreground")}>
                {label}
              </span>
              {idx < 3 && <div className="w-8 h-px bg-border mx-2" />}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Select Import Type */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">What would you like to import?</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {IMPORT_TYPES.map((type) => (
                  <Card
                    key={type.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-[hsl(var(--diagnostic-primary))]",
                      selectedType === type.id && "border-[hsl(var(--diagnostic-primary))] bg-[hsl(var(--diagnostic-primary))]/5"
                    )}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <type.icon className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--diagnostic-primary))]" />
                      <h3 className="font-medium">{type.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedType && (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-2">Expected Columns:</p>
                    <div className="space-y-1.5">
                      {selectedTypeInfo?.columns.map((col) => (
                        <div key={col} className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs font-mono min-w-[120px] justify-center">
                            {col}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(selectedTypeInfo as any)?.columnHints?.[col] || ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Format Support */}
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                      CSV Supported
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground border-dashed">
                      FHIR — Coming Soon
                    </Badge>
                  </div>

                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Upload & Preview */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              {!parsedData ? (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-[hsl(var(--diagnostic-primary))] transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Preview (showing first {parsedData.rows.length} rows)
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setParsedData(null);
                        setCsvContent("");
                      }}
                    >
                      Upload Different File
                    </Button>
                  </div>

                  {/* Column mapping validation */}
                  {selectedTypeInfo && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTypeInfo.columns.map((expected) => {
                        const matched = parsedData.headers.some(
                          (h) => h.toLowerCase().trim() === expected.toLowerCase()
                        );
                        return (
                          <Badge
                            key={expected}
                            variant={matched ? "default" : "outline"}
                            className={cn(
                              "text-xs",
                              matched
                                ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                                : "border-dashed border-amber-300 text-amber-600"
                            )}
                          >
                            {expected} {matched ? "✓" : "✗"}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {parsedData.headers.slice(0, 5).map((header, idx) => (
                            <TableHead key={idx} className="text-xs">
                              {header}
                            </TableHead>
                          ))}
                          {parsedData.headers.length > 5 && (
                            <TableHead className="text-xs">+{parsedData.headers.length - 5} more</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.rows.map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            {row.slice(0, 5).map((cell, cellIdx) => (
                              <TableCell key={cellIdx} className="text-xs truncate max-w-[150px]">
                                {cell || "-"}
                              </TableCell>
                            ))}
                            {row.length > 5 && <TableCell className="text-xs">...</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview Data */}
          {step === 3 && parsedData && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Data Preview</p>
                <p className="text-xs text-muted-foreground">Review your CSV data before importing</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-8">#</TableHead>
                        {parsedData.headers.slice(0, 6).map((header, idx) => (
                          <TableHead key={idx} className="text-xs">
                            {header}
                          </TableHead>
                        ))}
                        {parsedData.headers.length > 6 && (
                          <TableHead className="text-xs">+{parsedData.headers.length - 6}</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.rows.map((row, rowIdx) => (
                        <TableRow key={rowIdx}>
                          <TableCell className="text-xs text-muted-foreground">{rowIdx + 1}</TableCell>
                          {row.slice(0, 6).map((cell, cellIdx) => (
                            <TableCell key={cellIdx} className="text-xs truncate max-w-[120px]">
                              {cell || "-"}
                            </TableCell>
                          ))}
                          {row.length > 6 && <TableCell className="text-xs">…</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Showing first {Math.min(parsedData.rows.length, 6)} of {csvContent.split("\n").length - 1} rows
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Configure Options */}
          {step === 4 && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Conflict Resolution</Label>
                <Select value={conflictResolution} onValueChange={(v) => setConflictResolution(v as typeof conflictResolution)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merge">Merge - Update existing records</SelectItem>
                    <SelectItem value="replace">Replace - Overwrite existing records</SelectItem>
                    <SelectItem value="skip">Skip - Ignore duplicates</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How to handle records that already exist in your catalog
                </p>
              </div>

              {selectedType === "test_catalog" && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label>Deactivate Unlisted Tests</Label>
                    <p className="text-xs text-muted-foreground">
                      Mark tests not in this import as inactive
                    </p>
                  </div>
                  <Switch checked={deactivateUnlisted} onCheckedChange={setDeactivateUnlisted} />
                </div>
              )}

              <Card className="bg-[hsl(var(--diagnostic-primary))]/5 border-[hsl(var(--diagnostic-primary))]/20">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Ready to Import</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Type: {selectedTypeInfo?.title}</li>
                    <li>• Records: {csvContent.split("\n").length - 1}</li>
                    <li>• Conflict: {conflictResolution}</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Results */}
          {step === 5 && (
            <div className="space-y-4 py-4">
              {isImporting ? (
                <div className="text-center py-8">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-[hsl(var(--diagnostic-primary))]" />
                  <p className="font-medium">Importing data...</p>
                  <Progress value={50} className="mt-4 w-48 mx-auto" />
                </div>
              ) : importResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold">{importResult.imported + importResult.updated}</p>
                        <p className="text-sm text-muted-foreground">Imported</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                        <p className="text-2xl font-bold">{importResult.skipped}</p>
                        <p className="text-sm text-muted-foreground">Skipped</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                        <p className="text-2xl font-bold">{importResult.errors.length}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Post-import navigation */}
                  {successNavType === "test_catalog" && (
                    <Card className="bg-[hsl(var(--diagnostic-primary))]/5 border-[hsl(var(--diagnostic-primary))]/20">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium mb-2">Next Steps</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Your test catalog has been imported successfully. View and manage your catalog now.
                        </p>
                        <Button 
                          onClick={() => window.location.href = '/pathologist/catalog'}
                          className="diagnostic-gradient text-white w-full"
                        >
                          View Test Catalog
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {importResult.errors.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <p className="font-medium mb-2 text-red-600">Errors:</p>
                      <ScrollArea className="h-32">
                        {importResult.errors.slice(0, 10).map((err, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground">
                            Row {err.row}: {err.message}
                          </p>
                        ))}
                        {importResult.errors.length > 10 && (
                          <p className="text-sm text-muted-foreground">
                            ... and {importResult.errors.length - 10} more errors
                          </p>
                        )}
                      </ScrollArea>
                    </div>
                  )}

                  {importResult.warnings.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <p className="font-medium mb-2 text-amber-600">Warnings:</p>
                      <ScrollArea className="h-24">
                        {importResult.warnings.slice(0, 5).map((warn, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground">
                            Row {warn.row}: {warn.message}
                          </p>
                        ))}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-between pt-4 border-t">
          {step > 1 && step < 5 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedType}
              className="diagnostic-gradient text-white"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 2 && (
            <Button
              onClick={() => setStep(3)}
              disabled={!parsedData}
              className="diagnostic-gradient text-white"
            >
              Preview Data
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 4 && (
            <Button
              onClick={() => setStep(5)}
              className="diagnostic-gradient text-white"
            >
              Configure Import
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {step === 5 && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="diagnostic-gradient text-white"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Start Import
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {step === 6 && (
            <Button onClick={handleClose} className="diagnostic-gradient text-white">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
