import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Microscope, FileText, ExternalLink, Calendar, Building2, User,
  Loader2, Search, X, Download, ChevronDown, ChevronUp, Clock,
  Activity, CheckCircle2, AlertTriangle, Eye,
} from "lucide-react";
import { usePatientPathologistReports, PatientPathologistReport } from "@/hooks/usePatientPathologistReports";
import { format, formatDistanceToNow } from "date-fns";

const formatDiseaseCategory = (category: string | null) => {
  if (!category) return "General";
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

interface PathologistReportsSectionProps {
  searchQuery?: string;
}

export const PathologistReportsSection = ({ searchQuery: externalSearchQuery }: PathologistReportsSectionProps) => {
  const { reports, isLoading, getReportSignedUrl } = usePatientPathologistReports();
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchQuery = externalSearchQuery || localSearchQuery;

  const categories = useMemo(
    () => Array.from(new Set(reports.map((r) => r.disease_category).filter(Boolean))) as string[],
    [reports]
  );

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (categoryFilter !== "all" && report.disease_category !== categoryFilter) return false;
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        report.report_name.toLowerCase().includes(query) ||
        report.report_type?.toLowerCase().includes(query) ||
        report.findings?.toLowerCase().includes(query) ||
        report.pathologist_name?.toLowerCase().includes(query) ||
        report.lab_name?.toLowerCase().includes(query) ||
        report.disease_category?.toLowerCase().includes(query)
      );
    });
  }, [reports, searchQuery, categoryFilter]);

  const abnormalCount = reports.filter((r) => r.has_abnormal_values).length;
  const withFilesCount = reports.filter((r) => r.file_url).length;

  const handleViewFile = async (report: PatientPathologistReport) => {
    if (!report.file_url) return;
    setLoadingUrl(report.id);
    const url = await getReportSignedUrl(report.file_url);
    setLoadingUrl(null);
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async (report: PatientPathologistReport) => {
    if (!report.file_url) return;
    setLoadingUrl(report.id);
    const url = await getReportSignedUrl(report.file_url);
    setLoadingUrl(null);
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = report.report_name || "report";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) return null;

  return (
    <>
      {/* Header Banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-2.5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Microscope className="h-4.5 w-4.5 sm:h-6 sm:w-6 text-primary shrink-0" />
              Diagnostic Reports
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
              {reports.length} report{reports.length !== 1 ? "s" : ""} from diagnostic centers
            </p>
          </div>
          <Badge variant="secondary" className="text-xs sm:hidden shrink-0">{reports.length}</Badge>
        </div>
      </div>

      {/* Mobile Compact Stats - inline colored dot pills */}
      <div className="flex sm:hidden gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 -mx-1 px-1">
        {[
          { label: "Total", value: reports.length, dotColor: "bg-primary" },
          { label: "Abnormal", value: abnormalCount, dotColor: "bg-destructive" },
          { label: "Files", value: withFilesCount, dotColor: "bg-green-500" },
          { label: "Latest", value: reports[0]?.created_at ? format(new Date(reports[0].created_at), "MMM d") : "—", dotColor: "bg-blue-500" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1 shrink-0 bg-card">
            <span className={`h-2 w-2 rounded-full ${stat.dotColor} shrink-0`} />
            <span className="text-xs font-bold text-foreground">{stat.value}</span>
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Desktop Stats Row */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-primary/10">
              <Microscope className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total</p>
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
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Abnormal</p>
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
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">With Files</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{withFilesCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-100">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Latest</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {reports[0]?.created_at ? format(new Date(reports[0].created_at), "MMM d, yyyy") : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {!externalSearchQuery && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-9 sm:h-10"
          />
          {localSearchQuery && (
            <button
              onClick={() => setLocalSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Mobile: Segmented control filter */}
      {categories.length > 0 && (
        <div className="sm:hidden">
          <div className="flex overflow-x-auto hide-scrollbar rounded-xl bg-muted/40 p-1 gap-0.5 scroll-fade-right">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 touch-target ${
                categoryFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All {reports.length}
            </button>
            {categories.map((cat) => {
              const count = reports.filter((r) => r.disease_category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 capitalize touch-target ${
                    categoryFilter === cat ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.replace(/_/g, " ")}{count > 0 ? ` ${count}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop: Category tabs */}
      {categories.length > 0 && (
        <div className="hidden sm:flex gap-2">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
            className="text-xs h-8"
          >
            All
          </Button>
          {categories.slice(0, 6).map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
              className="text-xs h-8 capitalize"
            >
              {cat.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      )}

      {/* Collapsible List */}
      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Microscope className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">No reports found</h3>
            <p className="text-muted-foreground text-sm mt-1">No reports match your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredReports.map((report) => {
            const isExpanded = expandedId === report.id;

            return (
              <Collapsible
                key={report.id}
                open={isExpanded}
                onOpenChange={() => setExpandedId(isExpanded ? null : report.id)}
              >
                <Card className="rounded-xl hover:shadow-md transition-all duration-200">
                  <CardContent className="p-2.5 sm:p-4">
                    {/* Header: icon + title + actions */}
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-muted/30 flex-shrink-0">
                        <Microscope className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-foreground" />
                      </div>
                      <h4 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0">
                        {report.report_name}
                      </h4>
                      {/* Desktop actions */}
                      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownload(report)}
                          disabled={!report.file_url || loadingUrl === report.id}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {report.file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewFile(report)}
                            disabled={loadingUrl === report.id}
                          >
                            {loadingUrl === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      {/* Mobile: only chevron */}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="sm:hidden h-7 w-7 p-0 flex-shrink-0">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                      {report.has_abnormal_values ? (
                        <Badge variant="destructive" className="text-[10px] sm:text-xs gap-1">
                          <Activity className="h-3 w-3" />
                          Abnormal
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1 bg-green-100 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Normal
                        </Badge>
                      )}
                      {report.report_type && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {report.report_type.replace(/_/g, " ")}
                        </Badge>
                      )}
                      {report.disease_category && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs capitalize bg-muted/30 border-0">
                          {formatDiseaseCategory(report.disease_category)}
                        </Badge>
                      )}
                    </div>

                    {/* Findings preview */}
                    {report.findings && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 line-clamp-2">
                        {report.findings}
                      </p>
                    )}

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                      {report.pathologist_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {report.pathologist_name}
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
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50 space-y-3 sm:space-y-4">
                        {/* Mobile action buttons */}
                        {report.file_url && (
                          <div className="flex sm:hidden gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-10 text-xs gap-1.5"
                              onClick={() => handleViewFile(report)}
                              disabled={loadingUrl === report.id}
                            >
                              {loadingUrl === report.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                              View Report
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-10 text-xs gap-1.5"
                              onClick={() => handleDownload(report)}
                              disabled={loadingUrl === report.id}
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download
                            </Button>
                          </div>
                        )}

                        {report.findings && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-1">Full Findings</p>
                            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                              {report.findings}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                          {report.created_at && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Date</p>
                              <p className="text-sm font-medium">
                                {format(new Date(report.created_at), "MMMM d, yyyy")}
                              </p>
                            </div>
                          )}
                          {report.pathologist_name && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Pathologist</p>
                              <p className="text-sm font-medium">{report.pathologist_name}</p>
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
                              <p className="text-sm font-medium capitalize">
                                {report.report_type.replace(/_/g, " ")}
                              </p>
                            </div>
                          )}
                          {report.disease_category && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Category</p>
                              <p className="text-sm font-medium capitalize">
                                {report.disease_category.replace(/_/g, " ")}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Desktop file actions */}
                        {report.file_url && (
                          <div className="hidden sm:flex gap-2">
                            <Button
                              className="flex-1"
                              size="sm"
                              onClick={() => handleViewFile(report)}
                              disabled={loadingUrl === report.id}
                            >
                              {loadingUrl === report.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4 mr-2" />
                              )}
                              View Report File
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(report)}
                              disabled={loadingUrl === report.id}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </>
  );
};
