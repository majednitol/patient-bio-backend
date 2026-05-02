import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDoctorDataImport } from "@/hooks/useDoctorDataImport";
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DoctorDataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportType = "templates" | "patients" | "notes";
type ConflictResolution = "merge" | "replace" | "skip";
type Step = "select" | "upload" | "preview" | "importing" | "complete";

export const DoctorDataImportDialog = ({ open, onOpenChange }: DoctorDataImportDialogProps) => {
  const [step, setStep] = useState<Step>("select");
  const [importType, setImportType] = useState<ImportType>("templates");
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>("merge");
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);

  const importMutation = useDoctorDataImport();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    const content = await file.text();
    setCsvContent(content);
    setFileName(file.name);

    // Parse preview
    const lines = content.trim().split("\n").slice(0, 6);
    const rows = lines.map((line) => {
      const cells: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          cells.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });

    setPreviewRows(rows);
    setStep("preview");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    setStep("importing");
    await importMutation.mutateAsync({
      csvContent,
      importType,
      conflictResolution,
      sourceFilename: fileName,
    });
    setStep("complete");
  };

  const handleReset = () => {
    setStep("select");
    setImportType("templates");
    setConflictResolution("merge");
    setCsvContent("");
    setFileName("");
    setPreviewRows([]);
  };

  const handleClose = () => {
    if (step !== "importing") {
      handleReset();
      onOpenChange(false);
    }
  };

  const getImportTypeDescription = (type: ImportType) => {
    switch (type) {
      case "templates":
        return "Prescription templates with medications and instructions";
      case "patients":
        return "Patient connections with contact information";
      case "notes":
        return "Clinical notes for existing patients";
    }
  };

  const getCSVTemplate = (type: ImportType) => {
    switch (type) {
      case "templates":
        return 'template_name,diagnosis,medications,instructions\nCommon Cold,Cold,"[{\\"name\\":\\"Cough Syrup\\",\\"dosage\\":\\"5ml\\"}]",Take with water';
      case "patients":
        return "patient_email,patient_name,specialty,phone,hospital\nrahim@example.com,Majedur Rahman,Cardiology,+8801XXXXXXXXX,Dhaka Medical";
      case "notes":
        return "patient_email,note,is_pinned\nrahim@example.com,Follow-up appointment scheduled for next week,false";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Practice Data</DialogTitle>
          <DialogDescription>Bring your existing practice data into Patient Bio</DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">What would you like to import?</Label>
              <Tabs value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="patients">Patients</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value={importType} className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {importType === "templates"
                          ? "Prescription Templates"
                          : importType === "patients"
                            ? "Patient Connections"
                            : "Clinical Notes"}
                      </CardTitle>
                      <CardDescription>{getImportTypeDescription(importType)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm">CSV Template</Label>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-2">
                          {getCSVTemplate(importType)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div>
              <Label className="mb-3 block">Conflict Resolution</Label>
              <Select value={conflictResolution} onValueChange={(v) => setConflictResolution(v as ConflictResolution)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge (keep existing, add new)</SelectItem>
                  <SelectItem value="replace">Replace (overwrite existing)</SelectItem>
                  <SelectItem value="skip">Skip (ignore existing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("upload")}>Continue</Button>
            </div>
          </div>
        )}

        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              )}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drag and drop your CSV file here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <span>Select File</span>
                </Button>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button disabled={!csvContent} onClick={() => setStep("preview")}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">File: {fileName}</Label>
              <p className="text-xs text-muted-foreground mt-1">{previewRows.length - 1} rows to import</p>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted">
                    {previewRows[0]?.map((header, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(1, 4).map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 truncate">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Preview shows first {Math.min(3, previewRows.length - 1)} rows. All {previewRows.length - 1} rows will
                be imported.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 py-8 text-center">
            <div className="animate-spin mx-auto">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium">Importing your data...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {step === "complete" && importMutation.data && (
          <div className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Import Complete</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {importMutation.data.summary.imported} imported • {importMutation.data.summary.skipped} skipped •{" "}
                    {importMutation.data.summary.errors} errors
                  </p>
                </div>
              </div>
            </div>

            {importMutation.data.summary.errors > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {importMutation.data.summary.errors} records had errors. Check details below.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {importMutation.data.details.slice(0, 10).map((result, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded border">
                  {result.action === "imported" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  {result.action === "skipped" && (
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  )}
                  {result.action === "error" && <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium capitalize">
                      {result.action}: {result.details}
                    </p>
                    {result.error && <p className="text-xs text-muted-foreground">{result.error}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button onClick={handleClose}>Done</Button>
              <Button variant="outline" onClick={handleReset}>
                Import More
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
