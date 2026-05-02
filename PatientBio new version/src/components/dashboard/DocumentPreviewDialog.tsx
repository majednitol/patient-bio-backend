import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Printer, ExternalLink, X, FileText, Loader2 } from "lucide-react";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  category?: string | null;
  date?: string | null;
  fileUrl: string | null;
  fileType?: string | null;
  onGetSignedUrl?: () => Promise<string | null>;
}

export const DocumentPreviewDialog = ({ open, onOpenChange, title, category, date, fileUrl, fileType, onGetSignedUrl }: DocumentPreviewDialogProps) => {
  const { t } = useTranslation();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !signedUrl && onGetSignedUrl) {
      setIsLoading(true); setError(null);
      onGetSignedUrl().then((url) => { setSignedUrl(url); if (!url) setError(t("records.failedToLoad")); })
        .catch(() => setError(t("records.failedToLoad"))).finally(() => setIsLoading(false));
    }
  }, [open, onGetSignedUrl]);

  useEffect(() => { if (!open) { setSignedUrl(null); setError(null); } }, [open]);

  const isPdf = fileType === "application/pdf";
  const isImage = fileType?.startsWith("image/");

  const formatCategory = (cat: string | null | undefined) => {
    if (!cat) return t("records.document");
    return cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDownload = () => { const url = signedUrl || fileUrl; if (!url) return; const link = document.createElement("a"); link.href = url; link.download = title || "document"; link.target = "_blank"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handlePrint = () => { const url = signedUrl || fileUrl; if (!url) return; const pw = window.open(url, "_blank"); if (pw) pw.onload = () => pw.print(); };
  const handleOpenInNewTab = () => { const url = signedUrl || fileUrl; if (url) window.open(url, "_blank"); };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <ResponsiveDialogHeader className="flex-shrink-0">
          <ResponsiveDialogTitle className="flex items-center gap-2 pr-8"><FileText className="h-5 w-5 text-primary flex-shrink-0" /><span className="truncate">{title}</span></ResponsiveDialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {category && <Badge variant="secondary" className="text-xs">{formatCategory(category)}</Badge>}
            {date && <span>{date}</span>}
          </div>
        </ResponsiveDialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-muted/30">
          {isLoading ? (
            <div className="flex items-center justify-center h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground"><FileText className="h-12 w-12 mb-2" /><p>{error}</p></div>
          ) : signedUrl ? (
            <div className="h-[60vh] w-full">
              {isPdf ? (
                <object data={signedUrl} type="application/pdf" className="w-full h-full">
                  <div className="flex flex-col items-center justify-center h-full"><FileText className="h-12 w-12 text-muted-foreground mb-2" /><p className="text-muted-foreground">{t("records.unableToDisplayPdf")}</p><Button variant="link" onClick={handleOpenInNewTab} className="mt-2">{t("records.openInNewTab")}</Button></div>
                </object>
              ) : isImage ? (
                <div className="flex items-center justify-center h-full p-4"><img src={signedUrl} alt={title} className="max-w-full max-h-full object-contain" /></div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full"><FileText className="h-12 w-12 text-muted-foreground mb-2" /><p className="text-muted-foreground mb-4">{t("records.previewNotAvailable")}</p><Button onClick={handleOpenInNewTab}><ExternalLink className="h-4 w-4 mr-2" />{t("records.openInNewTab")}</Button></div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[400px]"><Skeleton className="w-full h-full" /></div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 flex-shrink-0">
          <Button variant="outline" onClick={handleDownload} disabled={!signedUrl}><Download className="h-4 w-4 mr-2" />{t("records.download")}</Button>
          <Button variant="outline" onClick={handlePrint} disabled={!signedUrl}><Printer className="h-4 w-4 mr-2" />{t("records.print")}</Button>
          <Button onClick={handleOpenInNewTab} disabled={!signedUrl}><ExternalLink className="h-4 w-4 mr-2" />{t("records.openInNewTab")}</Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};