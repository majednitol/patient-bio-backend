import { useState, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { usePathologistDataImport } from "@/hooks/usePathologistDataImport";
import { cn } from "@/lib/utils";

interface BatchReportUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CSV_TEMPLATE = `patient_email,ghpid,report_date,report_name,report_type,disease_category,findings
rahim@example.com,PB-202601-000001-5,2026-01-15,CBC Report,blood_work,general,"Hemoglobin: 14.2 g/dL, WBC: 7500"
fatema@example.com,,2026-02-01,Lipid Profile,blood_work,heart_disease,"Total Cholesterol: 185 mg/dL"
,PB-202602-000010-3,2026-02-05,Thyroid Panel,blood_work,general,"TSH: 2.1 mIU/L, T3: 120 ng/dL"`;

const EXPECTED_COLUMNS = [
  { name: "patient_email", required: false, desc: "Patient email for lookup" },
  { name: "ghpid", required: false, desc: "Patient passport ID" },
  { name: "report_date", required: false, desc: "Date of report (YYYY-MM-DD)" },
  { name: "report_name", required: true, desc: "Name of the report" },
  { name: "report_type", required: false, desc: "blood_work, imaging, pathology, etc." },
  { name: "disease_category", required: false, desc: "general, cancer, diabetes, etc." },
  { name: "findings", required: false, desc: "Diagnostic findings text" },
];

function parseCSV(content: string): { headers: string[]; rows: string[][] } | null {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return null;

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(parseLine);
  return { headers, rows };
}

export function BatchReportUploadDialog({ open, onOpenChange }: BatchReportUploadDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csvContent, setCsvContent] = useState("");
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [conflictResolution, setConflictResolution] = useState<"merge" | "replace" | "skip">("skip");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importData, isImporting, importResult } = usePathologistDataImport();

  const resetDialog = () => {
    setStep(1);
    setCsvContent("");
    setParsedData(null);
    setConflictResolution("skip");
    setFileName("");
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setParsedData(parseCSV(content));
    };
    reader.readAsText(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || (!file.name.endsWith(".csv") && !file.name.endsWith(".txt"))) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setParsedData(parseCSV(content));
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch_reports_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!csvContent) return;
    setStep(3);
    await importData({
      importType: "historical_reports",
      csvContent,
      conflictResolution,
    });
  };

  const totalRows = parsedData?.rows.length || 0;
  const hasReportName = parsedData?.headers.some(
    (h) => h.toLowerCase().replace(/[_\s-]/g, "") === "reportname" || h.toLowerCase().replace(/[_\s-]/g, "") === "name"
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            Batch Report Upload
          </DialogTitle>
          <DialogDescription>
            Import multiple reports at once from a CSV file — ideal for high-volume labs
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
          {["Upload CSV", "Review & Configure", "Results"].map((label, idx) => (
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
              <span className={cn("text-sm hidden sm:inline", step === idx + 1 ? "font-medium" : "text-muted-foreground")}>
                {label}
              </span>
              {idx < 2 && <div className="w-6 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              {/* Expected columns info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Expected CSV Columns:</p>
                <div className="flex flex-wrap gap-1">
                  {EXPECTED_COLUMNS.map((col) => (
                    <Badge
                      key={col.name}
                      variant={col.required ? "default" : "secondary"}
                      className={cn("text-xs", col.required && "bg-[hsl(var(--diagnostic-primary))]")}
                      title={col.desc}
                    >
                      {col.name}{col.required ? " *" : ""}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Patients are matched by email or GHPID. At least one identifier per row is recommended.
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-[hsl(var(--diagnostic-primary))] transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                {parsedData ? (
                  <>
                    <p className="font-medium text-[hsl(var(--diagnostic-primary))]">{fileName}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {totalRows} reports found • {parsedData.headers.length} columns
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Drop your CSV file here</p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Preview table */}
              {parsedData && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preview (first {Math.min(parsedData.rows.length, 5)} rows)</p>
                  {!hasReportName && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg text-sm">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      Missing required column: report_name
                    </div>
                  )}
                  <div className="border rounded-lg overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-10">#</TableHead>
                          {parsedData.headers.slice(0, 6).map((h, i) => (
                            <TableHead key={i} className="text-xs">{h}</TableHead>
                          ))}
                          {parsedData.headers.length > 6 && (
                            <TableHead className="text-xs">+{parsedData.headers.length - 6}</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.rows.slice(0, 5).map((row, ri) => (
                          <TableRow key={ri}>
                            <TableCell className="text-xs text-muted-foreground">{ri + 1}</TableCell>
                            {row.slice(0, 6).map((cell, ci) => (
                              <TableCell key={ci} className="text-xs truncate max-w-[120px]">
                                {cell || <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            ))}
                            {row.length > 6 && <TableCell className="text-xs">…</TableCell>}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 2 && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Duplicate Handling</Label>
                <Select value={conflictResolution} onValueChange={(v) => setConflictResolution(v as typeof conflictResolution)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip duplicates</SelectItem>
                    <SelectItem value="merge">Update existing reports</SelectItem>
                    <SelectItem value="replace">Overwrite existing reports</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="bg-[hsl(var(--diagnostic-primary))]/5 border-[hsl(var(--diagnostic-primary))]/20">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Import Summary</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <span className="font-medium text-foreground">{totalRows}</span> reports to process</li>
                    <li>• File: {fileName}</li>
                    <li>• Columns: {parsedData?.headers.join(", ")}</li>
                    <li>• Duplicates: {conflictResolution}</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && (
            <div className="space-y-4 py-4">
              {isImporting ? (
                <div className="text-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-[hsl(var(--diagnostic-primary))]" />
                  <p className="font-medium">Processing {totalRows} reports…</p>
                  <p className="text-sm text-muted-foreground mt-1">Matching patients and creating records</p>
                  <Progress value={45} className="mt-4 w-56 mx-auto" />
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

                  {importResult.warnings.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <p className="font-medium mb-2 text-amber-600 text-sm">Warnings:</p>
                      <ScrollArea className="h-24">
                        {importResult.warnings.slice(0, 20).map((w, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            Row {w.row}: {w.message}
                          </p>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  {importResult.errors.length > 0 && (
                    <div className="border rounded-lg p-3">
                      <p className="font-medium mb-2 text-destructive text-sm">Errors:</p>
                      <ScrollArea className="h-24">
                        {importResult.errors.slice(0, 20).map((err, idx) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            Row {err.row}: {err.message}
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

        {/* Footer nav */}
        <div className="flex justify-between pt-2 border-t">
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!parsedData || !hasReportName}
                className="diagnostic-gradient text-white"
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="diagnostic-gradient text-white"
              >
                {isImporting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Import {totalRows} Reports</>
                )}
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <div />
              <Button onClick={handleClose}>
                {isImporting ? "Close" : "Done"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
