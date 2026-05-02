import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, Shield, Download, CheckCircle2, AlertTriangle,
  Clock, FileCheck, Lock, Users, Eye, ChevronRight, ChevronDown,
  Globe, BarChart3, ArrowLeftRight
} from "lucide-react";
import { useComplianceReports, ReportType, ComplianceReport } from "@/hooks/useComplianceReports";
import { format, subDays } from "date-fns";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { tooltipStyle, COLORS } from "@/components/doctor/analytics/AnalyticsChartTypes";

const reportTypeLabels: Record<ReportType, { label: string; icon: React.ElementType; description: string }> = {
  hipaa_audit: { label: "HIPAA Audit Report", icon: Shield, description: "Comprehensive audit of PHI access and security controls" },
  gdpr_dsar: { label: "GDPR DSAR Report", icon: FileCheck, description: "Data Subject Access Request compliance report" },
  access_report: { label: "Access Report", icon: Eye, description: "Detailed log of all data access events" },
  consent_report: { label: "Consent Report", icon: Users, description: "Summary of patient consent records and statuses" },
  security_incident: { label: "Security Incident", icon: AlertTriangle, description: "Security incident documentation and response" },
  cross_border: { label: "Cross-Border Transfer", icon: Globe, description: "GDPR cross-border data transfer compliance report" },
};

const CHART_COLORS = COLORS;

// PDF generation using LazyPDFExport
async function exportReportPDF(report: ComplianceReport) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  let y = margin;

  const config = reportTypeLabels[report.report_type as ReportType];

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(config?.label || report.report_type, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `Period: ${format(new Date(report.report_period_start), "MMM d, yyyy")} - ${format(new Date(report.report_period_end), "MMM d, yyyy")}`,
    margin, y
  );
  y += 5;
  doc.text(`Generated: ${format(new Date(report.created_at), "MMM d, yyyy h:mm a")}`, margin, y);
  doc.setTextColor(0);
  y += 10;

  const data = report.report_data as Record<string, unknown>;
  const rows: string[][] = [];

  for (const [key, value] of Object.entries(data)) {
    const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    if (typeof value === "number") {
      rows.push([label, String(value)]);
    } else if (typeof value === "string") {
      rows.push([label, value]);
    } else if (Array.isArray(value)) {
      rows.push([label, value.length > 0 ? value.join(", ") : "None"]);
    } else if (typeof value === "object" && value !== null) {
      const subEntries = Object.entries(value as Record<string, unknown>);
      rows.push([label, subEntries.map(([k, v]) => `${k}: ${v}`).join(", ")]);
    }
  }

  autoTable(doc, {
    head: [["Metric", "Value"]],
    body: rows,
    startY: y,
    margin: { left: margin, right: margin },
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124, 58, 237] },
  });

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Report ID: ${report.id}`, margin, doc.internal.pageSize.getHeight() - 10);

  doc.save(`compliance-${report.report_type}-${report.id.slice(0, 8)}.pdf`);
}

// Helper to render chart data from object
function objectToChartData(obj: Record<string, number> | unknown): Array<{ name: string; value: number }> {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj as Record<string, number>).map(([name, value]) => ({ name, value: Number(value) || 0 }));
}

const ComplianceReportsPage = () => {
  const { t } = useTranslation();
  const { reports, isLoading, generateReport, isGenerating, verifyAuditIntegrity, isVerifying } = useComplianceReports();
  const [reportType, setReportType] = useState<ReportType>("hipaa_audit");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [integrityResult, setIntegrityResult] = useState<{
    total_entries: number; verified_entries: number; broken_chain_count: number; integrity_percentage: number;
  } | null>(null);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  const handleGenerateReport = async () => {
    await generateReport({ report_type: reportType, start_date: startDate, end_date: endDate });
  };

  const handleVerifyIntegrity = async () => {
    const result = await verifyAuditIntegrity({ start_date: startDate, end_date: endDate });
    setIntegrityResult(result);
  };

  const handleExportPDF = useCallback(async (report: ComplianceReport) => {
    try {
      await exportReportPDF(report);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  }, []);

  const toggleCompareSelection = (id: string) => {
    setCompareSelection(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const compareReports = compareSelection.length === 2
    ? [reports.find(r => r.id === compareSelection[0]), reports.find(r => r.id === compareSelection[1])]
    : [null, null];

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("complianceReports.title", "Compliance Reports")}</h1>
          <p className="text-muted-foreground">
            {t("complianceReports.subtitle", "Generate HIPAA, GDPR, and security compliance reports")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">{t("complianceReports.generateTab", "Generate Report")}</TabsTrigger>
          <TabsTrigger value="history">{t("complianceReports.historyTab", "Report History")} ({reports.length})</TabsTrigger>
          <TabsTrigger value="compare">
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            {t("complianceReports.compareTab", "Compare")}
          </TabsTrigger>
          <TabsTrigger value="integrity">{t("complianceReports.integrityTab", "Audit Integrity")}</TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("complianceReports.config", "Report Configuration")}</CardTitle>
                <CardDescription>{t("complianceReports.configDesc", "Select report type and date range")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("complianceReports.reportType", "Report Type")}</Label>
                  <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(reportTypeLabels).map(([key, { label, icon: Icon }]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("complianceReports.startDate", "Start Date")}</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("complianceReports.endDate", "End Date")}</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleGenerateReport} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <><Clock className="h-4 w-4 mr-2 animate-spin" />{t("complianceReports.generating", "Generating...")}</>
                  ) : (
                    <><FileText className="h-4 w-4 mr-2" />{t("complianceReports.generate", "Generate Report")}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Report Type Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {(() => { const Icon = reportTypeLabels[reportType].icon; return <Icon className="h-5 w-5 text-primary" />; })()}
                  {reportTypeLabels[reportType].label}
                </CardTitle>
                <CardDescription>{reportTypeLabels[reportType].description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportTypeChecklist reportType={reportType} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Report History Tab */}
        <TabsContent value="history" className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg">{t("complianceReports.noReports", "No Reports Yet")}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {t("complianceReports.noReportsDesc", "Generate your first compliance report to get started.")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <ReportHistoryCard
                  key={report.id}
                  report={report}
                  onViewDetails={() => setSelectedReport(report)}
                  onExportPDF={() => handleExportPDF(report)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                {t("complianceReports.compareTitle", "Compare Reports")}
              </CardTitle>
              <CardDescription>
                {t("complianceReports.compareDesc", "Select two reports of the same type to compare metrics side-by-side")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reports.filter(r => r.status === "completed").map((report) => {
                  const config = reportTypeLabels[report.report_type as ReportType];
                  return (
                    <label key={report.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={compareSelection.includes(report.id)}
                        onCheckedChange={() => toggleCompareSelection(report.id)}
                        disabled={!compareSelection.includes(report.id) && compareSelection.length >= 2}
                      />
                      <span className="text-sm font-medium">{config?.label || report.report_type}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(report.report_period_start), "MMM d")} - {format(new Date(report.report_period_end), "MMM d, yyyy")}
                      </span>
                    </label>
                  );
                })}
              </div>
              {compareSelection.length === 2 && compareReports[0] && compareReports[1] && (
                <ComparisonView reportA={compareReports[0]} reportB={compareReports[1]} />
              )}
              {compareSelection.length < 2 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("complianceReports.selectTwo", "Select 2 completed reports to compare")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Integrity Tab */}
        <TabsContent value="integrity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                {t("complianceReports.integrityTitle", "Cryptographic Audit Trail Verification")}
              </CardTitle>
              <CardDescription>
                {t("complianceReports.integrityDesc", "Verify the integrity of the SHA-256 hash chain in the audit trail")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("complianceReports.startDateOptional", "Start Date (Optional)")}</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("complianceReports.endDateOptional", "End Date (Optional)")}</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleVerifyIntegrity} disabled={isVerifying} className="w-full">
                    {isVerifying ? t("complianceReports.verifying", "Verifying...") : t("complianceReports.verify", "Verify Integrity")}
                  </Button>
                </div>
              </div>

              {integrityResult && (
                <div className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    {integrityResult.integrity_percentage === 100 ? (
                      <>
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                        <div>
                          <h3 className="font-semibold text-green-600">{t("complianceReports.verified", "Audit Trail Verified")}</h3>
                          <p className="text-sm text-muted-foreground">{t("complianceReports.verifiedDesc", "All entries in the hash chain are valid and unmodified")}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                        <div>
                          <h3 className="font-semibold text-red-600">{t("complianceReports.integrityIssues", "Integrity Issues Detected")}</h3>
                          <p className="text-sm text-muted-foreground">{t("complianceReports.integrityIssuesDesc", "Some entries in the audit trail may have been tampered with")}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{integrityResult.total_entries}</div>
                      <div className="text-xs text-muted-foreground">{t("complianceReports.totalEntries", "Total Entries")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{integrityResult.verified_entries}</div>
                      <div className="text-xs text-muted-foreground">{t("complianceReports.verifiedCount", "Verified")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{integrityResult.broken_chain_count}</div>
                      <div className="text-xs text-muted-foreground">{t("complianceReports.brokenLinks", "Broken Links")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{integrityResult.integrity_percentage}%</div>
                      <div className="text-xs text-muted-foreground">{t("complianceReports.integrityScore", "Integrity Score")}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedReport && <ReportDetailView report={selectedReport} onExportPDF={() => handleExportPDF(selectedReport)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---- Sub-components ----

function ReportTypeChecklist({ reportType }: { reportType: ReportType }) {
  const checklists: Record<ReportType, string[]> = {
    hipaa_audit: ["PHI access log analysis", "Audit trail integrity verification", "Consent documentation review", "Security controls assessment"],
    gdpr_dsar: ["Personal data inventory", "Data processing activities", "Third-party data sharing", "Data retention compliance"],
    access_report: ["Access events by user type", "Geographic access patterns", "Data request statistics", "Unusual access detection"],
    consent_report: ["Active consent inventory", "Consent by type breakdown", "Revocation tracking", "Provider consent summary"],
    security_incident: ["Audit trail integrity check", "Anomalous access patterns", "Off-hours access detection", "Geographic concentration analysis"],
    cross_border: ["Transfer agreement inventory", "Jurisdiction pair analysis", "Transfer basis breakdown", "Consent coverage percentage"],
  };
  return (
    <ul className="space-y-2 text-sm">
      {checklists[reportType].map((item) => (
        <li key={item} className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ReportHistoryCard({ report, onViewDetails, onExportPDF }: { report: ComplianceReport; onViewDetails: () => void; onExportPDF: () => void }) {
  const { t } = useTranslation();
  const config = reportTypeLabels[report.report_type as ReportType];
  const Icon = config?.icon || FileText;

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
            <div>
              <h3 className="font-medium">{config?.label || report.report_type}</h3>
              <p className="text-sm text-muted-foreground">
                {format(new Date(report.report_period_start), "MMM d, yyyy")} - {format(new Date(report.report_period_end), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={report.status === "completed" ? "default" : "secondary"}>{report.status}</Badge>
            <span className="text-sm text-muted-foreground hidden md:inline">{format(new Date(report.created_at), "MMM d, h:mm a")}</span>
            {report.status === "completed" && (
              <Button variant="ghost" size="icon" onClick={onExportPDF} title={t("complianceReports.exportPDF", "Export PDF")}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onViewDetails}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {report.status === "completed" && report.report_data && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(report.report_data as Record<string, unknown>).slice(0, 4).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-lg font-bold">
                  {typeof value === "number" ? value : typeof value === "object" ? Object.keys(value as object).length : "-"}
                </div>
                <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportDetailView({ report, onExportPDF }: { report: ComplianceReport; onExportPDF: () => void }) {
  const { t } = useTranslation();
  const config = reportTypeLabels[report.report_type as ReportType];
  const Icon = config?.icon || FileText;
  const data = report.report_data as Record<string, unknown>;

  // Separate numeric, object (chartable), and other fields
  const numericFields: Array<[string, number]> = [];
  const objectFields: Array<[string, Record<string, number>]> = [];
  const otherFields: Array<[string, unknown]> = [];

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "number") numericFields.push([key, value]);
    else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length > 0 && entries.every(([, v]) => typeof v === "number")) {
        objectFields.push([key, value as Record<string, number>]);
      } else {
        otherFields.push([key, value]);
      }
    } else {
      otherFields.push([key, value]);
    }
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {config?.label || report.report_type}
        </DialogTitle>
        <p className="text-sm text-muted-foreground">
          {format(new Date(report.report_period_start), "MMM d, yyyy")} - {format(new Date(report.report_period_end), "MMM d, yyyy")}
          {" | "}{t("complianceReports.generatedOn", "Generated")}: {format(new Date(report.created_at), "MMM d, yyyy h:mm a")}
        </p>
      </DialogHeader>

      {/* Numeric KPIs */}
      {numericFields.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {numericFields.map(([key, value]) => (
            <div key={key} className="text-center p-3 border rounded-lg">
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      )}

      {/* Charts for object fields */}
      {objectFields.map(([key, obj]) => {
        const chartData = objectToChartData(obj);
        if (chartData.length === 0) return null;
        const useBar = chartData.length > 3;
        return (
          <Collapsible key={key} defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm py-2">
              <ChevronDown className="h-4 w-4" />
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="capitalize">{key.replace(/_/g, " ")}</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="h-48 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {useBar ? (
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Other fields */}
      {otherFields.map(([key, value]) => (
        <Collapsible key={key}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium text-sm py-2">
            <ChevronDown className="h-4 w-4" />
            <span className="capitalize">{key.replace(/_/g, " ")}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto mt-1">
              {JSON.stringify(value, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      ))}

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          {t("complianceReports.exportPDF", "Export PDF")}
        </Button>
      </div>
    </div>
  );
}

function ComparisonView({ reportA, reportB }: { reportA: ComplianceReport; reportB: ComplianceReport }) {
  const { t } = useTranslation();
  const dataA = reportA.report_data as Record<string, unknown>;
  const dataB = reportB.report_data as Record<string, unknown>;
  const allKeys = Array.from(new Set([...Object.keys(dataA), ...Object.keys(dataB)]));
  const numericKeys = allKeys.filter(k => typeof dataA[k] === "number" || typeof dataB[k] === "number");

  return (
    <div className="border rounded-lg overflow-hidden mt-4">
      <div className="grid grid-cols-3 bg-muted/50 p-3 text-sm font-medium">
        <div>{t("complianceReports.metric", "Metric")}</div>
        <div className="text-center">
          {format(new Date(reportA.report_period_start), "MMM d")} - {format(new Date(reportA.report_period_end), "MMM d")}
        </div>
        <div className="text-center">
          {format(new Date(reportB.report_period_start), "MMM d")} - {format(new Date(reportB.report_period_end), "MMM d")}
        </div>
      </div>
      {numericKeys.map((key) => {
        const valA = (dataA[key] as number) ?? 0;
        const valB = (dataB[key] as number) ?? 0;
        const delta = valB - valA;
        return (
          <div key={key} className="grid grid-cols-3 p-3 border-t text-sm">
            <div className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</div>
            <div className="text-center font-medium">{valA}</div>
            <div className="text-center font-medium flex items-center justify-center gap-2">
              {valB}
              {delta !== 0 && (
                <span className={`text-xs ${delta > 0 ? "text-green-600" : "text-red-600"}`}>
                  {delta > 0 ? "+" : ""}{delta}
                </span>
              )}
            </div>
          </div>
        );
      })}
      {numericKeys.length === 0 && (
        <div className="p-6 text-center text-sm text-muted-foreground">
          {t("complianceReports.noNumericMetrics", "No comparable numeric metrics found")}
        </div>
      )}
    </div>
  );
}

export default ComplianceReportsPage;
