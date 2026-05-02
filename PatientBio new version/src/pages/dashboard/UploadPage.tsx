import { useState, useCallback, useEffect, useRef } from "react";
import { OfflineUnavailable } from "@/components/pwa/OfflineUnavailable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileImage, FileText, X, Loader2, CheckCircle, Camera, AlertCircle, Eye, ArrowRight, Sparkles, PartyPopper, ShieldCheck } from "lucide-react";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { Constants } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ProvenanceTimelineCard } from "@/components/dashboard/ProvenanceTimeline";
import { useTranslation } from "react-i18next";
import { ConfettiBurst } from "@/components/ui/ConfettiBurst";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ClinicalExtractionReview } from "@/components/clinical/ClinicalExtractionReview";
import { useAuth } from "@/contexts/AuthContext";
import { getICD11ChapterCode, getICD11ChapterByCode } from "@/lib/icd11-mapping";

const UploadPage = () => {
  const { t } = useTranslation();
  const { createRecord, isCreating, uploadProgress, records } = useHealthRecords();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [clinicalExtraction, setClinicalExtraction] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [ocrResult, setOcrResult] = useState<{
    overall_confidence?: number;
    abnormal_flags?: any[];
    field_confidences?: Record<string, number>;
    auto_saved_tables?: string[];
  } | null>(null);
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileValid, setFileValid] = useState<boolean | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [detectedFields, setDetectedFields] = useState<Set<string>>(new Set());
  const [autoDetectConfidence, setAutoDetectConfidence] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("prescription");
  const [diseaseCategory, setDiseaseCategory] = useState<string>("general");
  const [providerName, setProviderName] = useState("");
  const [recordDate, setRecordDate] = useState("");

  // Recent uploads (last 5)
  const recentRecords = records.slice(0, 5);

  // Listen for FAB events to trigger file picker / camera
  useEffect(() => {
    const handleFabUpload = () => {
      document.getElementById("file-input")?.click();
    };
    const handleFabCamera = () => {
      document.getElementById("camera-input")?.click();
    };
    window.addEventListener("fab-upload-record", handleFabUpload);
    window.addEventListener("fab-upload-camera", handleFabCamera);
    return () => {
      window.removeEventListener("fab-upload-record", handleFabUpload);
      window.removeEventListener("fab-upload-camera", handleFabCamera);
    };
  }, []);

  const triggerAutoDetect = useCallback(async (file: File, previewDataUrl?: string) => {
    setAutoDetecting(true);
    setDetectedFields(new Set());
    setAutoDetectConfidence(null);
    
    // Cancel any previous detection
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const isImage = file.type.startsWith("image/");
      let imageBase64: string | undefined;

      if (isImage && previewDataUrl && file.size < 4 * 1024 * 1024) {
        // Strip the data:image/...;base64, prefix
        imageBase64 = previewDataUrl.split(",")[1];
      }

      const { data, error } = await supabase.functions.invoke("extract-document-metadata", {
        body: { fileName: file.name, fileType: file.type, imageBase64 },
      });

      if (controller.signal.aborted) return;

      if (error || !data) {
        console.log("Auto-detect failed (graceful):", error);
        return;
      }

      if (data.confidence < 30) {
        console.log("Auto-detect low confidence, skipping:", data.confidence);
        return;
      }

      const filled = new Set<string>();
      if (data.title) { setTitle(data.title); filled.add("title"); }
      if (data.category) { setCategory(data.category); filled.add("category"); }
      if (data.diseaseCategory) { setDiseaseCategory(data.diseaseCategory); filled.add("diseaseCategory"); }
      if (data.providerName) { setProviderName(data.providerName); filled.add("providerName"); }
      if (data.recordDate) { setRecordDate(data.recordDate); filled.add("recordDate"); }
      
      setDetectedFields(filled);
      setAutoDetectConfidence(data.confidence);
    } catch (e) {
      if (!controller.signal.aborted) {
        console.log("Auto-detect error (graceful):", e);
      }
    } finally {
      if (!controller.signal.aborted) {
        setAutoDetecting(false);
      }
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setFileValid(false);
      toast({
        title: t("uploadPage.invalidFileType"),
        description: t("uploadPage.invalidFileTypeDesc"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFileValid(false);
      toast({
        title: t("uploadPage.fileTooLarge"),
        description: t("uploadPage.fileTooLargeDesc"),
        variant: "destructive",
      });
      return;
    }

    setFileValid(true);
    setSelectedFile(file);
    setShowSuccess(false);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        // Trigger auto-detect with image data
        triggerAutoDetect(file, dataUrl);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
      // Trigger auto-detect with filename only
      triggerAutoDetect(file);
    }
  }, [t, triggerAutoDetect]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setFileValid(null);
    setAutoDetecting(false);
    setDetectedFields(new Set());
    setAutoDetectConfidence(null);
    abortControllerRef.current?.abort();
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setFileValid(null);
    setTitle("");
    setDescription("");
    setCategory("prescription");
    setDiseaseCategory("general");
    setProviderName("");
    setRecordDate("");
    setAutoDetecting(false);
    setDetectedFields(new Set());
    setAutoDetectConfidence(null);
    abortControllerRef.current?.abort();
  };

  const triggerClinicalExtraction = useCallback(async (recordId?: string) => {
    if (!preview && !selectedFile) return;
    setExtracting(true);
    setOcrResult(null);
    try {
      const body: any = {
        document_title: title || selectedFile?.name || "document",
        document_category: category,
        auto_save: true, // Auto-save extracted data
        record_id: recordId || undefined,
      };
      if (preview) {
        body.image_base64 = preview.split(",")[1];
        body.mime_type = selectedFile?.type || "image/jpeg";
      }
      const { data, error } = await supabase.functions.invoke("extract-clinical-from-document", { body });
      if (error || !data?.extracted) {
        console.log("Clinical extraction: no data found or error", error);
        return;
      }
      
      setOcrResult({
        overall_confidence: data.overall_confidence,
        abnormal_flags: data.abnormal_flags,
        field_confidences: data.field_confidences,
        auto_saved_tables: data.auto_saved_tables,
      });

      // Show auto-save result as toast
      if (data.auto_saved_tables?.length > 0) {
        toast({
          title: t("clinicalRecords.auto.autoSaved", "Clinical data auto-saved!"),
          description: `${data.auto_saved_tables.length} ${t("clinicalRecords.auto.sectionsUpdated", "sections updated from your document")}`,
        });
        if (recordId) setLastSavedRecordId(recordId);
      }

      // Show abnormal alerts
      if (data.abnormal_flags?.length > 0) {
        const criticalFlags = data.abnormal_flags.filter((f: any) => f.severity === "critical" || f.severity === "high");
        if (criticalFlags.length > 0) {
          toast({
            title: `⚠️ ${criticalFlags.length} ${t("clinicalRecords.auto.abnormalValues", "abnormal values detected")}`,
            description: criticalFlags.map((f: any) => `${f.field}: ${f.value} (${f.reason})`).join(", "),
            variant: "destructive",
          });
        }
      }

      // Still set extraction for review of low-confidence items
      const lowConfFields = Object.entries(data.field_confidences || {}).filter(([, v]) => (v as number) < 50);
      if (lowConfFields.length > 0) {
        setClinicalExtraction(data.extracted);
      }
    } catch (e) {
      console.log("Clinical extraction failed (graceful):", e);
    } finally {
      setExtracting(false);
    }
  }, [preview, selectedFile, title, category, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !title.trim()) return;

    createRecord(
      {
        file: selectedFile,
        metadata: {
          title: title.trim(),
          description: description.trim() || null,
          category: category as "prescription" | "lab_result" | "imaging" | "vaccination" | "other",
          disease_category: diseaseCategory as "general" | "cancer" | "covid19" | "diabetes" | "heart_disease" | "other",
          provider_name: providerName.trim() || null,
          record_date: recordDate || null,
        },
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
          // Trigger clinical extraction in background
          triggerClinicalExtraction();
          resetForm();
        },
      }
    );
  };

  const recordCategories = Constants.public.Enums.record_category;
  const diseaseCategories = Constants.public.Enums.disease_category;

  // Success state view
  if (showSuccess) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Card className="border-primary/20 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden">
          <ConfettiBurst trigger={showSuccess} />
          {/* Decorative top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-10 relative">
            <div className="text-center space-y-5 max-w-md mx-auto">
              {/* Animated icon stack */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <CheckCircle className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center shadow-sm">
                  <PartyPopper className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>

              {/* Title + message */}
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {t("uploadPage.uploadSuccessful")} 🎉
                </h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                  {t("uploadPage.recordSavedSecurely")}
                </p>
              </div>

              {/* Security badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/15 text-xs text-primary font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("uploadPage.encryptedAndSecure", "Encrypted & securely stored")}
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3 w-full">
                <Button asChild variant="outline" size="lg" className="group rounded-full border-2 px-6">
                  <Link to="/dashboard/prescriptions">
                    {t("uploadPage.viewInRecords")}
                  </Link>
                </Button>
                <Button onClick={() => setShowSuccess(false)} size="lg" className="rounded-full px-6 shadow-lg shadow-primary/25">
                  {t("uploadPage.uploadAnother")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OCR Status */}
        {extracting && (
          <div className="flex items-center gap-2 p-4 rounded-xl border bg-card">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{t("clinicalRecords.auto.analyzing", "Analyzing document for clinical data...")}</span>
          </div>
        )}

        {/* OCR Confidence & Results Summary */}
        {ocrResult && !extracting && (
          <Card className="border-primary/20">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{t("clinicalRecords.auto.ocrResults", "AI Extraction Results")}</span>
                {ocrResult.overall_confidence != null && (
                  <Badge variant={ocrResult.overall_confidence >= 70 ? "default" : ocrResult.overall_confidence >= 40 ? "secondary" : "destructive"} className="text-[10px]">
                    {ocrResult.overall_confidence}% {t("clinicalRecords.auto.confidence", "confidence")}
                  </Badge>
                )}
              </div>

              {ocrResult.auto_saved_tables && ocrResult.auto_saved_tables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {ocrResult.auto_saved_tables.map((table) => (
                    <Badge key={table} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                      <CheckCircle className="h-2.5 w-2.5 mr-1" />
                      {table}
                    </Badge>
                  ))}
                </div>
              )}

              {ocrResult.abnormal_flags && ocrResult.abnormal_flags.length > 0 && (
                <div className="space-y-1.5">
                  {ocrResult.abnormal_flags.map((flag: any, i: number) => (
                    <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded border ${
                      flag.severity === 'critical' || flag.severity === 'high'
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium">{flag.field}:</span>
                      <span>{flag.value}</span>
                      <span className="text-muted-foreground">— {flag.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Low-confidence review (only shown when items need manual review) */}
        {clinicalExtraction && !extracting && (
          <ClinicalExtractionReview
            data={clinicalExtraction}
            documentTitle={title || "Uploaded document"}
            onSaved={() => setClinicalExtraction(null)}
            onDismiss={() => setClinicalExtraction(null)}
          />
        )}
      </div>
    );
  }

  return (
    <OfflineUnavailable isOnline={isOnline}>
    <div className="space-y-4 sm:space-y-6 lg:space-y-0 desktop-sidebar">
      <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            {t("uploadPage.uploadHealthRecord")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {t("uploadPage.uploadDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Upload area */}
            <div
              className={`border-2 border-dashed rounded-xl p-3 sm:p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : selectedFile
                  ? fileValid
                    ? "border-primary bg-primary/5"
                    : "border-destructive bg-destructive/5"
                  : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-3 sm:space-y-4">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-36 sm:max-h-48 mx-auto rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {fileValid ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    ) : (
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                    )}
                    <span className="font-medium text-sm sm:text-base truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("uploadPage.remove")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">{t("uploadPage.dropFilesHere")}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    {t("uploadPage.supportsFiles")}
                  </p>
                  
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
                    <input
                      id="file-input"
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                      onChange={handleInputChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => document.getElementById("file-input")?.click()}
                    >
                      <FileImage className="h-4 w-4 mr-2" />
                      {t("uploadPage.chooseFile")}
                    </Button>
                    
                    {isMobile && (
                      <>
                        <input
                          id="camera-input"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          capture="environment"
                          onChange={handleInputChange}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById("camera-input")?.click()}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {t("uploadPage.takePhoto")}
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Auto-detect status */}
            {autoDetecting && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-primary font-medium">Analyzing document...</span>
              </div>
            )}

            {autoDetectConfidence !== null && !autoDetecting && detectedFields.size > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI auto-detected {detectedFields.size} fields</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {autoDetectConfidence}% confidence
                </Badge>
              </div>
            )}

            {/* Upload progress */}
            {isCreating && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t("uploadPage.uploading")}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Form fields */}
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-1.5">
                  {t("uploadPage.title")}
                  {detectedFields.has("title") && <Sparkles className="h-3 w-3 text-primary" />}
                </Label>
                <Input
                  id="title"
                  placeholder={t("uploadPage.titlePlaceholder")}
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setDetectedFields(prev => { const n = new Set(prev); n.delete("title"); return n; }); }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="flex items-center gap-1.5">
                    {t("uploadPage.recordType")}
                    {detectedFields.has("category") && <Sparkles className="h-3 w-3 text-primary" />}
                  </Label>
                  <Select value={category} onValueChange={(v) => { setCategory(v); setDetectedFields(prev => { const n = new Set(prev); n.delete("category"); return n; }); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("uploadPage.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {recordCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="disease-category" className="flex items-center gap-1.5">
                    {t("uploadPage.diseaseCategory")}
                    {detectedFields.has("diseaseCategory") && <Sparkles className="h-3 w-3 text-primary" />}
                  </Label>
                  <Select value={diseaseCategory} onValueChange={(v) => { setDiseaseCategory(v); setDetectedFields(prev => { const n = new Set(prev); n.delete("diseaseCategory"); return n; }); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("uploadPage.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {diseaseCategories.map((cat) => {
                        const chapterCode = getICD11ChapterCode(cat);
                        const chapterInfo = chapterCode ? getICD11ChapterByCode(chapterCode) : null;
                        return (
                          <SelectItem key={cat} value={cat}>
                            <span className="flex items-center gap-2">
                              {cat === "covid19" ? "COVID-19" : cat.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              {chapterInfo && (
                                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  ICD-11: {chapterInfo.code}
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const chapterCode = getICD11ChapterCode(diseaseCategory);
                    const chapterInfo = chapterCode ? getICD11ChapterByCode(chapterCode) : null;
                    return chapterInfo ? (
                      <p className="text-[11px] text-muted-foreground">
                        ICD-11 Chapter: <span className="font-mono font-medium text-foreground">{chapterInfo.code}</span> — {chapterInfo.description}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider" className="flex items-center gap-1.5">
                    {t("uploadPage.providerName")}
                    {detectedFields.has("providerName") && <Sparkles className="h-3 w-3 text-primary" />}
                  </Label>
                  <Input
                    id="provider"
                    placeholder={t("uploadPage.providerPlaceholder")}
                    value={providerName}
                    onChange={(e) => { setProviderName(e.target.value); setDetectedFields(prev => { const n = new Set(prev); n.delete("providerName"); return n; }); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="record-date" className="flex items-center gap-1.5">
                    {t("uploadPage.recordDate")}
                    {detectedFields.has("recordDate") && <Sparkles className="h-3 w-3 text-primary" />}
                  </Label>
                  <Input
                    id="record-date"
                    type="date"
                    value={recordDate}
                    onChange={(e) => { setRecordDate(e.target.value); setDetectedFields(prev => { const n = new Set(prev); n.delete("recordDate"); return n; }); }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("uploadPage.notesOptional")}</Label>
                <Textarea
                  id="description"
                  placeholder={t("uploadPage.notesPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-secondary border-0 touch-target"
              disabled={!selectedFile || !title.trim() || isCreating || !fileValid}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("uploadPage.uploading")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("uploadPage.uploadRecord")}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>

      {/* Right Column: Recent Uploads + Provenance */}
      <div className="space-y-4 sm:space-y-6">
        {recentRecords.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("uploadPage.recentUploads")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {record.file_type?.startsWith("image/") ? (
                      <FileImage className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{record.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.uploaded_at
                        ? format(new Date(record.uploaded_at), "MMM d, yyyy")
                        : "Unknown date"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/dashboard/prescriptions">
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full" asChild>
                <Link to="/dashboard/prescriptions">
                  {t("uploadPage.viewAllRecords")}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Data Provenance Timeline */}
        <ProvenanceTimelineCard
          title="Import History"
          resourceType="health_records"
          limit={5}
        />
      </div>
    </div>
    </OfflineUnavailable>
  );
};

export default UploadPage;
