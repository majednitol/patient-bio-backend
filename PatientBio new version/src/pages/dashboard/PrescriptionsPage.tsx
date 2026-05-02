import { useState, useEffect, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  FileText, FolderOpen, Trash2, Calendar, User, Loader2, Search, Download,
  Eye, X, AlertCircle, LayoutGrid, Clock, Tag, GitCompare,
  ChevronDown, ChevronUp, Building2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MedicalTimelineView } from "@/components/dashboard/MedicalTimelineView";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { DigitalPrescriptionsSection } from "@/components/dashboard/DigitalPrescriptionsSection";
import { MedicationInteractionChecker } from "@/components/dashboard/MedicationInteractionChecker";
import { PathologistReportsSection } from "@/components/dashboard/PathologistReportsSection";
import { RecordDetailDialog } from "@/components/dashboard/RecordDetailDialog";
import { HealthSummaryBanner } from "@/components/dashboard/HealthSummaryBanner";
import { RecordExpiryAlerts } from "@/components/dashboard/RecordExpiryAlerts";
import { format, formatDistanceToNow } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { useDuplicateDetection } from "@/hooks/useDuplicateDetection";
import { useRecordTags } from "@/hooks/useRecordTags";
import { RecordTagManager } from "@/components/dashboard/RecordTagManager";
import { RecordComparisonDialog } from "@/components/dashboard/RecordComparisonDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RecordListSkeleton } from "@/components/skeletons/RecordListSkeleton";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

type HealthRecord = Tables<"health_records">;

const DISEASE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "cancer", label: "Cancer" },
  { value: "covid19", label: "COVID-19" },
  { value: "diabetes", label: "Diabetes" },
  { value: "heart_disease", label: "Heart Disease" },
  { value: "other", label: "Other" },
];

const getFileTypeBadge = (fileType: string | null) => {
  if (!fileType) return { label: "File", className: "bg-muted text-muted-foreground" };
  if (fileType.includes("pdf")) return { label: "PDF", className: "bg-destructive/10 text-destructive" };
  if (fileType.startsWith("image/")) return { label: "Image", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
  return { label: "File", className: "bg-muted text-muted-foreground" };
};

const formatCategory = (category: string | null) => {
  if (!category) return "Other";
  return category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

const SECTION_TABS = [
  { value: "prescriptions", label: "Prescriptions", icon: FileText },
  { value: "diagnostics", label: "Diagnostics", icon: Building2 },
  { value: "records", label: "Records", icon: FolderOpen },
] as const;

type SectionTab = typeof SECTION_TABS[number]["value"];

const PrescriptionsPage = () => {
  const { t } = useTranslation();
  const { records, isLoading, isOfflineData, deleteRecord, isDeleting, getSignedUrl, getDecryptedUrl } = useHealthRecords();
  const [activeTab, setActiveTab] = useState("general");
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const { getDuplicateWarning } = useDuplicateDetection(records);
  const { tags: allTags, getTagsForRecord, allTagNames, addTag, removeTag, isAdding } = useRecordTags();
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [activeSectionTab, setActiveSectionTab] = useState<SectionTab>("prescriptions");
  const isMobile = useIsMobile();

  // Filter records by disease category, global search, and tag filter
  const filteredRecords = useMemo(() => {
    let filtered = records.filter((record) => record.disease_category === activeTab);
    
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase();
      filtered = filtered.filter((record) =>
        record.title.toLowerCase().includes(searchLower) ||
        record.provider_name?.toLowerCase().includes(searchLower) ||
        record.description?.toLowerCase().includes(searchLower) ||
        record.notes?.toLowerCase().includes(searchLower) ||
        record.category?.toLowerCase().includes(searchLower)
      );
    }

    if (activeTagFilter) {
      const taggedRecordIds = new Set(
        allTags.filter((t) => t.tag_name === activeTagFilter).map((t) => t.record_id)
      );
      filtered = filtered.filter((r) => taggedRecordIds.has(r.id));
    }
    
    return filtered;
  }, [records, activeTab, globalSearch, activeTagFilter, allTags]);

  // Pagination for filtered records
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedRecords,
    goToPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination({ data: filteredRecords, itemsPerPage: 8 });

  // Resolve viewable URL for a record (decrypted if encrypted, signed if not)
  const resolveRecordUrl = useCallback(async (record: HealthRecord): Promise<string | null> => {
    try {
      if (record.is_encrypted && record.encryption_salt && record.encryption_iv) {
        return await getDecryptedUrl(record);
      }
      return await getSignedUrl(record.file_url);
    } catch (err) {
      console.error("Error resolving URL for record:", record.id, err);
      return null;
    }
  }, [getDecryptedUrl, getSignedUrl]);

  // Prefetch URLs for visible records
  const fetchSignedUrl = async (record: HealthRecord) => {
    if (signedUrls[record.id] || loadingUrls.has(record.id)) return;
    
    setLoadingUrls((prev) => new Set([...prev, record.id]));
    const url = await resolveRecordUrl(record);
    if (url) {
      setSignedUrls((prev) => ({ ...prev, [record.id]: url }));
    }
    setLoadingUrls((prev) => {
      const next = new Set(prev);
      next.delete(record.id);
      return next;
    });
  };

  // Fetch signed URLs when records change
  useEffect(() => {
    paginatedRecords.forEach(fetchSignedUrl);
  }, [paginatedRecords.map((r) => r.id).join(",")]);

  const handleDownload = (record: HealthRecord) => {
    const url = signedUrls[record.id];
    if (!url) return;
    
    const link = document.createElement("a");
    link.href = url;
    link.download = record.title || "document";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["health-records"] });
  }, [queryClient]);

  const duplicateCount = records.filter((r) => getDuplicateWarning(r.id)).length;
  const withFilesCount = records.filter((r) => r.file_url).length;

  if (isLoading) {
    return <RecordListSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-2.5 sm:space-y-6">
      {isOfflineData && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border text-sm text-muted-foreground">
          <FolderOpen className="h-4 w-4 shrink-0" />
          {t("pwa.viewingCachedRecords", "Showing saved records. Some features may be limited offline.")}
        </div>
      )}
      {/* Health Summary Banner */}
      <HealthSummaryBanner />

      {/* Record Expiry Alerts */}
      <RecordExpiryAlerts />

      {/* Global Search Bar + View Toggle - sticky on mobile */}
      <div className="sticky top-0 z-20 sm:static bg-background/95 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0 pt-1 sm:pt-0">
        <Card className="shadow-sm sm:shadow-none">
          <CardContent className="pt-3 sm:pt-6 pb-3 sm:pb-6 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder={t("prescriptionsPage.searchRecords")}
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 text-sm"
                />
                {globalSearch && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setGlobalSearch("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as "grid" | "timeline")}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="grid" aria-label="Grid view" className="h-9 w-9 sm:h-10 sm:w-10">
                  <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="timeline" aria-label="Timeline view" className="h-9 w-9 sm:h-10 sm:w-10">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {/* Tag filter chips */}
            {allTagNames.length > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3 overflow-x-auto hide-scrollbar pb-0.5">
                <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                {allTagNames.map((name) => (
                  <Badge
                    key={name}
                    variant={activeTagFilter === name ? "default" : "outline"}
                    className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
                    onClick={() => setActiveTagFilter(activeTagFilter === name ? null : name)}
                  >
                    {name}
                  </Badge>
                ))}
                {activeTagFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] sm:text-[11px] px-1.5 text-muted-foreground shrink-0"
                    onClick={() => setActiveTagFilter(null)}
                  >
                    {t("common.close")}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {viewMode === "timeline" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              {t("prescriptionsPage.medicalTimeline")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MedicalTimelineView searchQuery={globalSearch} />
          </CardContent>
        </Card>
      )}

      {/* Grid-mode sections */}
      {viewMode === "grid" && (
        <>
          {/* Mobile Section Tab Switcher */}
          <div className="sm:hidden">
            <div className="flex rounded-xl bg-muted/60 p-1 gap-0.5">
              {SECTION_TABS.map((tab) => {
                const isActive = activeSectionTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveSectionTab(tab.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all touch-target ${
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile: show only active section */}
          <div className="sm:hidden">
            {activeSectionTab === "prescriptions" && (
              <>
                <DigitalPrescriptionsSection searchQuery={globalSearch} />
                <div className="mt-2.5">
                  <MedicationInteractionChecker />
                </div>
              </>
            )}
            {activeSectionTab === "diagnostics" && (
              <PathologistReportsSection searchQuery={globalSearch} />
            )}
          </div>

          {/* Desktop: show all sections stacked */}
          <div className="hidden sm:block space-y-6">
            <DigitalPrescriptionsSection searchQuery={globalSearch} />
            <MedicationInteractionChecker />
            <PathologistReportsSection searchQuery={globalSearch} />
          </div>
        </>
      )}
      
      {viewMode === "grid" && (!isMobile || activeSectionTab === "records") && <>
      {/* Health Records Section */}
      {/* Header Banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-2.5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 sm:h-6 sm:w-6 text-primary shrink-0" />
              {t("prescriptionsPage.records")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
              {t("prescriptionsPage.uploadedDocs", { count: records.length })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Badge variant="secondary" className="text-xs sm:hidden shrink-0">{records.length}</Badge>
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              className="gap-1 sm:gap-1.5 h-7 sm:h-8 text-xs sm:text-sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedForCompare(new Set());
              }}
            >
              <GitCompare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">{compareMode ? t("prescriptionsPage.cancel") : t("prescriptionsPage.compare")}</span>
            </Button>
            {compareMode && selectedForCompare.size >= 2 && (
              <Button
                size="sm"
                onClick={() => setShowComparison(true)}
                className="gap-1 sm:gap-1.5 h-7 sm:h-8 text-xs sm:text-sm"
              >
                {t("prescriptionsPage.compare")} {selectedForCompare.size}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Compact Stats - inline colored dot pills */}
      <div className="flex sm:hidden gap-1.5 overflow-x-auto hide-scrollbar pb-0.5 -mx-1 px-1">
        {[
          { label: "Total", value: records.length, dotColor: "bg-primary" },
          { label: "Files", value: withFilesCount, dotColor: "bg-green-500" },
          { label: "Dupes", value: duplicateCount, dotColor: "bg-amber-500" },
          { label: "Latest", value: records[0]?.uploaded_at ? format(new Date(records[0].uploaded_at), "MMM d") : "—", dotColor: "bg-blue-500" },
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
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{records.length}</p>
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
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-amber-100">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Duplicates</p>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{duplicateCount}</p>
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
                {records[0]?.uploaded_at
                  ? format(new Date(records[0].uploaded_at), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{t("prescriptionsPage.noRecordsYet")}</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {t("prescriptionsPage.noRecordsDesc")}
            </p>
            <Button asChild className="bg-gradient-to-r from-primary to-secondary border-0">
              <Link to="/dashboard/upload">{t("prescriptionsPage.uploadFirstRecord")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Segmented control filter */}
          <div className="sm:hidden">
            <div className="flex overflow-x-auto hide-scrollbar rounded-xl bg-muted/40 p-1 gap-0.5 scroll-fade-right">
              {DISEASE_CATEGORIES.map((cat) => {
                const count = records.filter((r) => r.disease_category === cat.value).length;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setActiveTab(cat.value)}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 touch-target ${
                      activeTab === cat.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}{count > 0 ? ` ${count}` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: Disease Category Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="hidden sm:block">
              <TabsList className="grid w-full grid-cols-6 mb-4 sm:mb-6">
                {DISEASE_CATEGORIES.map((cat) => {
                  const count = records.filter((r) => r.disease_category === cat.value).length;
                  return (
                    <TabsTrigger
                      key={cat.value}
                      value={cat.value}
                      className="text-xs sm:text-sm px-3 sm:px-4"
                    >
                      {cat.label}
                      {count > 0 && (
                        <span className="ml-1 text-[10px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {DISEASE_CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value}>
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {globalSearch ? t("prescriptionsPage.noRecordsMatch") : t("prescriptionsPage.noRecordsInCategory")}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 sm:space-y-3">
                      {paginatedRecords.map((record) => {
                        const isExpanded = expandedRecordId === record.id;
                        const duplicateWarning = getDuplicateWarning(record.id);
                        const fileTypeBadge = getFileTypeBadge(record.file_type);
                        const recordTags = getTagsForRecord(record.id);

                        return (
                          <Collapsible
                            key={record.id}
                            open={isExpanded}
                            onOpenChange={() => setExpandedRecordId(isExpanded ? null : record.id)}
                          >
                            <Card
                              className={`rounded-xl hover:shadow-md transition-all duration-200 ${
                                compareMode && selectedForCompare.has(record.id)
                                  ? "border-primary ring-2 ring-primary/20"
                                  : ""
                              }`}
                            >
                              <CardContent className="p-2.5 sm:p-4">
                                {/* Header: icon + title + actions */}
                                <div className="flex items-center gap-2 sm:gap-4">
                                  {compareMode && (
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <Checkbox
                                        checked={selectedForCompare.has(record.id)}
                                        onCheckedChange={(checked) => {
                                          setSelectedForCompare((prev) => {
                                            const next = new Set(prev);
                                            if (checked && next.size < 3) {
                                              next.add(record.id);
                                            } else {
                                              next.delete(record.id);
                                            }
                                            return next;
                                          });
                                        }}
                                        disabled={!selectedForCompare.has(record.id) && selectedForCompare.size >= 3}
                                      />
                                    </div>
                                  )}
                                  <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-primary/10 flex-shrink-0">
                                    <FileText className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                                  </div>
                                  <h4 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0">
                                    {record.title}
                                  </h4>
                                  {/* Desktop action buttons */}
                                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => setSelectedRecord(record)}
                                      title="View details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleDownload(record)}
                                      disabled={!signedUrls[record.id]}
                                      title="Download"
                                    >
                                      {loadingUrls.has(record.id) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Download className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                          disabled={isDeleting}
                                          title="Delete"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete "{record.title}"?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => deleteRecord(record)}
                                          >
                                            {t("common.delete")}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
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
                                  <Badge className={`text-[10px] sm:text-xs ${fileTypeBadge.className} border-0`}>
                                    {fileTypeBadge.label}
                                  </Badge>
                                  {record.category && (
                                    <Badge variant="outline" className="text-[10px] sm:text-xs capitalize">
                                      {formatCategory(record.category)}
                                    </Badge>
                                  )}
                                  {duplicateWarning && (
                                    <Badge className="text-[10px] sm:text-xs bg-amber-100 text-amber-700 border-amber-200 gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Duplicate
                                    </Badge>
                                  )}
                                </div>

                                {/* Description preview */}
                                {record.description && (
                                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 line-clamp-2">
                                    {record.description}
                                  </p>
                                )}

                                {/* Metadata row */}
                                <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                                  {record.provider_name && (
                                    <span className="hidden sm:flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {record.provider_name}
                                    </span>
                                  )}
                                  {record.record_date && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(record.record_date), "MMM d, yyyy")}
                                      <span className="text-muted-foreground/60 hidden sm:inline">
                                        ({formatDistanceToNow(new Date(record.record_date), { addSuffix: true })})
                                      </span>
                                    </span>
                                  )}
                                  {recordTags.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Tag className="h-3 w-3" />
                                      {recordTags.map((t) => t.tag_name).join(", ")}
                                    </span>
                                  )}
                                </div>

                                {/* Expanded Detail */}
                                <CollapsibleContent>
                                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50 space-y-3 sm:space-y-4">
                                    {/* Mobile: show provider name in expanded view */}
                                    {record.provider_name && (
                                      <div className="flex sm:hidden items-center gap-1.5 text-xs text-muted-foreground">
                                        <User className="h-3 w-3" />
                                        <span>{record.provider_name}</span>
                                      </div>
                                    )}
                                    {/* Mobile action buttons - full width */}
                                    <div className="flex sm:hidden gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-10 text-xs gap-1.5"
                                        onClick={() => setSelectedRecord(record)}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                        View
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 h-10 text-xs gap-1.5"
                                        onClick={() => handleDownload(record)}
                                        disabled={!signedUrls[record.id]}
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                        Download
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-10 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                                            disabled={isDeleting}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Are you sure you want to delete "{record.title}"?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                            <AlertDialogAction
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              onClick={() => deleteRecord(record)}
                                            >
                                              {t("common.delete")}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>

                                    {record.description && (
                                      <div>
                                        <p className="text-xs text-muted-foreground font-medium mb-1">Description</p>
                                        <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                          {record.description}
                                        </div>
                                      </div>
                                    )}

                                    {record.notes && (
                                      <div>
                                        <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                                        <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                                          {record.notes}
                                        </div>
                                      </div>
                                    )}

                                    {/* Tag Manager */}
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium mb-1">Tags</p>
                                      <RecordTagManager
                                        recordId={record.id}
                                        tags={recordTags}
                                        allTagNames={allTagNames}
                                        onAddTag={addTag}
                                        onRemoveTag={removeTag}
                                        isAdding={isAdding}
                                      />
                                    </div>

                                    {duplicateWarning && (
                                      <div className="flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                        {duplicateWarning.reason}
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                                      {record.record_date && (
                                        <div>
                                          <p className="text-xs text-muted-foreground font-medium">Date</p>
                                          <p className="text-sm font-medium">
                                            {format(new Date(record.record_date), "MMMM d, yyyy")}
                                          </p>
                                        </div>
                                      )}
                                      {record.provider_name && (
                                        <div>
                                          <p className="text-xs text-muted-foreground font-medium">Provider</p>
                                          <p className="text-sm font-medium">{record.provider_name}</p>
                                        </div>
                                      )}
                                      {record.category && (
                                        <div>
                                          <p className="text-xs text-muted-foreground font-medium">Category</p>
                                          <p className="text-sm font-medium capitalize">{formatCategory(record.category)}</p>
                                        </div>
                                      )}
                                      {record.file_type && (
                                        <div>
                                          <p className="text-xs text-muted-foreground font-medium">File Type</p>
                                          <p className="text-sm font-medium">{record.file_type}</p>
                                        </div>
                                      )}
                                      {record.file_size && (
                                        <div>
                                          <p className="text-xs text-muted-foreground font-medium">File Size</p>
                                          <p className="text-sm font-medium">
                                            {(record.file_size / 1024).toFixed(1)} KB
                                          </p>
                                        </div>
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
                    <DataTablePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      hasNextPage={hasNextPage}
                      hasPrevPage={hasPrevPage}
                    />
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
      </>}

      {/* Record Detail Dialog */}
      <RecordDetailDialog
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        record={selectedRecord}
        signedUrl={selectedRecord ? signedUrls[selectedRecord.id] : null}
        onGetSignedUrl={selectedRecord ? () => resolveRecordUrl(selectedRecord) : undefined}
        onDelete={selectedRecord ? () => {
          deleteRecord(selectedRecord);
          setSelectedRecord(null);
        } : undefined}
        isDeleting={isDeleting}
      />

      {/* Record Comparison Dialog */}
      <RecordComparisonDialog
        open={showComparison}
        onOpenChange={(open) => {
          setShowComparison(open);
          if (!open) {
            setCompareMode(false);
            setSelectedForCompare(new Set());
          }
        }}
        records={records.filter((r) => selectedForCompare.has(r.id))}
      />
    </div>
    </PullToRefresh>
  );
};

export default PrescriptionsPage;
