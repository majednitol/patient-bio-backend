import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Prescription } from "@/hooks/usePrescriptions";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  FileText,
  Pill,
  Microscope,
  Calendar,
  Download,
  Eye,
  Activity,
  Clock,
  Search,
  Filter,
  X,
  TrendingUp,
} from "lucide-react";

interface TimelineItem {
  id: string;
  type: "prescription" | "record" | "report";
  title: string;
  description?: string;
  date: Date;
  status?: string;
  metadata?: Record<string, any>;
  onView?: () => void;
  onDownload?: () => void;
}

type FilterType = "all" | "prescription" | "record" | "report";

interface PatientHistoryTimelineProps {
  prescriptions: Prescription[];
  records: any[];
  pathologistReports?: any[];
  onViewPrescription?: (prescription: Prescription) => void;
  onViewRecord?: (record: any) => void;
  onDownloadRecord?: (record: any) => void;
}

const typeConfig = {
  prescription: {
    icon: Pill,
    label: "Prescriptions",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    border: "border-emerald-200 dark:border-emerald-800",
    line: "bg-emerald-200 dark:bg-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  record: {
    icon: FileText,
    label: "Records",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/40",
    border: "border-blue-200 dark:border-blue-800",
    line: "bg-blue-200 dark:bg-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  report: {
    icon: Microscope,
    label: "Reports",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-900/40",
    border: "border-violet-200 dark:border-violet-800",
    line: "bg-violet-200 dark:bg-violet-800",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300",
    dot: "bg-violet-500",
  },
};

export const PatientHistoryTimeline = ({
  prescriptions,
  records,
  pathologistReports = [],
  onViewPrescription,
  onViewRecord,
  onDownloadRecord,
}: PatientHistoryTimelineProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const allItems = useMemo(() => {
    const items: TimelineItem[] = [];

    prescriptions.forEach((rx) => {
      if (!rx.created_at) return;
      items.push({
        id: `rx-${rx.id}`,
        type: "prescription",
        title: rx.diagnosis || "Prescription",
        description: `${rx.medications.length} medication${rx.medications.length !== 1 ? "s" : ""}`,
        date: parseISO(rx.created_at),
        status: rx.is_active ? "active" : "completed",
        metadata: rx,
        onView: onViewPrescription ? () => onViewPrescription(rx) : undefined,
      });
    });

    records.forEach((record: any) => {
      items.push({
        id: `rec-${record.id}`,
        type: "record",
        title: record.title,
        description: record.category || record.disease_category,
        date: record.record_date ? parseISO(record.record_date) : record.uploaded_at ? parseISO(record.uploaded_at) : new Date(),
        metadata: record,
        onView: onViewRecord ? () => onViewRecord(record) : undefined,
        onDownload: onDownloadRecord ? () => onDownloadRecord(record) : undefined,
      });
    });

    pathologistReports.forEach((report: any) => {
      if (!report.created_at) return;
      items.push({
        id: `report-${report.id}`,
        type: "report",
        title: report.report_name,
        description: report.report_type || report.disease_category,
        date: parseISO(report.created_at),
        status: report.is_shared_with_doctor ? "shared" : "pending",
        metadata: report,
      });
    });

    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [prescriptions, records, pathologistReports, onViewPrescription, onViewRecord, onDownloadRecord]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (activeFilter !== "all" && item.type !== activeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allItems, activeFilter, searchQuery]);

  // Stats
  const counts = useMemo(() => ({
    prescription: allItems.filter((i) => i.type === "prescription").length,
    record: allItems.filter((i) => i.type === "record").length,
    report: allItems.filter((i) => i.type === "report").length,
  }), [allItems]);

  // Group by month
  const groupedItems = useMemo(() => {
    const groups: { label: string; items: TimelineItem[] }[] = [];
    let currentLabel = "";
    filteredItems.forEach((item) => {
      const label = format(item.date, "MMMM yyyy");
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  }, [filteredItems]);

  if (allItems.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No Health History</h3>
          <p className="text-sm text-muted-foreground text-center">
            This patient has no prescriptions, records, or reports yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: "all", label: `All (${allItems.length})` },
    { key: "prescription", label: `Rx (${counts.prescription})` },
    { key: "record", label: `Records (${counts.record})` },
    { key: "report", label: `Reports (${counts.report})` },
  ];

  return (
    <div className="space-y-3">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {(["prescription", "record", "report"] as const).map((type) => {
          const cfg = typeConfig[type];
          const Icon = cfg.icon;
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(activeFilter === type ? "all" : type)}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-200",
                activeFilter === type
                  ? `${cfg.bg} ${cfg.border} ring-1 ring-offset-1 ring-current scale-[1.02]`
                  : "bg-card border-border hover:bg-muted/50"
              )}
            >
              <div className={cn("p-1.5 rounded-md", cfg.bg)}>
                <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none">{counts[type]}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search timeline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {filterButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={activeFilter === btn.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(btn.key)}
              className="h-8 text-xs px-2 whitespace-nowrap"
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Timeline
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {filteredItems.length} of {allItems.length} items
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <ScrollArea className="h-[360px] pr-3">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Filter className="h-8 w-8 mb-2" />
                <p className="text-sm">No results match your filter</p>
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs mt-1"
                  onClick={() => {
                    setActiveFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedItems.map((group) => (
                  <div key={group.label}>
                    {/* Month header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Calendar className="h-3 w-3" />
                        {group.label}
                      </div>
                      <div className="flex-1 h-px bg-border" />
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {group.items.length}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="relative ml-3">
                      {group.items.map((item, index) => {
                        const cfg = typeConfig[item.type];
                        const Icon = cfg.icon;

                        return (
                          <div
                            key={item.id}
                            className="relative flex gap-3 pb-4 last:pb-0 group animate-fade-in"
                            style={{ animationDelay: `${index * 0.03}s`, animationFillMode: "both" }}
                          >
                            {/* Vertical line */}
                            {index < group.items.length - 1 && (
                              <div className={cn("absolute left-[13px] top-8 w-0.5 h-[calc(100%-16px)]", cfg.line)} />
                            )}

                            {/* Icon node */}
                            <div className={cn(
                              "relative z-10 p-1.5 rounded-full border shrink-0 transition-transform duration-200 group-hover:scale-110",
                              cfg.bg, cfg.border
                            )}>
                              <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                            </div>

                            {/* Content card */}
                            <div className={cn(
                              "flex-1 min-w-0 p-2.5 rounded-lg border transition-all duration-200",
                              "bg-card hover:bg-muted/30 hover:shadow-sm",
                              "group-hover:border-primary/20"
                            )}>
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm truncate">{item.title}</p>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                  )}
                                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <span className="text-[11px] text-muted-foreground">
                                      {format(item.date, "MMM d, h:mm a")}
                                    </span>
                                    {item.status && (
                                      <Badge
                                        variant={item.status === "active" || item.status === "shared" ? "default" : "secondary"}
                                        className="text-[10px] px-1.5 py-0 h-4"
                                      >
                                        {item.status}
                                      </Badge>
                                    )}
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize", cfg.badge)}>
                                      {item.type}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {item.onView && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={item.onView}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  )}
                                  {item.onDownload && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={item.onDownload}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
