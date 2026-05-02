import { PathologistReport } from "@/hooks/usePathologistReports";
import { AbnormalFlagBadge } from "@/components/pathologist/AbnormalFlagEditor";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Send,
  Trash2,
  Loader2,
  Share2,
  Eye,
  Pencil,
  AlertTriangle,
  Building2,
  FilePlus,
  Brain,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const reportTypeLabels: Record<string, string> = {
  blood_work: "Blood Work",
  imaging: "Imaging",
  pathology: "Pathology",
  microbiology: "Microbiology",
  cardiology: "Cardiology",
  other: "Other",
};

interface ReportCardContentProps {
  report: PathologistReport;
  viewingReportId: string | null;
  onViewReport: (report: PathologistReport) => void;
  onEditReport: (report: PathologistReport) => void;
  onShareWithPatient: (reportId: string) => void;
  onDeleteReport: (reportId: string) => void;
  onAddAddendum?: (report: PathologistReport) => void;
  onAiAnalyze?: (report: PathologistReport) => void;
  isAnalyzing?: boolean;
  analyzingReportId?: string | null;
}

export function ReportCardContent({
  report,
  viewingReportId,
  onViewReport,
  onEditReport,
  onShareWithPatient,
  onDeleteReport,
  onAddAddendum,
  onAiAnalyze,
  isAnalyzing,
  analyzingReportId,
}: ReportCardContentProps) {
  const hasAddenda = report.addenda && report.addenda.length > 0;

  return (
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl bg-[hsl(var(--diagnostic-primary))]/10 flex-shrink-0">
            <FileText className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800 truncate">{report.report_name}</h3>
              {report.has_abnormal_values && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Abnormal
                </Badge>
              )}
              {hasAddenda && (
                <Badge variant="outline" className="text-xs gap-1 border-amber-200 text-amber-700 bg-amber-50">
                  <FilePlus className="h-3 w-3" />
                  Amended ({report.addenda.length})
                </Badge>
              )}
              {report.hospital_order && (
                <Badge variant="outline" className="text-xs gap-1 border-blue-200 text-blue-700 bg-blue-50">
                  <Building2 className="h-3 w-3" />
                  Hospital Order
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {report.report_type && (
                <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50/50">
                  {reportTypeLabels[report.report_type] || report.report_type}
                </Badge>
              )}
              {report.disease_category && (
                <Badge variant="secondary" className="text-xs uppercase bg-gray-100">
                  {report.disease_category.replace(/_/g, " ")}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
              </span>
              {report.ai_analysis?.last_analyzed_at && (
                <Badge variant="outline" className="text-[10px] gap-1 border-purple-200 text-purple-700 bg-purple-50">
                  <Brain className="h-2.5 w-2.5" />
                  Analyzed {formatDistanceToNow(new Date(report.ai_analysis.last_analyzed_at), { addSuffix: true })}
                </Badge>
              )}
            </div>

            {report.findings && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{report.findings}</p>
            )}

            {/* Abnormal flags */}
            {report.abnormal_flags && report.abnormal_flags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <AbnormalFlagBadge flags={report.abnormal_flags} />
              </div>
            )}

            {/* Addenda */}
            {hasAddenda && (
              <div className="mt-3 space-y-2 border-l-2 border-amber-300 pl-3">
                <p className="text-xs font-medium text-amber-700">Addenda</p>
                {report.addenda.map((addendum) => (
                  <div key={addendum.id} className="text-xs text-muted-foreground">
                    <span className="text-amber-600 font-medium">
                      {format(new Date(addendum.added_at), "MMM d, yyyy h:mm a")}
                    </span>
                    {" — "}
                    {addendum.text}
                  </div>
                ))}
              </div>
            )}

            {/* Sharing status */}
            <div className="flex items-center gap-2 mt-2">
              {report.is_shared_with_doctor && (
                <Badge variant="outline" className="text-xs gap-1 text-green-700 border-green-200 bg-green-50">
                  <Share2 className="h-3 w-3" /> Shared with Doctor
                </Badge>
              )}
              {report.is_shared_with_patient && (
                <Badge variant="outline" className="text-xs gap-1 text-blue-700 border-blue-200 bg-blue-50">
                  <Share2 className="h-3 w-3" /> Shared with Patient
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* AI Analyze button - only when report has findings or abnormal flags */}
          {onAiAnalyze && (report.findings || (report.abnormal_flags && report.abnormal_flags.length > 0)) && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-purple-50 hover:text-purple-700"
              title="AI Diagnosis Analysis"
              onClick={() => onAiAnalyze(report)}
              disabled={isAnalyzing && analyzingReportId === report.id}
            >
              {isAnalyzing && analyzingReportId === report.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
            </Button>
          )}
          {(report.is_shared_with_doctor || report.is_shared_with_patient) && onAddAddendum && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-amber-50 hover:text-amber-700"
              title="Add Addendum"
              onClick={() => onAddAddendum(report)}
            >
              <FilePlus className="h-4 w-4" />
            </Button>
          )}
          {!report.is_shared_with_patient && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-blue-50 hover:text-blue-700"
              title="Share with Patient"
              onClick={() => onShareWithPatient(report.id)}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
          {report.file_url && (
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-teal-50 hover:text-teal-700"
              title="View File"
              onClick={() => onViewReport(report)}
              disabled={viewingReportId === report.id}
            >
              {viewingReportId === report.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-teal-50 hover:text-teal-700"
            title="Edit"
            onClick={() => onEditReport(report)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-red-50"
            title="Delete"
            onClick={() => onDeleteReport(report.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardContent>
  );
}
