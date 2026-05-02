import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePatientPathologistReports, PatientPathologistReport } from "@/hooks/usePatientPathologistReports";
import { useLazyPDF } from "@/components/shared/LazyPDFExport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Microscope,
  FileText,
  Search,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Building2,
  User,
  Download,
  Calendar,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { formatDoctorName } from "@/utils/formatDoctorName";

const CATEGORY_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  hematology: { border: "border-border/60", bg: "bg-muted/30", text: "text-foreground" },
  cardiology: { border: "border-border/60", bg: "bg-muted/30", text: "text-foreground" },
  hepatology: { border: "border-border/60", bg: "bg-muted/30", text: "text-foreground" },
  endocrinology: { border: "border-border/60", bg: "bg-muted/30", text: "text-foreground" },
  general: { border: "border-border/60", bg: "bg-muted/30", text: "text-foreground" },
};

const getCategoryStyle = (category: string | null) => {
  if (!category) return { border: "border-border/60", bg: "bg-muted/30", text: "text-muted-foreground" };
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.general;
};

const PatientLabReportsPage = () => {
  const { t } = useTranslation();
  const { reports, isLoading, getReportSignedUrl, markReportViewed } = usePatientPathologistReports();
  const { generate: generatePdf, isGenerating: isGeneratingPdf } = useLazyPDF();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const categories = Array.from(
    new Set(reports.map((r) => r.disease_category).filter(Boolean))
  ) as string[];

  const filtered = reports.filter((r) => {
    const matchesSearch =
      r.report_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.findings?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (r.pathologist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory =
      categoryFilter === "all" || r.disease_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const abnormalCount = reports.filter((r) => r.has_abnormal_values).length;
  const latestReport = reports.length > 0 ? reports[0] : null;

  const handleViewReport = async (report: PatientPathologistReport) => {
    if (!report.file_url) return;
    setViewingReport(report.id);
    markReportViewed?.(report.id);
    const url = await getReportSignedUrl(report.file_url);
    if (url) window.open(url, "_blank");
    setViewingReport(null);
  };

  const buildPdfOptions = (report: PatientPathologistReport) => ({
    filename: report.report_name.replace(/[^a-zA-Z0-9]/g, "_"),
    title: "Lab Report",
    subtitle: report.report_name,
    content: [
      { type: "divider" as const },
      { type: "spacer" as const, height: 4 },
      {
        type: "keyValue" as const,
        data: {
          ...(report.created_at ? { Date: format(new Date(report.created_at), "MMMM d, yyyy") } : {}),
          ...(report.pathologist_name ? { Pathologist: formatDoctorName(report.pathologist_name) } : {}),
          ...(report.lab_name ? { Laboratory: report.lab_name } : {}),
          ...(report.report_type ? { Type: report.report_type.replace(/_/g, " ") } : {}),
          ...(report.disease_category ? { Category: report.disease_category.replace(/_/g, " ") } : {}),
          Status: report.has_abnormal_values ? "Abnormal values detected" : "Normal",
        },
      },
      { type: "spacer" as const, height: 6 },
      { type: "heading" as const, text: "Findings", level: 2 as const },
      { type: "paragraph" as const, text: report.findings || "No findings recorded." },
    ],
  });

  const handleDownloadPdf = (report: PatientPathologistReport) => {
    generatePdf(buildPdfOptions(report));
  };

  const handleDownloadAll = async () => {
    for (const report of filtered) {
      await generatePdf(buildPdfOptions(report));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("labReportsPage.loadingLabReports")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-3 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Microscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {t("labReportsPage.labReports")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t(reports.length !== 1 ? "labReportsPage.reportsShared_plural" : "labReportsPage.reportsShared", { count: reports.length })}
            </p>
          </div>
          {filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              <span className="hidden sm:inline">{t("labReportsPage.downloadAll")}</span>
              <span className="sm:hidden">{t("common.download")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10">
              <Microscope className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{t("labReportsPage.total")}</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{reports.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-destructive/10">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{t("labReportsPage.abnormal")}</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{abnormalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-green-100">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{t("labReportsPage.withFiles")}</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                {reports.filter((r) => r.file_url).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-100">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{t("labReportsPage.latest")}</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {latestReport?.created_at
                  ? format(new Date(latestReport.created_at), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("labReportsPage.searchReports")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {categories.length > 0 && (
          <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
            <TabsList className="overflow-x-auto hide-scrollbar w-full justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.slice(0, 4).map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize text-xs">
                  {cat.replace(/_/g, " ")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Reports List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Microscope className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">{t("labReportsPage.noLabReports")}</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              {t("labReportsPage.noLabReportsDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const catStyle = getCategoryStyle(report.disease_category);
            const isExpanded = expandedReportId === report.id;

            return (
              <Collapsible
                key={report.id}
                open={isExpanded}
                onOpenChange={() =>
                  setExpandedReportId(isExpanded ? null : report.id)
                }
              >
                <Card
                  className="rounded-xl hover:shadow-md transition-all duration-200"
                >
                  <CardContent className="p-3 sm:p-4">
                    {/* Header: icon + title + actions */}
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className={`p-2 sm:p-2.5 rounded-xl ${catStyle.bg} flex-shrink-0`}>
                        <FileText className={`h-4 w-4 sm:h-5 sm:w-5 ${catStyle.text}`} />
                      </div>
                      <h4 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0">{report.report_name}</h4>
                      <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          onClick={() => handleDownloadPdf(report)}
                          title="Download as PDF"
                        >
                          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        {report.file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            onClick={() => handleViewReport(report)}
                            disabled={viewingReport === report.id}
                          >
                            {viewingReport === report.id ? (
                              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                      {report.has_abnormal_values ? (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs gap-1">
                          <Activity className="h-3 w-3" />
                          {t("labReportsPage.abnormal")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1 bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("labReportsPage.normal")}
                        </Badge>
                      )}
                      {report.report_type && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {report.report_type.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {report.disease_category && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] sm:text-xs capitalize ${catStyle.bg} ${catStyle.text} border-0`}
                        >
                          {report.disease_category.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>

                    {/* Findings */}
                    {report.findings && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">
                        {report.findings}
                      </p>
                    )}

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                      {report.pathologist_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {formatDoctorName(report.pathologist_name)}
                        </span>
                      )}
                      {report.lab_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {report.lab_name}
                        </span>
                      )}
                      {report.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(report.created_at), "MMM d, yyyy")}
                          <span className="text-muted-foreground/60 hidden sm:inline">
                            ({formatDistanceToNow(new Date(report.created_at), { addSuffix: true })})
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Expanded Detail */}
                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {report.created_at && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Date</p>
                              <p className="text-sm font-medium">{format(new Date(report.created_at), "MMMM d, yyyy")}</p>
                            </div>
                          )}
                          {report.pathologist_name && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Pathologist</p>
                              <p className="text-sm font-medium">{formatDoctorName(report.pathologist_name)}</p>
                            </div>
                          )}
                          {report.lab_name && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Laboratory</p>
                              <p className="text-sm font-medium">{report.lab_name}</p>
                            </div>
                          )}
                          {report.report_type && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Report Type</p>
                              <p className="text-sm font-medium capitalize">{report.report_type.replace(/_/g, " ")}</p>
                            </div>
                          )}
                          {report.disease_category && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Category</p>
                              <p className="text-sm font-medium capitalize">{report.disease_category.replace(/_/g, " ")}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">Status</p>
                            <p className={`text-sm font-medium ${report.has_abnormal_values ? "text-destructive" : "text-green-600"}`}>
                              {report.has_abnormal_values ? "Abnormal" : "Normal"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">Findings</p>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {report.findings || "No findings recorded."}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(report)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download PDF
                          </Button>
                          {report.file_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReport(report)}
                              disabled={viewingReport === report.id}
                            >
                              {viewingReport === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <ExternalLink className="h-4 w-4 mr-1" />
                              )}
                              View File
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PatientLabReportsPage;
