import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileJson, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  User, 
  Activity, 
  AlertTriangle, 
  Pill, 
  FileText,
  Loader2,
  Info
} from "lucide-react";
import { useFHIRImport, type ConflictResolution } from "@/hooks/useFHIRImport";
import { getPreviewSummary } from "@/lib/fhirResourceMapper";
import { getValidationSummary } from "@/lib/fhirValidator";

const resourceIcons: Record<string, React.ReactNode> = {
  Patient: <User className="h-4 w-4" />,
  Observation: <Activity className="h-4 w-4" />,
  AllergyIntolerance: <AlertTriangle className="h-4 w-4" />,
  Condition: <AlertCircle className="h-4 w-4" />,
  MedicationStatement: <Pill className="h-4 w-4" />,
  MedicationRequest: <Pill className="h-4 w-4" />,
  DocumentReference: <FileText className="h-4 w-4" />,
};

export function FHIRImportDialog() {
  const [open, setOpen] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>("merge");
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "complete">("upload");
  
  const {
    isParsing,
    isImporting,
    bundle,
    preview,
    validation,
    importResult,
    error,
    parseFile,
    importBundle,
    reset,
  } = useFHIRImport();

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await parseFile(file);
    if (preview) {
      setStep("preview");
    }
  }, [parseFile, preview]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (!file.name.endsWith(".json")) {
      return;
    }
    
    await parseFile(file);
  }, [parseFile]);

  const handleImport = useCallback(async () => {
    setStep("importing");
    const success = await importBundle(conflictResolution);
    if (success) {
      setStep("complete");
    } else {
      setStep("preview");
    }
  }, [importBundle, conflictResolution]);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Reset after animation
    setTimeout(() => {
      reset();
      setStep("upload");
      setConflictResolution("merge");
    }, 300);
  }, [reset]);

  // Update step when preview is ready
  if (preview && step === "upload") {
    setStep("preview");
  }

  const summaryData = preview ? getPreviewSummary(preview) : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Health Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Import FHIR Health Data
          </DialogTitle>
          <DialogDescription>
            Import your health records from Apple Health, hospital exports, or other FHIR-compliant systems.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
              >
                {isParsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Parsing file...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop a FHIR JSON file here, or
                    </p>
                    <Label htmlFor="fhir-file" className="cursor-pointer">
                      <span className="text-primary hover:underline">browse to select</span>
                      <input
                        id="fhir-file"
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </Label>
                  </>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Supported Sources</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Apple Health Export (JSON format)</li>
                  <li>• Epic MyChart Export</li>
                  <li>• Cerner Patient Portal</li>
                  <li>• Any FHIR R4 compliant system</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              {/* Validation Summary */}
              {validation && (
                <Alert variant={validation.isValid ? "default" : "destructive"}>
                  {validation.isValid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {getValidationSummary(validation)}
                  </AlertDescription>
                </Alert>
              )}

              {/* Resource Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {summaryData && Object.entries(summaryData).filter(([key]) => key !== "Total" && key !== "Unsupported").map(([key, value]) => (
                  <Card key={key} className="p-3">
                    <div className="flex items-center gap-2">
                      {resourceIcons[key] || <FileText className="h-4 w-4" />}
                      <div>
                        <p className="text-xs text-muted-foreground">{key}</p>
                        <p className="text-lg font-semibold">{value}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Resource Details */}
              <ScrollArea className="h-48 border rounded-lg p-3">
                <div className="space-y-3">
                  {preview.patient && (
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 mt-0.5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">{preview.patient.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {preview.patient.details.join(" • ")}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {preview.allergies.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Allergies</p>
                      <div className="flex flex-wrap gap-1">
                        {preview.allergies.map((a) => (
                          <Badge key={a.id} variant="destructive" className="text-xs">
                            {a.displayName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {preview.conditions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Conditions</p>
                      <div className="flex flex-wrap gap-1">
                        {preview.conditions.map((c) => (
                          <Badge key={c.id} variant="secondary" className="text-xs">
                            {c.displayName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {preview.medications.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Medications</p>
                      <div className="flex flex-wrap gap-1">
                        {preview.medications.map((m) => (
                          <Badge key={m.id} variant="outline" className="text-xs">
                            {m.displayName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {preview.observations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Observations ({preview.observations.length})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vital signs, lab results, and other measurements
                      </p>
                    </div>
                  )}
                  
                  {preview.unsupported.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-600 mb-1">
                        Unsupported ({preview.unsupported.length})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        These resource types will be skipped
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Conflict Resolution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Conflict Resolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={conflictResolution}
                    onValueChange={(v) => setConflictResolution(v as ConflictResolution)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="merge" id="merge" />
                      <Label htmlFor="merge" className="text-sm font-normal">
                        <span className="font-medium">Merge</span> - Append imported data to existing fields
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="replace" id="replace" />
                      <Label htmlFor="replace" className="text-sm font-normal">
                        <span className="font-medium">Replace</span> - Overwrite existing data with imported data
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id="skip" />
                      <Label htmlFor="skip" className="text-sm font-normal">
                        <span className="font-medium">Skip</span> - Only import data for empty fields
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { reset(); setStep("upload"); }}>
                  Choose Different File
                </Button>
                <Button onClick={handleImport} className="flex-1">
                  Import {summaryData?.Total} Resources
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Importing your health data...</p>
              <p className="text-sm text-muted-foreground">This may take a few moments</p>
              <Progress value={50} className="w-64" />
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && importResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="h-16 w-16 text-primary mb-4" />
                <h3 className="text-xl font-semibold">Import Complete!</h3>
                <p className="text-muted-foreground">Your health data has been imported successfully.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{importResult.summary.imported}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-secondary">{importResult.summary.skipped}</p>
                  <p className="text-sm text-muted-foreground">Skipped</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{importResult.summary.errors}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </Card>
              </div>

              {importResult.summary.errors > 0 && (
                <ScrollArea className="h-32 border rounded-lg p-3">
                  <div className="space-y-1">
                    {importResult.details
                      .filter((d) => d.action === "error")
                      .map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-destructive" />
                          <span>{d.resourceType}: {d.error}</span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              )}

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
