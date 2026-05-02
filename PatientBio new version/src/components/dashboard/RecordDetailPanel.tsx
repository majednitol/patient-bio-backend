import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Calendar, User, Download, Trash2, ExternalLink, X } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { RecordThumbnail } from "./RecordThumbnail";

type HealthRecord = Tables<"health_records">;

interface RecordDetailPanelProps {
  record: HealthRecord | null;
  signedUrl: string | null;
  onGetSignedUrl?: () => Promise<string | null>;
  onDelete?: () => void;
  onClose?: () => void;
  isDeleting?: boolean;
  className?: string;
}

export const RecordDetailPanel = ({ record, signedUrl, onGetSignedUrl, onDelete, onClose, isDeleting, className = "" }: RecordDetailPanelProps) => {
  const { t } = useTranslation();

  const getCategoryBadgeColor = (category: string | null) => {
    switch (category) {
      case "prescription": return "bg-primary/10 text-primary";
      case "lab_result": return "bg-secondary/10 text-secondary-foreground";
      case "imaging": return "bg-accent/10 text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatCategory = (category: string | null) => {
    if (!category) return t("records.other");
    return category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDownload = () => {
    if (!signedUrl || !record) return;
    const link = document.createElement("a");
    link.href = signedUrl; link.download = record.title || "document"; link.target = "_blank";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (!record) {
    return (
      <Card className={`h-full flex flex-col ${className}`}>
        <CardContent className="flex-1 flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{t("records.selectRecord")}</p>
            <p className="text-sm">{t("records.selectRecordDesc")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">{record.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge className={getCategoryBadgeColor(record.category)}>{formatCategory(record.category)}</Badge>
            </CardDescription>
          </div>
          {onClose && <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0"><X className="h-4 w-4" /></Button>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto py-4 space-y-4">
        <div className="rounded-lg overflow-hidden border bg-muted/30">
          <RecordThumbnail fileType={record.file_type} fileUrl={record.file_url} title={record.title} className="w-full h-48 lg:h-64" onGetUrl={onGetSignedUrl} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {record.record_date && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{t("records.date")}</p>
              <p className="text-sm font-medium">{format(new Date(record.record_date), "MMM d, yyyy")}</p>
            </div>
          )}
          {record.provider_name && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{t("records.provider")}</p>
              <p className="text-sm font-medium">{record.provider_name}</p>
            </div>
          )}
        </div>
        {record.description && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("records.description")}</p>
            <p className="text-sm">{record.description}</p>
          </div>
        )}
        {record.notes && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("records.notes")}</p>
            <p className="text-sm text-muted-foreground">{record.notes}</p>
          </div>
        )}
        {record.record_date && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground">{t("records.date")}</p>
            <p className="text-sm">{format(new Date(record.record_date), "MMM d, yyyy")}</p>
          </div>
        )}
      </CardContent>
      <div className="p-4 border-t flex gap-2">
        {signedUrl && (
          <Button variant="outline" className="flex-1" asChild>
            <a href={signedUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />{t("records.open")}</a>
          </Button>
        )}
        <Button variant="outline" onClick={handleDownload} disabled={!signedUrl}><Download className="h-4 w-4" /></Button>
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>
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
    </Card>
  );
};