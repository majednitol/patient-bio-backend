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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useResearcherDataImport } from "@/hooks/useResearcherDataImport";
import { 
  Upload, 
  FileText, 
  Users, 
  BookOpen,
  Download, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Loader2
} from "lucide-react";

type ImportType = "research_studies" | "participant_cohorts" | "study_notes";
type ConflictResolution = "merge" | "replace" | "skip";

interface ImportTypeOption {
  id: ImportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  templateHeaders: string[];
  sampleData: string[][];
}

const importTypes: ImportTypeOption[] = [
  {
    id: "research_studies",
    title: "Research Studies",
    description: "Import study definitions with budgets and disease categories",
    icon: <FileText className="h-8 w-8" />,
    templateHeaders: ["title", "disease_category", "token_budget", "tokens_per_patient", "description", "status"],
    sampleData: [
      ["Diabetes Cohort Study", "diabetes", "5000", "25", "Long-term glucose monitoring research", "active"],
      ["Cancer Biomarkers", "cancer", "10000", "50", "Identifying early detection biomarkers", "draft"],
    ],
  },
  {
    id: "participant_cohorts",
    title: "Participant Cohorts",
    description: "Import patient lists for data access requests",
    icon: <Users className="h-8 w-8" />,
    templateHeaders: ["patient_email", "patient_ghpid", "disease_category", "reason", "token_offer"],
    sampleData: [
      ["patient@example.com", "", "heart_disease", "Cardiac study participation", "20"],
      ["", "PB-202601-000123-4", "diabetes", "Glucose research", "15"],
    ],
  },
  {
    id: "study_notes",
    title: "Study Notes & Findings",
    description: "Import historical research notes and publications",
    icon: <BookOpen className="h-8 w-8" />,
    templateHeaders: ["study_title", "methodology", "findings", "sample_size", "is_published", "publication_url"],
    sampleData: [
      ["Phase 1 Results", "Randomized controlled trial", "Significant reduction in markers", "150", "true", "https://doi.org/..."],
      ["Preliminary Analysis", "Observational cohort", "Correlation identified", "75", "false", ""],
    ],
  },
];

export function ResearcherDataImportDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ImportType | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [previewData, setPreviewData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>("merge");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
    warnings: Array<{ row: number; message: string }>;
  } | null>(null);

  const { importData, isImporting } = useResearcherDataImport();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);

      // Parse preview
      const lines = content.trim().split("\n");
      if (lines.length >= 1) {
        const headers = lines[0].split(",").map((h) => h.trim().replace(/['"]/g, ""));
        const rows = lines.slice(1, 6).map((line) => {
          const values: string[] = [];
          let current = "";
          let inQuotes = false;
          for (const char of line) {
            if (char === '"' && !inQuotes) inQuotes = true;
            else if (char === '"' && inQuotes) inQuotes = false;
            else if (char === "," && !inQuotes) {
              values.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          return values;
        });
        setPreviewData({ headers, rows });
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const typeConfig = importTypes.find((t) => t.id === selectedType);
    if (!typeConfig) return;

    const csvLines = [
      typeConfig.templateHeaders.join(","),
      ...typeConfig.sampleData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ];
    const csvString = csvLines.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!selectedType || !csvContent) return;

    try {
      const result = await importData({
        importType: selectedType,
        csvContent,
        conflictResolution,
      });
      setImportResult(result);
      setStep(4);
    } catch (error) {
      console.error("Import failed:", error);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setSelectedType(null);
    setCsvContent("");
    setPreviewData(null);
    setConflictResolution("merge");
    setImportResult(null);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(resetDialog, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Research Data</DialogTitle>
          <DialogDescription>
            Bulk import research studies, participant cohorts, or study notes from CSV files.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Progress value={(step / 4) * 100} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span className={step >= 1 ? "text-primary font-medium" : ""}>Select Type</span>
            <span className={step >= 2 ? "text-primary font-medium" : ""}>Upload</span>
            <span className={step >= 3 ? "text-primary font-medium" : ""}>Configure</span>
            <span className={step >= 4 ? "text-primary font-medium" : ""}>Results</span>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the type of data you want to import:
              </p>
              <div className="grid gap-4">
                {importTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedType === type.id ? "border-primary ring-2 ring-primary/20" : ""
                    }`}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-4">
                        <div className="text-primary">{type.icon}</div>
                        <div>
                          <CardTitle className="text-base">{type.title}</CardTitle>
                          <CardDescription>{type.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 2 && selectedType && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with your {importTypes.find((t) => t.id === selectedType)?.title.toLowerCase()}:
                </p>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <span className="font-medium">Click to upload or drag and drop</span>
                  <span className="text-sm text-muted-foreground">CSV files only</span>
                </Label>
              </div>

              {previewData && (
                <div className="space-y-2">
                  <h4 className="font-medium">Preview (first 5 rows)</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.headers.map((header, i) => (
                            <TableHead key={i} className="text-xs">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.rows.map((row, i) => (
                          <TableRow key={i}>
                            {row.map((cell, j) => (
                              <TableCell key={j} className="text-xs truncate max-w-[150px]">
                                {cell || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-medium">Conflict Resolution</Label>
                <p className="text-sm text-muted-foreground">
                  How should we handle records that already exist?
                </p>
                <RadioGroup
                  value={conflictResolution}
                  onValueChange={(v) => setConflictResolution(v as ConflictResolution)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 border rounded-lg p-3">
                    <RadioGroupItem value="merge" id="merge" />
                    <Label htmlFor="merge" className="flex-1 cursor-pointer">
                      <div className="font-medium">Merge</div>
                      <div className="text-sm text-muted-foreground">
                        Update existing records with new data
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border rounded-lg p-3">
                    <RadioGroupItem value="replace" id="replace" />
                    <Label htmlFor="replace" className="flex-1 cursor-pointer">
                      <div className="font-medium">Replace</div>
                      <div className="text-sm text-muted-foreground">
                        Completely replace existing records
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border rounded-lg p-3">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="flex-1 cursor-pointer">
                      <div className="font-medium">Skip</div>
                      <div className="text-sm text-muted-foreground">
                        Keep existing records unchanged
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ready to Import</AlertTitle>
                <AlertDescription>
                  {previewData?.rows.length || 0} rows will be processed. This may take a moment.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 4 && importResult && (
            <div className="space-y-4">
              <Alert variant={importResult.errors.length === 0 ? "default" : "destructive"}>
                {importResult.errors.length === 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>Import Complete</AlertTitle>
                <AlertDescription>
                  Processing finished with {importResult.imported + importResult.updated} successful records.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                    <div className="text-sm text-muted-foreground">Imported</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-gray-600">{importResult.skipped}</div>
                    <div className="text-sm text-muted-foreground">Skipped</div>
                  </CardContent>
                </Card>
              </div>

              {importResult.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Warnings ({importResult.warnings.length})
                  </h4>
                  <div className="border rounded-lg p-3 max-h-32 overflow-y-auto text-sm">
                    {importResult.warnings.map((warning, i) => (
                      <div key={i} className="text-yellow-700">
                        Row {warning.row}: {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Errors ({importResult.errors.length})
                  </h4>
                  <div className="border border-destructive/50 rounded-lg p-3 max-h-32 overflow-y-auto text-sm">
                    {importResult.errors.map((error, i) => (
                      <div key={i} className="text-destructive">
                        Row {error.row}: {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t">
          {step > 1 && step < 4 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {step === 1 && <div />}
          
          {step === 1 && (
            <Button onClick={() => setStep(2)} disabled={!selectedType}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} disabled={!csvContent}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>
          )}
          {step === 4 && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
