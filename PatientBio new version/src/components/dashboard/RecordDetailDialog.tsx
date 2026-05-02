import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Calendar, User, Tag, ExternalLink, Download, Trash2, Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { ICD11ChapterBadge } from "@/components/ui/ICD11ChapterBadge";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { AISummaryDialog } from "./AISummaryDialog";

type HealthRecord = Tables<"health_records">;

interface RecordDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: HealthRecord | null;
  signedUrl?: string | null;
  onGetSignedUrl?: () => Promise<string | null>;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const RecordDetailDialog = ({
  open, onOpenChange, record, signedUrl: externalSignedUrl, onGetSignedUrl, onDelete, isDeleting,
}: RecordDetailDialogProps) => {
  const { t } = useTranslation();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const prevRecordIdRef = useRef<string | null>(null);
  const ownedBlobUrlRef = useRef<string | null>(null);

  // Revoke any blob URL we own
  const revokeOwnedUrl = useCallback(() => {
    if (ownedBlobUrlRef.current) {
      URL.revokeObjectURL(ownedBlobUrlRef.current);
      ownedBlobUrlRef.current = null;
    }
  }, []);

  // Track if URL is a blob we created (not external)
  const trackUrl = useCallback((url: string | null) => {
    // Don't revoke external URLs
    revokeOwnedUrl();
    if (url?.startsWith("blob:")) {
      ownedBlobUrlRef.current = url;
    }
  }, [revokeOwnedUrl]);

  // Reset state when record changes or dialog closes
  useEffect(() => {
    const currentId = record?.id ?? null;
    if (currentId !== prevRecordIdRef.current || !open) {
      revokeOwnedUrl();
      setSignedUrl(null);
      setLoadError(null);
      setIsLoading(false);
      prevRecordIdRef.current = currentId;
    }
  }, [record?.id, open, revokeOwnedUrl]);

  // Fetch URL when dialog opens or record changes
  useEffect(() => {
    if (!open || !record) return;

    if (externalSignedUrl) {
      setSignedUrl(externalSignedUrl);
      return;
    }

    if (onGetSignedUrl) {
      setIsLoading(true);
      setLoadError(null);
      onGetSignedUrl()
        .then((url) => {
          if (url) {
            trackUrl(url);
            setSignedUrl(url);
          } else {
            setLoadError(t("records.failedToLoad"));
          }
        })
        .catch(() => setLoadError(t("records.failedToLoad")))
        .finally(() => setIsLoading(false));
    }
  }, [open, record?.id, externalSignedUrl, onGetSignedUrl]);

  // Cleanup on unmount
  useEffect(() => revokeOwnedUrl, [revokeOwnedUrl]);

  if (!record) return null;

  const formatCategory = (cat: string | null) => {
    if (!cat) return t("records.other");
    return cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDiseaseCategory = (cat: string | null) => {
    if (!cat) return t("records.general");
    return cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getCategoryColor = (cat: string | null) => {
    switch (cat) {
      case "prescription": return "bg-primary/10 text-primary";
      case "lab_result": return "bg-secondary/10 text-secondary-foreground";
      case "imaging": return "bg-accent/10 text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDiseaseColor = (cat: string | null) => {
    switch (cat) {
      case "cancer": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "diabetes": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "heart_disease": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
      case "covid19": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isPdf = record.file_type === "application/pdf";
  const isImage = record.file_type?.startsWith("image/");

  const handleRetry = () => {
    if (!onGetSignedUrl) return;
    revokeOwnedUrl();
    setSignedUrl(null);
    setLoadError(null);
    setIsLoading(true);
    onGetSignedUrl()
      .then((url) => {
        if (url) {
          trackUrl(url);
          setSignedUrl(url);
        } else {
          setLoadError(t("records.failedToLoad"));
        }
      })
      .catch(() => setLoadError(t("records.failedToLoad")))
      .finally(() => setIsLoading(false));
  };

  const handleOpenDocument = () => {
    if (!signedUrl) return;
    // Use anchor click for better blob: URL support across browsers
    const link = document.createElement("a");
    link.href = signedUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownload = async () => {
    if (!signedUrl) return;
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = record.title || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: direct link
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = record.title || "document";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Inline preview content
  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-40 bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-40 bg-muted/30 text-muted-foreground gap-2">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">{loadError}</p>
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {t("common.retry", "Retry")}
          </Button>
        </div>
      );
    }

    if (signedUrl && isImage) {
      return (
        <img
          src={signedUrl}
          alt={record.title}
          className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleOpenDocument}
        />
      );
    }

    if (signedUrl && isPdf) {
      return (
        <div className="h-[50vh] w-full">
          <object data={signedUrl} type="application/pdf" className="w-full h-full">
            <div className="flex flex-col items-center justify-center h-full bg-muted/30 gap-2">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("records.unableToDisplayPdf", "Unable to display PDF inline")}</p>
              <Button variant="link" size="sm" onClick={handleOpenDocument}>
                {t("records.openInNewTab", "Open in new tab")}
              </Button>
            </div>
          </object>
        </div>
      );
    }

    // Non-image, non-PDF or no URL yet
    return (
      <div
        className="flex flex-col items-center justify-center h-40 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={signedUrl ? handleOpenDocument : undefined}
      >
        <FileText className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {signedUrl ? (isPdf ? t("records.pdfDocument") : t("records.viewDocument")) : t("records.loadingDocument", "Loading document...")}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="truncate">{record.title}</span>
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={getCategoryColor(record.category)}>
                <Tag className="h-3 w-3 mr-1" />{formatCategory(record.category)}
              </Badge>
              <Badge className={getDiseaseColor(record.disease_category)}>
                {formatDiseaseCategory(record.disease_category)}
              </Badge>
              <ICD11ChapterBadge
                chapterCode={record.icd11_chapter_code}
                icdCode={record.icd11_code}
                icdStandard={record.icd_standard}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {record.record_date && (
                <div>
                  <p className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="h-3 w-3" />{t("records.date")}</p>
                  <p className="font-medium">{format(new Date(record.record_date), "MMMM d, yyyy")}</p>
                </div>
              )}
              {record.provider_name && (
                <div>
                  <p className="text-muted-foreground text-xs flex items-center gap-1"><User className="h-3 w-3" />{t("records.provider")}</p>
                  <p className="font-medium">{record.provider_name}</p>
                </div>
              )}
              {record.uploaded_at && (
                <div>
                  <p className="text-muted-foreground text-xs">{t("records.uploaded")}</p>
                  <p className="font-medium">{format(new Date(record.uploaded_at), "MMM d, yyyy")}</p>
                </div>
              )}
              {record.file_size && (
                <div>
                  <p className="text-muted-foreground text-xs">{t("records.fileSize")}</p>
                  <p className="font-medium">{(record.file_size / 1024).toFixed(1)} KB</p>
                </div>
              )}
            </div>
            {record.description && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">{t("records.description")}</p>
                <p className="text-sm">{record.description}</p>
              </div>
            )}
            {record.notes && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">{t("records.notes")}</p>
                <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">{record.notes}</div>
              </div>
            )}
            <div className="border rounded-lg overflow-hidden">
              {renderPreview()}
            </div>
            <div className="flex gap-2">
              <AISummaryDialog documentTitle={record.title} documentType={formatCategory(record.category)} documentUrl={signedUrl || undefined} additionalContext={record.description || record.notes || undefined}
                trigger={<Button variant="outline" size="sm" className="gap-1"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">{t("records.aiSummary")}</span></Button>} />
              <Button className="flex-1" onClick={handleOpenDocument} disabled={!signedUrl || !!loadError}><ExternalLink className="h-4 w-4 mr-2" />{t("records.viewFull")}</Button>
              <Button variant="outline" onClick={handleDownload} disabled={!signedUrl || !!loadError}><Download className="h-4 w-4" /></Button>
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={isDeleting}>
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("records.deleteRecord")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("records.deleteConfirm", { title: record.title })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onDelete}>{t("common.delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </ScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
