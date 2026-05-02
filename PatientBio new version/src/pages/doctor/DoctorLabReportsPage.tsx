import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Microscope, Search, X, FileText, ExternalLink, Download,
  Calendar, User, AlertTriangle, Loader2, ChevronLeft, ChevronRight,
  Building, Sparkles,
} from "lucide-react";
import { useDoctorReceivedReports, DoctorReceivedReport } from "@/hooks/useDoctorReceivedReports";
import { useDoctorProfile } from "@/hooks/useDoctorProfile";
import { getSpecialtyConfig } from "@/constants/specialtyConfig";
import { format } from "date-fns";

const formatDiseaseCategory = (category: string | null) => {
  if (!category) return "General";
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const getCategoryColor = (category: string | null) => {
  switch (category) {
    case "cancer": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "diabetes": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "heart_disease": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    case "covid19": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const ITEMS_PER_PAGE = 8;

const DoctorLabReportsPage = () => {
  const { reports, isLoading, getReportSignedUrl, markReportViewed } = useDoctorReceivedReports();
  const { data: doctorProfile } = useDoctorProfile();
  const specialtyConfig = useMemo(() => getSpecialtyConfig(doctorProfile?.specialty), [doctorProfile?.specialty]);
  const relevantCategories = specialtyConfig.relevantLabCategories;

  const [searchQuery, setSearchQuery] = useState("");
  // Auto-select first relevant category tab if available
  const [activeTab, setActiveTab] = useState("all");
  const [selectedReport, setSelectedReport] = useState<DoctorReceivedReport | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortByRelevance, setSortByRelevance] = useState(relevantCategories.length > 0);

  const isRelevantReport = (report: DoctorReceivedReport) =>
    relevantCategories.length > 0 && relevantCategories.includes(report.disease_category || "");

  const filteredReports = useMemo(() => {
    let filtered = reports;

    if (activeTab === "abnormal") {
      filtered = filtered.filter((r) => r.has_abnormal_values);
    } else if (activeTab !== "all") {
      filtered = filtered.filter((r) => r.disease_category === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.report_name.toLowerCase().includes(q) ||
          r.report_type?.toLowerCase().includes(q) ||
          r.findings?.toLowerCase().includes(q) ||
          r.pathologist_name?.toLowerCase().includes(q) ||
          r.patient_name?.toLowerCase().includes(q)
      );
    }

    // Sort: specialty-relevant reports first
    if (sortByRelevance && relevantCategories.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const aRelevant = isRelevantReport(a) ? 0 : 1;
        const bRelevant = isRelevantReport(b) ? 0 : 1;
        return aRelevant - bRelevant;
      });
    }

    return filtered;
  }, [reports, activeTab, searchQuery, sortByRelevance, relevantCategories]);

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const abnormalCount = reports.filter((r) => r.has_abnormal_values).length;
  const relevantCount = reports.filter(isRelevantReport).length;

  const categories = useMemo(() => {
    const cats = new Set(reports.map((r) => r.disease_category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [reports]);

  const handleViewFile = async (report: DoctorReceivedReport) => {
    if (!report.file_url) return;
    setLoadingUrl(report.id);
    // Mark as viewed when doctor opens the file
    if (!report.doctor_viewed_at) {
      markReportViewed(report.id);
    }
    const url = await getReportSignedUrl(report.file_url);
    setLoadingUrl(null);
    if (url) window.open(url, "_blank");
  };

  const handleDownload = async (report: DoctorReceivedReport) => {
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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Microscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Lab Reports
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Diagnostic reports shared by pathologists ({reports.length} total)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold">{reports.length}</p>
            <p className="text-xs text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-destructive">{abnormalCount}</p>
            <p className="text-xs text-muted-foreground">Abnormal Results</p>
          </CardContent>
        </Card>
        {relevantCount > 0 ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary">{relevantCount}</p>
              <p className="text-xs text-muted-foreground">Specialty Relevant</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold">{categories.length}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold">
              {reports.filter((r) => r.file_url).length}
            </p>
            <p className="text-xs text-muted-foreground">With Files</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by report name, patient, pathologist..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sort toggle for relevance */}
      {relevantCategories.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant={sortByRelevance ? "default" : "outline"}
            size="sm"
            onClick={() => setSortByRelevance(!sortByRelevance)}
            className="h-8 text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Priority Sort
          </Button>
          <span className="text-xs text-muted-foreground">
            {sortByRelevance ? "Showing specialty-relevant reports first" : "Default order"}
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
        <TabsList className="w-full justify-start h-auto gap-1 overflow-x-auto hide-scrollbar flex-nowrap">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="abnormal" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Abnormal ({abnormalCount})
          </TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="gap-1">
              {formatDiseaseCategory(cat)}
              {relevantCategories.includes(cat) && (
                <Sparkles className="h-3 w-3 text-primary" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center text-muted-foreground">
                <Microscope className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No reports found</p>
                <p className="text-sm">
                  {searchQuery ? "Try adjusting your search" : "Reports shared by pathologists will appear here"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {paginatedReports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    loadingUrl={loadingUrl}
                    isRelevant={isRelevantReport(report)}
                    onView={() => setSelectedReport(report)}
                    onViewFile={() => handleViewFile(report)}
                    onDownload={() => handleDownload(report)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-primary" />
              {selectedReport?.report_name}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getCategoryColor(selectedReport.disease_category)}>
                    {formatDiseaseCategory(selectedReport.disease_category)}
                  </Badge>
                  {selectedReport.report_type && (
                    <Badge variant="outline">{selectedReport.report_type}</Badge>
                  )}
                  {selectedReport.has_abnormal_values && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Abnormal
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedReport.patient_name && (
                    <div>
                      <p className="text-muted-foreground text-xs">Patient</p>
                      <p className="font-medium">{selectedReport.patient_name}</p>
                    </div>
                  )}
                  {selectedReport.pathologist_name && (
                    <div>
                      <p className="text-muted-foreground text-xs">Pathologist</p>
                      <p className="font-medium">{selectedReport.pathologist_name}</p>
                    </div>
                  )}
                  {selectedReport.created_at && (
                    <div>
                      <p className="text-muted-foreground text-xs">Date</p>
                      <p className="font-medium">
                        {format(new Date(selectedReport.created_at), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>

                {selectedReport.findings && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Findings</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                      {selectedReport.findings}
                    </div>
                  </div>
                )}

                {selectedReport.file_url && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleViewFile(selectedReport)}
                      disabled={loadingUrl === selectedReport.id}
                    >
                      {loadingUrl === selectedReport.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      View Report File
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDownload(selectedReport)}
                      disabled={loadingUrl === selectedReport.id}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-component for report cards
function ReportCard({
  report,
  loadingUrl,
  isRelevant,
  onView,
  onViewFile,
  onDownload,
}: {
  report: DoctorReceivedReport;
  loadingUrl: string | null;
  isRelevant?: boolean;
  onView: () => void;
  onViewFile: () => void;
  onDownload: () => void;
}) {
  return (
    <Card className={`overflow-hidden hover:shadow-md transition-shadow ${isRelevant ? "ring-1 ring-primary/30" : ""}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Microscope className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm truncate">{report.report_name}</h4>
              {report.report_type && (
                <p className="text-xs text-muted-foreground">{report.report_type}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge className={getCategoryColor(report.disease_category)}>
              {formatDiseaseCategory(report.disease_category)}
            </Badge>
            {isRelevant && (
              <Badge variant="outline" className="gap-1 text-[10px] border-primary/40 text-primary bg-primary/5">
                <Sparkles className="h-3 w-3" />
                Relevant
              </Badge>
            )}
            {report.has_abnormal_values && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <AlertTriangle className="h-3 w-3" />
                Abnormal
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground mb-3">
          {report.patient_name && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>Patient: {report.patient_name}</span>
            </div>
          )}
          {report.pathologist_name && (
            <div className="flex items-center gap-1">
              <Building className="h-3 w-3" />
              <span>{report.pathologist_name}</span>
            </div>
          )}
          {report.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(report.created_at), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>

        {report.findings && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {report.findings}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={onView}>
            <FileText className="h-4 w-4 mr-1" />
            Details
          </Button>
          {report.file_url && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onDownload}
                disabled={loadingUrl === report.id}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onViewFile}
                disabled={loadingUrl === report.id}
              >
                {loadingUrl === report.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default DoctorLabReportsPage;
