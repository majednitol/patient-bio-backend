import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfSafe } from "@/utils/pdfSafe";

const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
];

const STAKEHOLDER_FILTERS = [
  { value: "all", label: "All Stakeholders" },
  { value: "doctor", label: "Doctors" },
  { value: "hospital", label: "Hospitals" },
  { value: "insurance", label: "Insurance" },
  { value: "pharmacy", label: "Pharmacies" },
  { value: "government", label: "Government" },
  { value: "researcher", label: "Researchers" },
];

interface AuditTrailExportProps {
  compact?: boolean;
}

const AuditTrailExport = ({ compact = false }: AuditTrailExportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30");
  const [stakeholderFilter, setStakeholderFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");

  const fetchAuditData = async () => {
    if (!user?.id) return [];

    const since = subDays(new Date(), parseInt(dateRange)).toISOString();
    const allLogs: any[] = [];
    const pageSize = 500;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from("access_logs")
        .select("id, user_id, accessor_type, accessor_name, accessor_email, access_reason, accessed_at, ip_address, city, country, user_agent, access_token_id, created_at")
        .eq("user_id", user.id)
        .gte("accessed_at", since)
        .order("accessed_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      allLogs.push(...(data || []));
      hasMore = (data?.length || 0) === pageSize;
      page++;
    }

    return allLogs;
  };

  const exportAsCSV = async () => {
    const logs = await fetchAuditData();

    const headers = ["Date", "Accessor", "Email", "Type", "Location", "Reason", "Verified Name", "Verified Org"];
    const rows = logs.map((log) => [
      format(new Date(log.accessed_at), "yyyy-MM-dd HH:mm:ss"),
      log.accessor_name || "Anonymous",
      log.accessor_email || "",
      log.accessor_type || "",
      [log.city, log.country].filter(Boolean).join(", ") || "Unknown",
      log.access_reason || "",
      (log as any).verified_recipient_name || "",
      (log as any).verified_recipient_org || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPDF = async () => {
    const logs = await fetchAuditData();

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Compliance Audit Trail Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP 'at' p")}`, 14, 30);
    doc.text(`Period: Last ${dateRange} days`, 14, 36);
    doc.text(`Total Access Events: ${logs.length}`, 14, 42);

    autoTable(doc, {
      startY: 50,
      head: [["Date", "Accessor", "Type", "Location", "Verified"]],
      body: logs.map((log) => [
        format(new Date(log.accessed_at), "MMM d, yyyy HH:mm"),
        pdfSafe(log.accessor_name || log.accessor_email) || "Anonymous",
        pdfSafe(log.accessor_type) || "link",
        pdfSafe([log.city, log.country].filter(Boolean).join(", ")) || "Unknown",
        (log as any).verified_recipient_name ? "Yes" : "No",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`audit-trail-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === "csv") {
        await exportAsCSV();
      } else {
        await exportAsPDF();
      }
      toast({ title: "Report Exported", description: `Audit trail exported as ${exportFormat.toUpperCase()}` });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (compact) {
    return (
      <Button variant="outline" onClick={handleExport} disabled={isExporting} className="gap-2">
        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Export Audit Trail
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Compliance Report Export
        </CardTitle>
        <CardDescription>Generate audit trail reports for regulatory compliance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Time Period</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Stakeholder</Label>
            <Select value={stakeholderFilter} onValueChange={setStakeholderFilter}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAKEHOLDER_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Format</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "pdf" | "csv")}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Report</SelectItem>
                <SelectItem value="csv">CSV Data</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleExport} disabled={isExporting} className="w-full">
          {isExporting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Report...</>
          ) : (
            <><Download className="mr-2 h-4 w-4" />Export {exportFormat.toUpperCase()} Report</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AuditTrailExport;
