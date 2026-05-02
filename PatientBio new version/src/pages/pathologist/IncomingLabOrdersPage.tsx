import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LabOperationsSummaryStrip } from "@/components/pathologist/LabOperationsSummaryStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Input } from "@/components/ui/input";
import {
  FlaskConical,
  Building2,
  Clock,
  TestTube,
  Loader2,
  CheckCircle,
  FileText,
  AlertCircle,
  Barcode,
  PackageCheck,
  Search,
  CalendarDays,
  Timer,
  Eye,
} from "lucide-react";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { useLabOrdersForPathologist, type IncomingLabOrder } from "@/hooks/useLabOrdersForPathologist";
import { useSampleTracking } from "@/hooks/useSampleTracking";
import { SampleTimeline } from "@/components/pathologist/SampleTimeline";
import { CompleteLabOrderDialog } from "@/components/pathologist/CompleteLabOrderDialog";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Clock }> = {
  ordered: { label: "New Order", variant: "default", icon: FlaskConical },
  sample_collected: { label: "Sample Ready", variant: "secondary", icon: TestTube },
  processing: { label: "Processing", variant: "outline", icon: Loader2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle },
};

const urgencyConfig: Record<string, { label: string; className: string }> = {
  routine: { label: "Routine", className: "bg-gray-100 text-gray-700" },
  urgent: { label: "Urgent", className: "bg-orange-100 text-orange-700" },
  stat: { label: "STAT", className: "bg-red-100 text-red-700 font-bold" },
};

function OrderCard({ 
  order, 
  onStartProcessing,
  onMarkReceived,
  onGenerateBarcode,
  onCompleteOrder,
  onViewResult,
  isGeneratingBarcode
}: { 
  order: IncomingLabOrder; 
  onStartProcessing: (order: IncomingLabOrder) => void;
  onMarkReceived: (order: IncomingLabOrder) => void;
  onGenerateBarcode: (order: IncomingLabOrder) => void;
  onCompleteOrder: (order: IncomingLabOrder) => void;
  onViewResult?: (order: IncomingLabOrder) => void;
  isGeneratingBarcode: boolean;
}) {
  const statusInfo = statusConfig[order.status] || statusConfig.ordered;
  const urgencyInfo = urgencyConfig[order.urgency];
  const StatusIcon = statusInfo.icon;

  const totalPrice = (order.tests as { name: string; price: number }[]).reduce(
    (sum, test) => sum + (test.price || 0),
    0
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* Header with barcode */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
              <span className={`text-xs px-2 py-0.5 rounded-full ${urgencyInfo.className}`}>
                {urgencyInfo.label}
              </span>
              {order.sample_barcode && (
                <Badge variant="outline" className="font-mono text-xs">
                  <Barcode className="h-3 w-3 mr-1" />
                  {order.sample_barcode}
                </Badge>
              )}
            </div>

            {/* Hospital info */}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{order.hospital?.name || "Unknown Hospital"}</span>
            </div>

            {/* Patient info */}
            <div className="text-sm">
              <span className="text-muted-foreground">Patient: </span>
              <span className="font-medium">
                {order.patient_profile?.display_name || "Unknown"}
              </span>
              {order.patient_profile?.patient_passport_id && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({order.patient_profile.patient_passport_id})
                </span>
              )}
            </div>

            {/* Ward/Bed info */}
            {order.admission?.bed && (
              <p className="text-xs text-muted-foreground">
                📍 {order.admission.bed.ward?.name} - Bed {order.admission.bed.bed_number}
              </p>
            )}

            {/* Mini Timeline */}
            <div className="py-2">
              <SampleTimeline order={order} compact />
            </div>

            {/* Tests */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tests requested:</p>
              <div className="flex flex-wrap gap-1">
                {(order.tests as { name: string; price: number }[]).map((test, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {test.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Clinical notes */}
            {order.clinical_notes && (
              <div className="p-2 bg-muted rounded text-sm">
                <span className="text-muted-foreground">Clinical Notes: </span>
                {order.clinical_notes}
              </div>
            )}

            {/* Timestamps, price, and TAT */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span>Ordered: {format(new Date(order.created_at), "MMM d, h:mm a")}</span>
              {order.status === "completed" && order.completed_at && (
                <>
                  <span>Completed: {format(new Date(order.completed_at), "MMM d, h:mm a")}</span>
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Timer className="h-3 w-3" />
                    TAT: {(() => {
                      const hours = differenceInHours(new Date(order.completed_at), new Date(order.created_at));
                      if (hours < 1) return `${differenceInMinutes(new Date(order.completed_at), new Date(order.created_at))}m`;
                      if (hours < 48) return `${hours}h`;
                      return `${Math.round(hours / 24)}d`;
                    })()}
                  </span>
                </>
              )}
              <span className="font-medium text-foreground">৳{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {/* Generate barcode if missing */}
            {!order.sample_barcode && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onGenerateBarcode(order)}
                disabled={isGeneratingBarcode}
              >
                {isGeneratingBarcode ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Barcode className="h-4 w-4 mr-1" />
                )}
                Generate Barcode
              </Button>
            )}
            
            {/* Mark received if sample collected but not received yet */}
            {order.status === "sample_collected" && !order.received_at && (
              <Button size="sm" variant="outline" onClick={() => onMarkReceived(order)}>
                <PackageCheck className="h-4 w-4 mr-1" />
                Mark Received
              </Button>
            )}

            {order.status === "ordered" && (
              <Button size="sm" variant="outline" disabled>
                <TestTube className="h-4 w-4 mr-1" />
                Awaiting Sample
              </Button>
            )}
            
            {order.status === "sample_collected" && order.received_at && (
              <Button size="sm" onClick={() => onStartProcessing(order)}>
                <Loader2 className="h-4 w-4 mr-1" />
                Start Processing
              </Button>
            )}

            {order.status === "processing" && (
              <Button size="sm" onClick={() => onCompleteOrder(order)}>
                <FileText className="h-4 w-4 mr-1" />
                Complete Order
              </Button>
            )}

            {order.status === "completed" && onViewResult && (
              <Button size="sm" variant="outline" onClick={() => onViewResult(order)}>
                <Eye className="h-4 w-4 mr-1" />
                View Result
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IncomingLabOrdersPage() {
  const { orders, isLoading, pendingCount, updateOrderStatus } = useLabOrdersForPathologist();
  const { generateBarcode, markSampleReceived, startProcessing } = useSampleTracking();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("pending");
  const [orderToComplete, setOrderToComplete] = useState<IncomingLabOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [completedDateRange, setCompletedDateRange] = useState<string>("7d");

  // Sort by urgency: stat > urgent > routine
  const urgencyOrder: Record<string, number> = { stat: 0, urgent: 1, routine: 2 };
  const sortByUrgency = (a: IncomingLabOrder, b: IncomingLabOrder) =>
    (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3);

  const filterOrders = (orderList: IncomingLabOrder[]) => {
    let filtered = orderList;
    if (urgencyFilter !== "all") {
      filtered = filtered.filter((o) => o.urgency === urgencyFilter);
    }
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase();
    return filtered.filter(
      (o) =>
        o.patient_profile?.display_name?.toLowerCase().includes(q) ||
        o.sample_barcode?.toLowerCase().includes(q) ||
        o.hospital?.name?.toLowerCase().includes(q)
    );
  };

  // STAT/Urgent active count (non-completed, non-cancelled)
  const statUrgentActive = orders.filter(
    (o) => (o.urgency === "stat" || o.urgency === "urgent") && o.status !== "completed"
  ).length;

  const pendingOrders = filterOrders(
    orders.filter(o => o.status === "ordered" || o.status === "sample_collected")
  ).sort(sortByUrgency);
  const processingOrders = filterOrders(
    orders.filter(o => o.status === "processing")
  ).sort(sortByUrgency);
  const completedOrders = useMemo(() => {
    let filtered = filterOrders(orders.filter(o => o.status === "completed"));
    // Apply date range filter
    const now = new Date();
    const daysMap: Record<string, number> = { "7d": 7, "14d": 14, "30d": 30 };
    const days = daysMap[completedDateRange];
    if (days) {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(o => new Date(o.completed_at || o.created_at) >= cutoff);
    }
    return filtered.sort(sortByUrgency);
  }, [orders, searchQuery, urgencyFilter, completedDateRange]);
  const handleStartProcessing = (order: IncomingLabOrder) => {
    if (order.status === "sample_collected" || (order.received_at && order.status !== "processing")) {
      startProcessing.mutate({ orderId: order.id });
    }
  };

  const handleCompleteOrder = (order: IncomingLabOrder) => {
    setOrderToComplete(order);
  };

  const handleMarkReceived = (order: IncomingLabOrder) => {
    markSampleReceived.mutate({ orderId: order.id });
  };

  const handleViewResult = async (order: IncomingLabOrder) => {
    // Try to find the linked report via hospital_lab_results
    const { data } = await supabase
      .from("hospital_lab_results")
      .select("pathologist_report_id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (data?.pathologist_report_id) {
      navigate(`/pathologist/reports?highlight=${data.pathologist_report_id}`);
    } else {
      navigate("/pathologist/reports");
    }
  };

  const handleGenerateBarcode = (order: IncomingLabOrder) => {
    generateBarcode.mutate(order.id);
  };

  if (isLoading) {
    return <PageSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <LabOperationsSummaryStrip />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            Hospital Lab Orders
            <Badge variant="secondary" className="text-sm">{orders.length}</Badge>
          </h1>
          <p className="text-muted-foreground">
            Incoming test orders from hospitals
          </p>
        </div>
        <div className="relative max-w-sm w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient, barcode, hospital..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-3xl font-bold">{pendingOrders.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Processing</p>
                <p className="text-3xl font-bold">{processingOrders.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={statUrgentActive > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">STAT/Urgent Active</p>
                <p className={`text-3xl font-bold ${statUrgentActive > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{statUrgentActive}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgency Quick Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {(["all", "stat", "urgent", "routine"] as const).map((f) => (
          <Button
            key={f}
            variant={urgencyFilter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setUrgencyFilter(f)}
            className={urgencyFilter === f && f === "stat" ? "bg-red-600 hover:bg-red-700 text-white" : urgencyFilter === f && f === "urgent" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Orders Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending
            {pendingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing
            {processingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {processingOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {completedOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingOrders.length === 0 ? (
            <InlineEmptyState
              icon={FlaskConical}
              title="No pending orders"
              description="New lab orders from hospitals will appear here"
            />
          ) : (
            pendingOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStartProcessing={handleStartProcessing}
                onMarkReceived={handleMarkReceived}
                onGenerateBarcode={handleGenerateBarcode}
                onCompleteOrder={handleCompleteOrder}
                isGeneratingBarcode={generateBarcode.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="processing" className="space-y-4 mt-4">
          {processingOrders.length === 0 ? (
            <InlineEmptyState
              icon={Loader2}
              title="No orders in processing"
              description="Orders being processed will appear here"
            />
          ) : (
            processingOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStartProcessing={handleStartProcessing}
                onMarkReceived={handleMarkReceived}
                onGenerateBarcode={handleGenerateBarcode}
                onCompleteOrder={handleCompleteOrder}
                isGeneratingBarcode={generateBarcode.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {/* Date Range Filter for Completed */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Show:</span>
            {(["7d", "14d", "30d"] as const).map((range) => (
              <Button
                key={range}
                variant={completedDateRange === range ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setCompletedDateRange(range)}
              >
                {range === "7d" ? "Last 7 days" : range === "14d" ? "Last 14 days" : "Last 30 days"}
              </Button>
            ))}
          </div>
          {completedOrders.length === 0 ? (
            <InlineEmptyState
              icon={CheckCircle}
              title="No completed orders in this period"
              description="Try expanding the date range"
            />
          ) : (
            completedOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onStartProcessing={handleStartProcessing}
                onMarkReceived={handleMarkReceived}
                onGenerateBarcode={handleGenerateBarcode}
                onCompleteOrder={handleCompleteOrder}
                onViewResult={handleViewResult}
                isGeneratingBarcode={generateBarcode.isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Info note */}
      <div className="flex items-start gap-2 p-4 bg-muted rounded-lg text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground">Workflow:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Hospital orders test → appears in "Pending"</li>
            <li>Hospital collects sample → status updates to "Sample Ready"</li>
            <li>Click "Start Processing" to begin analysis</li>
            <li>Complete order → results go to hospital and patient</li>
          </ol>
        </div>
      </div>

      {/* Complete Order Dialog */}
      <CompleteLabOrderDialog
        order={orderToComplete}
        open={!!orderToComplete}
        onOpenChange={(open) => !open && setOrderToComplete(null)}
      />
    </div>
  );
}
