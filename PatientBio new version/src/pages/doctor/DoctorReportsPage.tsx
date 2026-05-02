import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Users,
  Pill,
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  CalendarRange,
  Eye,
  Share2,
  CheckCircle,
} from "lucide-react";
import { useDoctorReports } from "@/hooks/useDoctorReports";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

type ReportType = "appointments" | "patients" | "prescriptions" | "summary";
type ExportFormat = "csv" | "pdf";
type DatePreset = "this_month" | "last_month" | "last_30" | "last_90" | "custom";

interface ReportCard {
  type: ReportType;
  title: string;
  description: string;
  icon: typeof CalendarDays;
}

const reportCards: ReportCard[] = [
  {
    type: "appointments",
    title: "Appointment Report",
    description: "Export appointment history with dates, patient names, status, and consultation duration.",
    icon: CalendarDays,
  },
  {
    type: "patients",
    title: "Patient List",
    description: "Export your full patient roster with demographics and connection dates.",
    icon: Users,
  },
  {
    type: "prescriptions",
    title: "Prescription Report",
    description: "Export prescription history with diagnoses, medications, and status.",
    icon: Pill,
  },
  {
    type: "summary",
    title: "Practice Summary",
    description: "Overview with patient counts, revenue estimate, top diagnoses, and no-show rates.",
    icon: BarChart3,
  },
];

const presetLabels: Record<DatePreset, string> = {
  this_month: "This Month",
  last_month: "Last Month",
  last_30: "Last 30 Days",
  last_90: "Last 90 Days",
  custom: "Custom Range",
};

const DoctorReportsPage = () => {
  const { exportReport, isExporting, counts } = useDoctorReports();
  const [activeExport, setActiveExport] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [previewType, setPreviewType] = useState<ReportType | null>(null);
  const [sharedReport, setSharedReport] = useState<string | null>(null);

  const dateRange = (() => {
    const now = new Date();
    switch (datePreset) {
      case "this_month": return { from: startOfMonth(now), to: now };
      case "last_month": return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
      case "last_30": return { from: subDays(now, 29), to: now };
      case "last_90": return { from: subDays(now, 89), to: now };
      case "custom": return { from: customFrom || subDays(now, 29), to: customTo || now };
    }
  })();

  const handleExport = async (type: ReportType, fmt: ExportFormat) => {
    const key = `${type}-${fmt}`;
    setActiveExport(key);
    try {
      await exportReport(type, fmt);
      toast.success(`${reportCards.find((r) => r.type === type)?.title} exported as ${fmt.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.");
    } finally {
      setActiveExport(null);
    }
  };

  const handleShare = (type: ReportType) => {
    setSharedReport(type);
    toast.success("Report link copied — share with your hospital admin");
    setTimeout(() => setSharedReport(null), 3000);
  };

  const getCount = (type: ReportType) => {
    switch (type) {
      case "appointments": return counts.appointments;
      case "patients": return counts.patients;
      case "prescriptions": return counts.prescriptions;
      default: return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 animate-fade-in">
        <div className="bg-primary/10 p-2 sm:p-2.5 rounded-xl">
          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Reports & Export</h1>
          <p className="text-sm text-muted-foreground">
            Generate and download practice reports
          </p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="animate-fade-in" style={{ animationDelay: "0.03s", animationFillMode: "both" }}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date Range</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(presetLabels) as DatePreset[]).filter(k => k !== "custom").map((key) => (
                <Button
                  key={key}
                  variant={datePreset === key ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setDatePreset(key)}
                >
                  {presetLabels[key]}
                </Button>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={datePreset === "custom" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setDatePreset("custom")}
                  >
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">From</p>
                      <Calendar
                        mode="single"
                        selected={customFrom}
                        onSelect={(d) => { setCustomFrom(d); setDatePreset("custom"); }}
                        disabled={{ after: new Date() }}
                        className="rounded-md border"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">To</p>
                      <Calendar
                        mode="single"
                        selected={customTo}
                        onSelect={(d) => { setCustomTo(d); setDatePreset("custom"); }}
                        disabled={{ after: new Date(), before: customFrom }}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Badge variant="secondary" className="text-xs ml-auto">
              {format(dateRange.from, "MMM d")} — {format(dateRange.to, "MMM d, yyyy")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reportCards.map((report) => {
          const count = getCount(report.type);
          const isLoadingCSV = activeExport === `${report.type}-csv`;
          const isLoadingPDF = activeExport === `${report.type}-pdf`;
          const isDisabled = isExporting;
          const isShared = sharedReport === report.type;

          return (
            <Card
              key={report.type}
              className="animate-fade-in transition-all duration-300 hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      {count !== null && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {count} records
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2 text-xs">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {/* Preview indicator */}
                {previewType === report.type && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/50 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    Preview: {format(dateRange.from, "MMM d")} — {format(dateRange.to, "MMM d, yyyy")}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={isDisabled}
                    onClick={() => {
                      setPreviewType(report.type);
                      handleExport(report.type, "csv");
                    }}
                  >
                    {isLoadingCSV ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    )}
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={isDisabled}
                    onClick={() => {
                      setPreviewType(report.type);
                      handleExport(report.type, "pdf");
                    }}
                  >
                    {isLoadingPDF ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2.5 gap-1"
                    onClick={() => handleShare(report.type)}
                  >
                    {isShared ? (
                      <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorReportsPage;
