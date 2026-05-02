import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { useHospitalLabOrders } from "@/hooks/useHospitalLabOrders";
import LabOrderCard from "@/components/hospital/LabOrderCard";
import { ViewLabResultsDialog } from "@/components/hospital/ViewLabResultsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlaskConical, Search, Clock, Loader2, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending_consent", label: "Pending Consent" },
  { value: "ordered", label: "Ordered" },
  { value: "sample_collected", label: "Sample Collected" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const URGENCY_ORDER = { stat: 0, urgent: 1, routine: 2 } as const;

const URGENCY_FILTERS = [
  { value: "all", label: "All", className: "bg-secondary text-secondary-foreground" },
  { value: "stat", label: "STAT", className: "bg-red-100 text-red-700 hover:bg-red-200" },
  { value: "urgent", label: "Urgent", className: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
  { value: "routine", label: "Routine", className: "bg-muted text-muted-foreground hover:bg-muted/80" },
] as const;

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

function getDateRangeStart(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "today": return startOfDay(now);
    case "week": return startOfWeek(now, { weekStartsOn: 1 });
    case "month": return startOfMonth(now);
    default: return null;
  }
}

export default function HospitalLabOrdersPage() {
  const { hospital } = useOutletContext<HospitalContext>();
  const { orders, isLoading, updateOrderStatus, cancelOrder } = useHospitalLabOrders(hospital.id);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [viewResultsOrderId, setViewResultsOrderId] = useState<string | null>(null);

  // Summary counts
  const pendingCount = orders.filter(
    (o) => o.status === "ordered" || o.status === "sample_collected" || o.status === "pending_consent"
  ).length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const statUrgentCount = orders.filter(
    (o) =>
      (o.urgency === "stat" || o.urgency === "urgent") &&
      o.status !== "completed" &&
      o.status !== "cancelled"
  ).length;

  const filtered = useMemo(() => {
    const rangeStart = getDateRangeStart(dateRange);
    return orders
      .filter((o) => tab === "all" || o.status === tab)
      .filter((o) => urgencyFilter === "all" || o.urgency === urgencyFilter)
      .filter((o) => {
        if (!rangeStart) return true;
        return new Date(o.created_at) >= rangeStart;
      })
      .filter((o) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          o.patient_profile?.display_name?.toLowerCase().includes(q) ||
          o.tests.some((t) => t.name.toLowerCase().includes(q)) ||
          o.clinical_notes?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  }, [orders, tab, urgencyFilter, dateRange, search]);

  const getCount = (status: string) =>
    status === "all" ? orders.length : orders.filter((o) => o.status === status).length;

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Patient", "Tests", "Status", "Urgency", "Ordered", "Completed", "Total Price"];
    const rows = filtered.map((o) => [
      o.patient_profile?.display_name || "Unknown",
      o.tests.map((t) => t.name).join("; "),
      o.status,
      o.urgency,
      format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
      o.completed_at ? format(new Date(o.completed_at), "yyyy-MM-dd HH:mm") : "",
      o.tests.reduce((sum, t) => sum + (t.price || 0), 0).toString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lab-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            Lab Orders
          </h1>
          <p className="text-muted-foreground">
            Track all lab orders across departments
          </p>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pending Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Loader2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{processingCount}</p>
              <p className="text-xs text-muted-foreground">In Processing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-full ${statUrgentCount > 0 ? "bg-red-100" : "bg-muted"}`}>
              <AlertTriangle className={`h-5 w-5 ${statUrgentCount > 0 ? "text-red-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${statUrgentCount > 0 ? "text-red-600" : ""}`}>{statUrgentCount}</p>
              <p className="text-xs text-muted-foreground">STAT / Urgent Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Urgency Filter + Date Range + Export */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, test, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {URGENCY_FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={urgencyFilter === f.value ? "default" : "outline"}
              className={urgencyFilter === f.value ? f.className : ""}
              onClick={() => setUrgencyFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label} ({getCount(t.value)})
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No lab orders found</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((order) => (
                  <LabOrderCard
                    key={order.id}
                    order={order}
                    onCollectSample={(id) =>
                      updateOrderStatus.mutate({ orderId: id, status: "sample_collected" })
                    }
                    onViewResults={(id) => setViewResultsOrderId(id)}
                    onCancel={(id) => cancelOrder.mutate(id)}
                    isUpdating={updateOrderStatus.isPending || cancelOrder.isPending}
                    showPatientInfo
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* View Results Dialog */}
      <ViewLabResultsDialog
        orderId={viewResultsOrderId}
        open={!!viewResultsOrderId}
        onOpenChange={(open) => {
          if (!open) setViewResultsOrderId(null);
        }}
      />
    </div>
  );
}