import { useState, useRef, useCallback, useMemo } from "react";
import { usePathologistReports, PathologistReport } from "@/hooks/usePathologistReports";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { useDoctorPathologistNotifications } from "@/hooks/useDoctorPathologistNotifications";
import { TemplateSelectionModal } from "@/components/pathologist/TemplateSelectionModal";
import { ReportTemplate } from "@/components/pathologist/reportTemplates";
import { AbnormalFlagEditor, type AbnormalFlag } from "@/components/pathologist/AbnormalFlagEditor";
import { CriticalValueAlertBanner, detectCriticalValues } from "@/components/pathologist/CriticalValueAlertBanner";
import { SaveReportTemplateDialog } from "@/components/pathologist/SaveReportTemplateDialog";
import { BatchReportUploadDialog } from "@/components/pathologist/BatchReportUploadDialog";
import { ReportsDataSummaryStrip } from "@/components/pathologist/ReportsDataSummaryStrip";
import { ReportCardContent } from "@/components/pathologist/ReportCardContent";
import { ReportDiagnosisAnalysisDialog } from "@/components/pathologist/ReportDiagnosisAnalysisCard";
import { useReportDiagnosisAnalysis } from "@/hooks/useReportDiagnosisAnalysis";
import { BulkAnalysisProgressDialog } from "@/components/pathologist/BulkAnalysisProgressDialog";
import { AddAddendumDialog } from "@/components/pathologist/AddAddendumDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditReportDialog } from "@/components/pathologist/EditReportDialog";
import { 
  FileText, 
  Plus, 
  Send, 
  Loader2,
  Share2,
  Upload,
  X,
  File,
  Pencil,
  Heart,
  Microscope,
  AlertTriangle,
  Save,
  Search,
  Users,
  Eye,
  Brain,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";

const reportTypes = [
  { value: "blood_work", label: "Blood Work" },
  { value: "imaging", label: "Imaging" },
  { value: "pathology", label: "Pathology" },
  { value: "microbiology", label: "Microbiology" },
  { value: "cardiology", label: "Cardiology" },
  { value: "other", label: "Other" },
];

const diseaseCategories = [
  { value: "general", label: "General" },
  { value: "cancer", label: "Cancer" },
  { value: "covid19", label: "COVID-19" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "other", label: "Other" },
];

type SharingFilter = "all" | "shared_doctor" | "shared_patient" | "unshared" | "abnormal";

const PathologistReportsPage = () => {
  const { 
    reports, 
    isLoading, 
    createReport, 
    updateReport,
    addAddendum,
    shareWithPatient, 
    deleteReport, 
    isCreating,
    isUpdating,
    isAddingAddendum,
    uploadFile,
    getSignedUrl,
    refetch,
  } = usePathologistReports();
  const { receivedShares } = useDoctorPathologistShares();
  const { notifyDoctorOfCriticalValue } = useDoctorPathologistNotifications();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addendumReport, setAddendumReport] = useState<PathologistReport | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<PathologistReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [reportSearchQuery, setReportSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sharingFilter, setSharingFilter] = useState<SharingFilter>("all");
  
  // AI Analysis
  const {
    analyze,
    isAnalyzing,
    result: analysisResult,
    reset: resetAnalysis,
    saveAnalysis,
    isSaving: isSavingAnalysis,
    bulkAnalyzeReports,
    isBulkAnalyzing,
    bulkProgress,
    cancelBulkAnalysis,
  } = useReportDiagnosisAnalysis();
  const [analyzingReportId, setAnalyzingReportId] = useState<string | null>(null);
  const [analyzingReportName, setAnalyzingReportName] = useState("");
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [analyzingReport, setAnalyzingReport] = useState<PathologistReport | null>(null);

  const handleAiAnalyze = (report: PathologistReport) => {
    setAnalyzingReportId(report.id);
    setAnalyzingReportName(report.report_name);
    setAnalyzingReport(report);
    setIsAnalysisDialogOpen(true);
    analyze(report.id);
  };

  const handleSaveAnalysis = async () => {
    if (!analyzingReportId || !analysisResult) return;
    const success = await saveAnalysis(analyzingReportId, analysisResult);
    if (success) {
      // Refetch reports to update UI
      refetch();
    }
  };

  const handleBulkAnalyze = () => {
    const unanalyzed = reports.filter(
      (r) => r.has_abnormal_values && !r.ai_analysis
    );
    if (unanalyzed.length === 0) {
      toast({ title: "All abnormal reports already analyzed" });
      return;
    }
    setIsBulkDialogOpen(true);
    bulkAnalyzeReports(unanalyzed.map((r) => ({ id: r.id, name: r.report_name }))).then(() => {
      refetch();
    });
  };

  // Summary stats
  const stats = useMemo(() => ({
    total: reports.length,
    sharedWithDoctors: reports.filter(r => r.is_shared_with_doctor).length,
    sharedWithPatients: reports.filter(r => r.is_shared_with_patient).length,
    abnormal: reports.filter(r => r.has_abnormal_values).length,
  }), [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Text search
      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase();
        const matchesSearch =
          r.report_name.toLowerCase().includes(q) ||
          r.report_type?.toLowerCase().includes(q) ||
          r.disease_category?.toLowerCase().includes(q) ||
          r.findings?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      // Type filter
      if (typeFilter !== "all" && r.report_type !== typeFilter) return false;
      // Sharing filter
      if (sharingFilter === "shared_doctor" && !r.is_shared_with_doctor) return false;
      if (sharingFilter === "shared_patient" && !r.is_shared_with_patient) return false;
      if (sharingFilter === "unshared" && (r.is_shared_with_doctor || r.is_shared_with_patient)) return false;
      if (sharingFilter === "abnormal" && !r.has_abnormal_values) return false;
      return true;
    });
  }, [reports, reportSearchQuery, typeFilter, sharingFilter]);

  const { paginatedData, currentPage, totalPages, goToPage, hasNextPage, hasPrevPage } = usePagination({
    data: filteredReports,
    itemsPerPage: 10,
  });

  const [formData, setFormData] = useState({
    patient_id: "",
    report_name: "",
    report_type: "",
    disease_category: "",
    findings: "",
  });
  const [abnormalFlags, setAbnormalFlags] = useState<AbnormalFlag[]>([]);

  const uniquePatients = Array.from(
    new Map(receivedShares.map((s) => [s.patient_id, s])).values()
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSelectTemplate = (template: ReportTemplate) => {
    setFormData({
      patient_id: formData.patient_id,
      report_name: template.name,
      report_type: template.type,
      disease_category: template.category,
      findings: template.findings,
    });
    setIsTemplateModalOpen(false);
    setIsDialogOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let fileUrl: string | undefined;
      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
      }

      createReport({
        patient_id: formData.patient_id,
        report_name: formData.report_name,
        report_type: formData.report_type,
        disease_category: formData.disease_category || undefined,
        findings: formData.findings || undefined,
        file_url: fileUrl,
        abnormal_flags: abnormalFlags,
      }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setFormData({ patient_id: "", report_name: "", report_type: "", disease_category: "", findings: "" });
          setSelectedFile(null);
          setAbnormalFlags([]);
        },
      });
    } catch (error) {
      console.error("Error creating report:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewReport = async (report: PathologistReport) => {
    if (!report.file_url) {
      toast.error("No file attached to this report");
      return;
    }
    setViewingReportId(report.id);
    try {
      const url = await getSignedUrl(report.file_url);
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error("Failed to generate download link");
      }
    } catch {
      toast.error("Failed to view report");
    } finally {
      setViewingReportId(null);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <FileText className="h-8 w-8 text-primary" />;
    }
    return <File className="h-8 w-8 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="p-4 rounded-2xl diagnostic-gradient">
          <Microscope className="h-8 w-8 text-white animate-pulse" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--diagnostic-primary))]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cross-page summary strip */}
      <ReportsDataSummaryStrip />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl diagnostic-gradient">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              My Reports
              {reports.length > 0 && (
                <span className="text-lg font-normal text-muted-foreground ml-2">({reports.length})</span>
              )}
            </h1>
            <p className="text-muted-foreground flex items-center gap-1">
              <Heart className="h-4 w-4" />
              Each report helps a patient on their journey
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsBatchUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" /> Batch Upload
          </Button>
          <Button onClick={() => setIsTemplateModalOpen(true)} className="diagnostic-gradient text-white hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" /> Start New Report
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="diagnostic-stat-card border-teal-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSharingFilter("all")}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card border-green-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSharingFilter("shared_doctor")}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Share2 className="h-3 w-3" /> Shared w/ Doctors
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{stats.sharedWithDoctors}</div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card border-blue-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSharingFilter("shared_patient")}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Shared w/ Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold text-blue-600">{stats.sharedWithPatients}</div>
          </CardContent>
        </Card>
        <Card className="diagnostic-stat-card border-red-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSharingFilter("abnormal")}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Abnormal Flagged
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-600">{stats.abnormal}</div>
              {stats.abnormal > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-6 px-2 gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBulkAnalyze();
                  }}
                  disabled={isBulkAnalyzing}
                >
                  <Brain className="h-3 w-3" />
                  Bulk AI
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={reportSearchQuery}
            onChange={(e) => setReportSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Type filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant={typeFilter === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTypeFilter("all")}
          >
            All Types
          </Badge>
          {reportTypes.map((t) => (
            <Badge
              key={t.value}
              variant={typeFilter === t.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTypeFilter(typeFilter === t.value ? "all" : t.value)}
            >
              {t.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sharing filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([
          { key: "all", label: "All" },
          { key: "shared_doctor", label: "Shared w/ Doctors" },
          { key: "shared_patient", label: "Shared w/ Patients" },
          { key: "unshared", label: "Unshared" },
          { key: "abnormal", label: "Abnormal" },
        ] as { key: SharingFilter; label: string }[]).map((f) => (
          <Badge
            key={f.key}
            variant={sharingFilter === f.key ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSharingFilter(f.key)}
          >
            {f.label}
            {f.key !== "all" && (
              <span className="ml-1 opacity-70">
                {f.key === "shared_doctor" ? stats.sharedWithDoctors :
                 f.key === "shared_patient" ? stats.sharedWithPatients :
                 f.key === "unshared" ? stats.total - stats.sharedWithDoctors - stats.sharedWithPatients + reports.filter(r => r.is_shared_with_doctor && r.is_shared_with_patient).length :
                 f.key === "abnormal" ? stats.abnormal : ""}
              </span>
            )}
          </Badge>
        ))}
      </div>

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Save Report Template Dialog */}
      <SaveReportTemplateDialog
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        reportName={formData.report_name}
        reportType={formData.report_type}
        diseaseCategory={formData.disease_category}
        findings={formData.findings}
      />

      {/* Create Report Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Report</DialogTitle>
            <DialogDescription>
              {formData.report_name ? `Using template: ${formData.report_name}` : "Create a diagnostic report for a patient"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              {uniquePatients.length > 0 ? (
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniquePatients.map((share) => (
                      <SelectItem key={share.patient_id} value={share.patient_id}>
                        Patient {share.patient_id.substring(0, 8).toUpperCase()}
                        {share.disease_category && ` (${share.disease_category})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  placeholder="Enter patient UUID"
                  required
                />
              )}
              <p className="text-xs text-muted-foreground">
                {uniquePatients.length > 0 ? "Select from patients referred by doctors" : "Enter the patient's UUID directly"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report_name">Report Name *</Label>
              <Input
                id="report_name"
                value={formData.report_name}
                onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                placeholder="Complete Blood Count"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Report Type *</Label>
              <Select
                value={formData.report_type}
                onValueChange={(value) => setFormData({ ...formData, report_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Disease Category</Label>
              <Select
                value={formData.disease_category}
                onValueChange={(value) => setFormData({ ...formData, disease_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {diseaseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Attach Report File</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon(selectedFile)}
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG, DOC (max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                id="findings"
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                placeholder="Enter diagnostic findings..."
                rows={4}
              />
            </div>

            <AbnormalFlagEditor flags={abnormalFlags} onChange={setAbnormalFlags} />

            <CriticalValueAlertBanner
              flags={abnormalFlags}
              doctorId={(() => {
                const share = receivedShares.find(s => s.patient_id === formData.patient_id);
                return share?.doctor_id || null;
              })()}
              onNotifyDoctor={async () => {
                const share = receivedShares.find(s => s.patient_id === formData.patient_id);
                if (!share?.doctor_id) return;
                const criticals = detectCriticalValues(abnormalFlags);
                const criticalNames = criticals.map(c => `${c.flag.name}: ${c.flag.value} ${c.flag.unit}`).join(", ");
                await notifyDoctorOfCriticalValue(
                  share.doctor_id,
                  formData.patient_id,
                  formData.report_name || "Lab Report",
                  criticalNames
                );
              }}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-shrink-0"
                disabled={!formData.report_name || !formData.findings}
                onClick={() => setIsSaveTemplateOpen(true)}
              >
                <Save className="h-4 w-4 mr-1" />
                Save Template
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreating || isUploading || !formData.patient_id || !formData.report_name}
              >
                {isCreating || isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isUploading ? "Uploading..." : "Creating..."}
                  </>
                ) : (
                  "Create Report"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Cards */}
      {filteredReports.length === 0 ? (
        <Card className="diagnostic-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--diagnostic-primary)/0.1)] flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-[hsl(var(--diagnostic-primary))]" />
            </div>
            <h3 className="font-semibold text-lg">
              {reportSearchQuery || typeFilter !== "all" || sharingFilter !== "all" ? "No matching reports" : "Your Reports Will Appear Here"}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-md">
              {reportSearchQuery || typeFilter !== "all" || sharingFilter !== "all"
                ? "Try adjusting your filters"
                : "Each diagnostic report you create helps a patient understand their health better."}
            </p>
            {!reportSearchQuery && typeFilter === "all" && sharingFilter === "all" && (
              <Button onClick={() => setIsTemplateModalOpen(true)} className="mt-6 diagnostic-gradient text-white hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" /> Create Your First Report
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedData.map((report) => (
              <Card key={report.id} className="diagnostic-card">
                <ReportCardContent
                  report={report}
                  viewingReportId={viewingReportId}
                  onViewReport={handleViewReport}
                  onEditReport={setEditingReport}
                  onShareWithPatient={(id) => shareWithPatient(id)}
                  onDeleteReport={(id) => deleteReport(id)}
                  onAddAddendum={setAddendumReport}
                  onAiAnalyze={handleAiAnalyze}
                  isAnalyzing={isAnalyzing}
                  analyzingReportId={analyzingReportId}
                />
              </Card>
            ))}
          </div>
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
          />
        </>
      )}

      {/* Edit Report Dialog */}
      {editingReport && (
        <EditReportDialog
          open={!!editingReport}
          onOpenChange={(open) => !open && setEditingReport(null)}
          report={editingReport}
          onUpdate={(reportId, data) => {
            updateReport(
              { reportId, data },
              { onSuccess: () => setEditingReport(null) }
            );
          }}
          uploadFile={uploadFile}
          isUpdating={isUpdating}
        />
      )}
      <BatchReportUploadDialog open={isBatchUploadOpen} onOpenChange={setIsBatchUploadOpen} />
      
      {/* Add Addendum Dialog */}
      <AddAddendumDialog
        open={!!addendumReport}
        onOpenChange={(open) => !open && setAddendumReport(null)}
        report={addendumReport}
        onSubmit={(reportId, text) => {
          addAddendum(
            { reportId, text },
            { onSuccess: () => setAddendumReport(null) }
          );
        }}
        isSubmitting={isAddingAddendum}
      />

      {/* AI Diagnosis Analysis Dialog */}
      <ReportDiagnosisAnalysisDialog
        open={isAnalysisDialogOpen}
        onOpenChange={(open) => {
          setIsAnalysisDialogOpen(open);
          if (!open) {
            resetAnalysis();
            setAnalyzingReportId(null);
            setAnalyzingReport(null);
          }
        }}
        isAnalyzing={isAnalyzing}
        result={analysisResult}
        reportName={analyzingReportName}
        onSave={handleSaveAnalysis}
        isSaving={isSavingAnalysis}
        savedAnalysis={analyzingReport?.ai_analysis}
      />

      {/* Bulk Analysis Progress Dialog */}
      <BulkAnalysisProgressDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        progress={bulkProgress}
        isAnalyzing={isBulkAnalyzing}
        onCancel={cancelBulkAnalysis}
      />
    </div>
  );
};

export default PathologistReportsPage;
