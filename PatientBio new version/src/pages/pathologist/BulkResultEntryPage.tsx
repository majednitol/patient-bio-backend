import { useState, useRef } from "react";
import { LabOperationsSummaryStrip } from "@/components/pathologist/LabOperationsSummaryStrip";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Upload,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  ClipboardList,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BulkEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  reportName: string;
  reportType: string;
  findings: string;
  diseaseCategory: string;
  status: "draft" | "submitting" | "success" | "error";
  error?: string;
}

const REPORT_TYPES = ["Blood Test", "Urine Analysis", "Biopsy", "Imaging", "Microbiology", "Histopathology", "Cytology", "Other"];
const DISEASE_CATEGORIES = ["Cardiology", "Neurology", "Oncology", "Orthopedics", "Gastroenterology", "Endocrinology", "Hematology", "General", "Other"];

function createEmptyEntry(): BulkEntry {
  return {
    id: crypto.randomUUID(),
    patientId: "",
    patientName: "",
    patientEmail: "",
    reportName: "",
    reportType: "Blood Test",
    findings: "",
    diseaseCategory: "General",
    status: "draft",
  };
}

function parseCSV(text: string): Partial<BulkEntry>[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  
  return lines.slice(1).map((line) => {
    // Simple CSV parser handling quoted fields
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += char;
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });

    return {
      id: crypto.randomUUID(),
      patientEmail: row["patient_email"] || "",
      reportName: row["report_name"] || "",
      reportType: REPORT_TYPES.includes(row["report_type"] || "") ? row["report_type"] : "Blood Test",
      diseaseCategory: DISEASE_CATEGORIES.includes(row["disease_category"] || "") ? row["disease_category"] : "General",
      findings: row["findings"] || "",
      patientId: "",
      patientName: "",
      status: "draft" as const,
    };
  });
}

function downloadTemplate() {
  const csv = "patient_email,report_name,report_type,disease_category,findings\nrahim@example.com,CBC Report,Blood Test,Hematology,\"WBC: 7.2, RBC: 4.8, Hgb: 14.2\"";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bulk_results_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const BulkResultEntryPage = () => {
  const { user } = useAuth();
  const { createReport } = usePathologistReports();
  const [entries, setEntries] = useState<BulkEntry[]>([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [resolvedPatients, setResolvedPatients] = useState<Record<string, string>>({});
  const [touchedEntries, setTouchedEntries] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEntry = () => setEntries((prev) => [...prev, createEmptyEntry()]);
  const clearAll = () => {
    setEntries([createEmptyEntry()]);
    setResolvedPatients({});
    setTouchedEntries(new Set());
  };

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof BulkEntry, value: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    setTouchedEntries((prev) => new Set(prev).add(id));
  };

  // Duplicate detection: same patient email + report name
  const getDuplicateWarning = (entry: BulkEntry): string | null => {
    if (!entry.patientEmail || !entry.reportName) return null;
    const dupes = entries.filter(
      (e) => e.id !== entry.id && e.patientEmail === entry.patientEmail && e.reportName === entry.reportName
    );
    return dupes.length > 0 ? "Duplicate: same patient + report name" : null;
  };

  // Inline validation: required field empty when other fields in row are filled
  const isFieldInvalid = (entry: BulkEntry, field: "patientEmail" | "reportName" | "findings"): boolean => {
    if (!touchedEntries.has(entry.id)) return false;
    const hasAnyData = entry.patientEmail || entry.reportName || entry.findings;
    if (!hasAnyData) return false;
    return !entry[field];
  };

  const resolvePatient = async (entryId: string, email: string) => {
    if (!email.includes("@")) return;
    const { data } = await supabase.rpc("get_user_id_by_email", { p_email: email });
    if (data) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name")
        .eq("user_id", data)
        .single();
      updateEntry(entryId, "patientId", data);
      updateEntry(entryId, "patientName", profile?.display_name || email);
      setResolvedPatients((prev) => ({ ...prev, [entryId]: profile?.display_name || email }));
    } else {
      toast({ title: "Patient not found", description: `No user found with email: ${email}`, variant: "destructive" });
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCSV(text);

    if (parsed.length === 0) {
      toast({ title: "Invalid CSV", description: "No valid rows found. Check the format.", variant: "destructive" });
      return;
    }

    const newEntries = parsed.map((p) => ({
      ...createEmptyEntry(),
      ...p,
      id: p.id || crypto.randomUUID(),
    })) as BulkEntry[];

    setEntries((prev) => [...prev.filter((e) => e.patientId || e.reportName || e.findings), ...newEntries]);

    toast({ title: `${newEntries.length} rows imported`, description: "Resolve patient emails to proceed." });

    // Auto-resolve emails
    for (const entry of newEntries) {
      if (entry.patientEmail) {
        await resolvePatient(entry.id, entry.patientEmail);
      }
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validEntries = entries.filter(
    (e) => e.patientId && e.reportName && e.findings
  );

  const handleBulkSubmit = async () => {
    if (validEntries.length === 0) {
      toast({ title: "No valid entries", description: "Fill in patient, report name, and findings for at least one entry.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);

    for (let i = 0; i < validEntries.length; i++) {
      const entry = validEntries[i];
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "submitting" } : e)));

      try {
        await new Promise<void>((resolve, reject) => {
          createReport(
            {
              patient_id: entry.patientId,
              report_name: entry.reportName,
              report_type: entry.reportType,
              findings: entry.findings,
              disease_category: entry.diseaseCategory,
            },
            {
              onSuccess: () => {
                setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "success" } : e)));
                resolve();
              },
              onError: (error: any) => {
                setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "error", error: error.message } : e)));
                resolve();
              },
            }
          );
        });
      } catch {
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: "error", error: "Unexpected error" } : e)));
      }

      setSubmitProgress(Math.round(((i + 1) / validEntries.length) * 100));
    }

    setIsSubmitting(false);

    const successCount = entries.filter((e) => e.status === "success").length;
    if (successCount > 0) {
      toast({ title: `${successCount} report(s) created`, description: "Bulk result entry complete." });
    }
  };

  const successCount = entries.filter((e) => e.status === "success").length;
  const errorCount = entries.filter((e) => e.status === "error").length;

  return (
    <div className="space-y-6">
      <LabOperationsSummaryStrip />

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-[hsl(var(--diagnostic-primary))]" />
            Bulk Result Entry
          </h1>
          <p className="text-muted-foreground mt-1">
            Enter results for multiple samples at once
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ClipboardList className="h-3 w-3" />
            {entries.length} entries · {validEntries.length} valid
          </Badge>
        </div>
      </div>

      {/* Progress Bar during submission */}
      {isSubmitting && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Submitting reports...</span>
            <span>{submitProgress}%</span>
          </div>
          <Progress value={submitProgress} className="h-2" />
        </div>
      )}

      {/* Entries */}
      <div className="space-y-4">
        {entries.map((entry, index) => {
          const dupeWarning = getDuplicateWarning(entry);
          return (
            <Card
              key={entry.id}
              className={`transition-colors ${
                entry.status === "success"
                  ? "border-[hsl(var(--diagnostic-accent))] bg-[hsl(var(--diagnostic-accent)/0.05)]"
                  : entry.status === "error"
                  ? "border-destructive bg-destructive/5"
                  : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">#{index + 1}</span>
                    {entry.status === "success" && <Badge className="bg-[hsl(var(--diagnostic-accent)/0.15)] text-[hsl(var(--diagnostic-accent))] text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Saved</Badge>}
                    {entry.status === "error" && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-3 w-3 mr-1" />{entry.error}</Badge>}
                    {entry.status === "submitting" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    {resolvedPatients[entry.id] && <Badge variant="secondary" className="text-[10px]">{resolvedPatients[entry.id]}</Badge>}
                    {dupeWarning && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                        <AlertCircle className="h-3 w-3 mr-1" />{dupeWarning}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeEntry(entry.id)}
                    disabled={entries.length <= 1 || entry.status === "submitting"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Patient Email *</Label>
                    <Input
                      placeholder="patient@email.com"
                      className={`h-8 text-xs ${isFieldInvalid(entry, "patientEmail") ? "border-destructive" : ""}`}
                      value={entry.patientEmail}
                      onChange={(e) => updateEntry(entry.id, "patientEmail", e.target.value)}
                      disabled={entry.status !== "draft"}
                      onBlur={(e) => resolvePatient(entry.id, e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Report Name *</Label>
                    <Input
                      value={entry.reportName}
                      onChange={(e) => updateEntry(entry.id, "reportName", e.target.value)}
                      placeholder="CBC Report"
                      className={`h-8 text-xs ${isFieldInvalid(entry, "reportName") ? "border-destructive" : ""}`}
                      disabled={entry.status !== "draft"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Report Type</Label>
                    <Select
                      value={entry.reportType}
                      onValueChange={(v) => updateEntry(entry.id, "reportType", v)}
                      disabled={entry.status !== "draft"}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Category</Label>
                    <Select
                      value={entry.diseaseCategory}
                      onValueChange={(v) => updateEntry(entry.id, "diseaseCategory", v)}
                      disabled={entry.status !== "draft"}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DISEASE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Findings *</Label>
                  <Textarea
                    value={entry.findings}
                    onChange={(e) => updateEntry(entry.id, "findings", e.target.value)}
                    placeholder="Enter test results and observations..."
                    rows={2}
                    className={`text-xs resize-none ${isFieldInvalid(entry, "findings") ? "border-destructive" : ""}`}
                    disabled={entry.status !== "draft"}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addEntry} disabled={isSubmitting}>
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
          <Button variant="outline" onClick={clearAll} disabled={isSubmitting}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
            <Upload className="h-4 w-4 mr-1" />
            Upload CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVUpload}
          />
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            Download Template
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {successCount > 0 && (
            <span className="text-xs text-[hsl(var(--diagnostic-accent))]">{successCount} saved</span>
          )}
          {errorCount > 0 && (
            <span className="text-xs text-destructive">{errorCount} failed</span>
          )}
          <Button
            onClick={handleBulkSubmit}
            disabled={isSubmitting || validEntries.length === 0}
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Submitting...</>
            ) : (
              <><Send className="h-4 w-4 mr-1" />Submit {validEntries.length} Report(s)</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkResultEntryPage;
