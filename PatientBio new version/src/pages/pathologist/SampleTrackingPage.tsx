import { useState, useCallback, useMemo } from "react";
import { LabOperationsSummaryStrip } from "@/components/pathologist/LabOperationsSummaryStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Barcode,
  Search,
  PackageCheck,
  Loader2,
  CheckCircle,
  FlaskConical,
  Building2,
  Camera,
  AlertTriangle,
  CalendarDays,
  ArrowUpDown,
  Printer,
  XCircle,
  Clock,
  User,
} from "lucide-react";
import { format, isToday, differenceInHours } from "date-fns";
import { useLabOrdersForPathologist, type IncomingLabOrder } from "@/hooks/useLabOrdersForPathologist";
import { useSampleTracking } from "@/hooks/useSampleTracking";
import { SampleTimeline } from "@/components/pathologist/SampleTimeline";
import { SampleBarcodeLabel } from "@/components/pathologist/SampleBarcodeLabel";
import { CompleteLabOrderDialog } from "@/components/pathologist/CompleteLabOrderDialog";
import { BarcodeScannerDialog } from "@/components/pathologist/BarcodeScannerDialog";
import { SampleTATAnalytics } from "@/components/pathologist/SampleTATAnalytics";
import { BulkBarcodePrintDialog } from "@/components/pathologist/BulkBarcodePrintDialog";
import { toast } from "@/hooks/use-toast";

const SLA_THRESHOLD_HOURS = 24;

const REJECTION_REASONS = [
  "Hemolyzed",
  "Insufficient Quantity",
  "Wrong Container",
  "Labeling Error",
  "Contaminated",
  "Other",
];

function getTimeInStage(order: IncomingLabOrder): { label: string; color: string } {
  let stageStart: string | null = null;
  if (order.quality_checked_at) stageStart = order.quality_checked_at;
  else if (order.processing_started_at) stageStart = order.processing_started_at;
  else if (order.received_at) stageStart = order.received_at;
  else stageStart = order.created_at;

  const diffMs = Date.now() - new Date(stageStart).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  let label: string;
  if (diffHours < 1) label = `${Math.round(diffHours * 60)}m ago`;
  else if (diffHours < 24) label = `${Math.round(diffHours)}h ago`;
  else label = `${Math.round(diffHours / 24)}d ago`;

  let color: string;
  if (diffHours < 12) color = "text-green-600 dark:text-green-400";
  else if (diffHours < 24) color = "text-amber-600 dark:text-amber-400";
  else color = "text-red-600 dark:text-red-400";

  return { label, color };
}

function isSLABreached(order: IncomingLabOrder): boolean {
  const stageStart = order.quality_checked_at || order.processing_started_at || order.received_at || order.created_at;
  return differenceInHours(new Date(), new Date(stageStart)) >= SLA_THRESHOLD_HOURS;
}

function SampleCard({
  order, 
  onViewDetails,
  selectable,
  selected,
  onSelect,
}: { 
  order: IncomingLabOrder; 
  onViewDetails: (order: IncomingLabOrder) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
}) {
  const tests = order.tests as { name: string; price: number }[];
  const timeInStage = getTimeInStage(order);
  const isRejected = (order.status as string) === "rejected" || !!order.rejected_at;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => selectable ? onSelect?.(order.id, !selected) : onViewDetails(order)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {selectable && (
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect?.(order.id, !!checked)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {order.sample_barcode ? (
              <Badge variant="outline" className="font-mono text-xs">
                <Barcode className="h-3 w-3 mr-1" />
                {order.sample_barcode}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">No Barcode</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isRejected && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <XCircle className="h-2.5 w-2.5 mr-0.5" />
                Rejected
              </Badge>
            )}
            {!isRejected && isSLABreached(order) && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                SLA
              </Badge>
            )}
            {!isRejected && (
              <span className={`text-[10px] font-medium ${timeInStage.color}`}>
                {timeInStage.label}
              </span>
            )}
            <Badge
              variant={order.urgency === "stat" ? "destructive" : order.urgency === "urgent" ? "default" : "secondary"}
              className="text-xs"
            >
              {order.urgency?.toUpperCase()}
            </Badge>
          </div>
        </div>
        
        <p className="font-medium text-sm truncate">
          {order.patient_profile?.display_name || "Unknown Patient"}
        </p>
        
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{order.hospital?.name || "Unknown"}</span>
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {tests.slice(0, 2).map((test, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {test.name}
            </Badge>
          ))}
          {tests.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{tests.length - 2}
            </Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mt-2">
          {format(new Date(order.created_at), "MMM d, h:mm a")}
        </p>
      </CardContent>
    </Card>
  );
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  received: "Sample Received",
  processing_started: "Processing Started",
  qc_passed: "QC Passed",
  rejected: "Sample Rejected",
  barcode_generated: "Barcode Generated",
  completed: "Order Completed",
};

export default function SampleTrackingPage() {
  const { orders, isLoading } = useLabOrdersForPathologist();
  const { searchByBarcode, generateBarcode, markSampleReceived, startProcessing, markQCPassed, rejectSample } = useSampleTracking();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<IncomingLabOrder | null>(null);
  const [orderToComplete, setOrderToComplete] = useState<IncomingLabOrder | null>(null);
  const [searchResult, setSearchResult] = useState<IncomingLabOrder | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Batch mode state
  const [batchMode, setBatchMode] = useState<false | "receive" | "process">(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchReceiving, setBatchReceiving] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [sortMode, setSortMode] = useState<string>("default");

  // Bulk print dialog
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);

  // Rejection form state
  const [rejectingOrder, setRejectingOrder] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");

  // Group orders by stage
  const activeOrders = orders.filter(o => (o.status as string) !== "completed" && (o.status as string) !== "rejected");
  const rejectedOrders = orders.filter(o => (o.status as string) === "rejected" || !!o.rejected_at);
  const receivedOrders = activeOrders.filter(o => o.received_at && !o.processing_started_at);
  const processingOrders = activeOrders.filter(o => o.processing_started_at && !o.quality_checked_at && o.status === "processing");
  const qcOrders = activeOrders.filter(o => o.quality_checked_at && o.status === "processing");
  const pendingReceive = activeOrders.filter(o => !o.received_at && (o.status === "sample_collected" || o.status === "ordered"));

  // Daily workload stats
  const dailyStats = useMemo(() => {
    const receivedToday = activeOrders.filter(o => o.received_at && isToday(new Date(o.received_at))).length;
    const processedToday = activeOrders.filter(o => o.processing_started_at && isToday(new Date(o.processing_started_at))).length;
    const pendingFromPreviousDays = activeOrders.filter(o => {
      const created = new Date(o.created_at);
      return !isToday(created) && o.status !== "completed";
    }).length;
    const slaBreachCount = activeOrders.filter(o => o.status !== "completed" && isSLABreached(o)).length;
    return { receivedToday, processedToday, pendingFromPreviousDays, slaBreachCount };
  }, [activeOrders]);

  const sortOrders = useCallback((list: IncomingLabOrder[]) => {
    if (sortMode === "prioritize") {
      return [...list].sort((a, b) => {
        const aStart = new Date(a.quality_checked_at || a.processing_started_at || a.received_at || a.created_at).getTime();
        const bStart = new Date(b.quality_checked_at || b.processing_started_at || b.received_at || b.created_at).getTime();
        return aStart - bStart;
      });
    }
    return list;
  }, [sortMode]);

  // --- Event history for selected order ---
  const selectedOrderTracking = useSampleTracking(selectedOrder?.id);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await searchByBarcode(searchQuery.trim().toUpperCase());
      if (result) {
        setSelectedOrder(result as IncomingLabOrder);
      } else {
        setSearchResult(null);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarcodeScan = useCallback((barcode: string) => {
    setSearchQuery(barcode);
    setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchByBarcode(barcode.trim().toUpperCase());
        if (result) {
          setSelectedOrder(result as IncomingLabOrder);
        } else {
          toast({ title: "Not found", description: `No sample with barcode "${barcode}"`, variant: "destructive" });
        }
      } catch {
        // handled
      } finally {
        setIsSearching(false);
      }
    }, 100);
  }, [searchByBarcode]);

  const handleGenerateBarcode = () => {
    if (selectedOrder && !selectedOrder.sample_barcode) {
      generateBarcode.mutate(selectedOrder.id);
    }
  };

  const handleMarkReceived = () => {
    if (selectedOrder) {
      markSampleReceived.mutate({ orderId: selectedOrder.id });
      setSelectedOrder(null);
    }
  };

  const handleStartProcessing = () => {
    if (selectedOrder) {
      startProcessing.mutate({ orderId: selectedOrder.id });
      setSelectedOrder(null);
    }
  };

  const handleMarkQCPassed = () => {
    if (selectedOrder) {
      markQCPassed.mutate({ orderId: selectedOrder.id });
      setSelectedOrder(null);
    }
  };

  const handleRejectSample = () => {
    if (selectedOrder && rejectionReason) {
      rejectSample.mutate(
        { orderId: selectedOrder.id, reason: rejectionReason, notes: rejectionNotes || undefined },
        {
          onSuccess: () => {
            setSelectedOrder(null);
            setRejectingOrder(false);
            setRejectionReason("");
            setRejectionNotes("");
          },
        }
      );
    }
  };

  const toggleSelectId = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleBatchReceive = async () => {
    if (selectedIds.size === 0) return;
    setBatchReceiving(true);
    setBatchProgress(0);
    const ids = Array.from(selectedIds);
    let success = 0;
    let fail = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        await new Promise<void>((resolve, reject) => {
          markSampleReceived.mutate(
            { orderId: ids[i] },
            { onSuccess: () => { success++; resolve(); }, onError: () => { fail++; resolve(); } }
          );
        });
      } catch {
        fail++;
      }
      setBatchProgress(Math.round(((i + 1) / ids.length) * 100));
    }

    setBatchReceiving(false);
    setBatchMode(false);
    setSelectedIds(new Set());
    toast({ title: "Batch receive complete", description: `${success} received, ${fail} failed.` });
  };

  const handleBatchStartProcessing = async () => {
    if (selectedIds.size === 0) return;
    setBatchReceiving(true);
    setBatchProgress(0);
    const ids = Array.from(selectedIds);
    let success = 0;
    let fail = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        await new Promise<void>((resolve) => {
          startProcessing.mutate(
            { orderId: ids[i] },
            { onSuccess: () => { success++; resolve(); }, onError: () => { fail++; resolve(); } }
          );
        });
      } catch {
        fail++;
      }
      setBatchProgress(Math.round(((i + 1) / ids.length) * 100));
    }

    setBatchReceiving(false);
    setBatchMode(false);
    setSelectedIds(new Set());
    toast({ title: "Batch processing started", description: `${success} started, ${fail} failed.` });
  };

  // Bulk print: get selected orders
  const selectedOrdersForPrint = useMemo(() => {
    return orders.filter(o => selectedIds.has(o.id));
  }, [orders, selectedIds]);

  if (isLoading) {
    return <PageSkeleton type="dashboard" />;
  }

  const isSelectedRejected = (selectedOrder?.status as string) === "rejected" || !!selectedOrder?.rejected_at;
  const canReject = selectedOrder && selectedOrder.received_at && !selectedOrder.quality_checked_at && selectedOrder.status !== "completed" && !isSelectedRejected;

  return (
    <div className="space-y-6">
      <LabOperationsSummaryStrip />
      
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6" />
          Sample Tracking
          <Badge variant="secondary" className="text-sm">
            {pendingReceive.length + receivedOrders.length + processingOrders.length + qcOrders.length}
          </Badge>
        </h1>
        <p className="text-muted-foreground">
          Track samples through barcode search and status boards
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by barcode (e.g., LAB-20260207-0001)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
            <Button variant="outline" size="icon" title="Scan Barcode" onClick={() => setScannerOpen(true)}>
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          
          {searchResult === null && searchQuery && !isSearching && (
            <p className="text-sm text-muted-foreground mt-2">
              No sample found with barcode "{searchQuery}"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Daily Workload Summary */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Today's Workload</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{dailyStats.receivedToday}</p>
              <p className="text-xs text-muted-foreground">Received Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{dailyStats.processedToday}</p>
              <p className="text-xs text-muted-foreground">Processed Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{dailyStats.pendingFromPreviousDays}</p>
              <p className="text-xs text-muted-foreground">Carryover</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${dailyStats.slaBreachCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {dailyStats.slaBreachCount}
              </p>
              <p className="text-xs text-muted-foreground">SLA Breaches</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Breach Alert */}
      {dailyStats.slaBreachCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {dailyStats.slaBreachCount} sample{dailyStats.slaBreachCount > 1 ? "s" : ""} exceeded {SLA_THRESHOLD_HOURS}h SLA threshold
            </p>
            <p className="text-xs text-muted-foreground">
              Use "Prioritize" sort to surface the oldest samples first
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive border-destructive/30"
            onClick={() => setSortMode("prioritize")}
          >
            Prioritize
          </Button>
        </div>
      )}

      {/* TAT Analytics */}
      <SampleTATAnalytics orders={orders} />

      {/* Sort Control */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={sortMode} onValueChange={setSortMode}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Order</SelectItem>
              <SelectItem value="prioritize">Oldest in Stage First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <PackageCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReceive.length}</p>
                <p className="text-xs text-muted-foreground">Awaiting Receipt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <PackageCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{receivedOrders.length}</p>
                <p className="text-xs text-muted-foreground">Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingOrders.length}</p>
                <p className="text-xs text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{qcOrders.length}</p>
                <p className="text-xs text-muted-foreground">QC Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Receive Progress */}
      {batchReceiving && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Receiving samples...</span>
            <span>{batchProgress}%</span>
          </div>
          <Progress value={batchProgress} className="h-2" />
        </div>
      )}

      {/* Kanban Board */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Awaiting Receipt
            {pendingReceive.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingReceive.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received">
            Received
            {receivedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">{receivedOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing
            {processingOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">{processingOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="qc">
            QC Complete
            {qcOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1">{qcOrders.length}</Badge>
            )}
          </TabsTrigger>
          {rejectedOrders.length > 0 && (
            <TabsTrigger value="rejected">
              Rejected
              <Badge variant="destructive" className="ml-1">{rejectedOrders.length}</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingReceive.length === 0 ? (
            <InlineEmptyState
              icon={PackageCheck}
              title="No samples awaiting receipt"
              description="Samples collected by hospitals will appear here"
            />
          ) : (
            <>
               <div className="flex justify-end gap-2 mb-3">
                {batchMode === "receive" && selectedIds.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const ordersForPrint = orders.filter(o => selectedIds.has(o.id));
                      if (ordersForPrint.some(o => o.sample_barcode)) {
                        setBulkPrintOpen(true);
                      } else {
                        toast({ title: "No barcodes", description: "None of the selected samples have barcodes.", variant: "destructive" });
                      }
                    }}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print Labels
                  </Button>
                )}
                <Button
                  variant={batchMode === "receive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setBatchMode(batchMode === "receive" ? false : "receive");
                    setSelectedIds(new Set());
                  }}
                  disabled={batchReceiving}
                >
                  <PackageCheck className="h-4 w-4 mr-1" />
                  {batchMode === "receive" ? "Cancel" : "Batch Receive"}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortOrders(pendingReceive).map((order) => (
                  <SampleCard
                    key={order.id}
                    order={order}
                    onViewDetails={setSelectedOrder}
                    selectable={batchMode === "receive"}
                    selected={selectedIds.has(order.id)}
                    onSelect={toggleSelectId}
                  />
                ))}
              </div>
              {batchMode === "receive" && selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-full px-6 py-3 flex items-center gap-4">
                  <span className="text-sm font-medium">{selectedIds.size} selected</span>
                  <Button size="sm" onClick={handleBatchReceive} disabled={batchReceiving}>
                    {batchReceiving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PackageCheck className="h-4 w-4 mr-1" />}
                    Receive All
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="received" className="mt-4">
          {receivedOrders.length === 0 ? (
            <InlineEmptyState
              icon={PackageCheck}
              title="No received samples"
              description="Samples you've received will appear here"
            />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <Button
                  variant={batchMode === "process" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setBatchMode(batchMode === "process" ? false : "process");
                    setSelectedIds(new Set());
                  }}
                  disabled={batchReceiving}
                >
                  <Loader2 className="h-4 w-4 mr-1" />
                  {batchMode === "process" ? "Cancel" : "Batch Start Processing"}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortOrders(receivedOrders).map((order) => (
                  <SampleCard
                    key={order.id}
                    order={order}
                    onViewDetails={setSelectedOrder}
                    selectable={batchMode === "process"}
                    selected={selectedIds.has(order.id)}
                    onSelect={toggleSelectId}
                  />
                ))}
              </div>
              {batchMode === "process" && selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-full px-6 py-3 flex items-center gap-4">
                  <span className="text-sm font-medium">{selectedIds.size} selected</span>
                  <Button size="sm" onClick={handleBatchStartProcessing} disabled={batchReceiving}>
                    {batchReceiving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Loader2 className="h-4 w-4 mr-1" />}
                    Start Processing All
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="processing" className="mt-4">
          {processingOrders.length === 0 ? (
            <InlineEmptyState
              icon={Loader2}
              title="No samples in processing"
              description="Samples being processed will appear here"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortOrders(processingOrders).map((order) => (
                <SampleCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="qc" className="mt-4">
          {qcOrders.length === 0 ? (
            <InlineEmptyState
              icon={CheckCircle}
              title="No QC-completed samples"
              description="Samples that passed QC will appear here"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortOrders(qcOrders).map((order) => (
                <SampleCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
              ))}
            </div>
          )}
        </TabsContent>

        {rejectedOrders.length > 0 && (
          <TabsContent value="rejected" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rejectedOrders.map((order) => (
                <SampleCard key={order.id} order={order} onViewDetails={setSelectedOrder} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Sample Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setRejectingOrder(false); setRejectionReason(""); setRejectionNotes(""); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Sample Details
            </DialogTitle>
            <DialogDescription>
              View sample tracking information and take actions
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {selectedOrder.sample_barcode ? (
                <SampleBarcodeLabel
                  barcode={selectedOrder.sample_barcode}
                  patientName={selectedOrder.patient_profile?.display_name || "Unknown"}
                  patientId={selectedOrder.patient_profile?.patient_passport_id || undefined}
                  tests={(selectedOrder.tests as { name: string }[]) || []}
                  orderedAt={selectedOrder.created_at}
                  hospitalName={selectedOrder.hospital?.name}
                />
              ) : (
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground mb-3">No barcode generated yet</p>
                    <Button
                      onClick={handleGenerateBarcode}
                      disabled={generateBarcode.isPending}
                    >
                      {generateBarcode.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Barcode className="h-4 w-4 mr-2" />
                      )}
                      Generate Barcode
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Sample Journey</CardTitle>
                </CardHeader>
                <CardContent>
                  <SampleTimeline order={selectedOrder} />
                </CardContent>
              </Card>

              {/* Event History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Event History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrderTracking.eventsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : selectedOrderTracking.events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tracking events recorded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedOrderTracking.events.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 text-sm">
                          <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${event.event_type === "rejected" ? "bg-destructive" : "bg-primary"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.created_at), "MMM d, h:mm a")}
                              </span>
                            </div>
                            {event.performer_name && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <User className="h-3 w-3" />
                                {event.performer_name}
                              </div>
                            )}
                            {event.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {!selectedOrder.received_at && !isSelectedRejected && (
                  <Button onClick={handleMarkReceived} disabled={markSampleReceived.isPending}>
                    {markSampleReceived.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <PackageCheck className="h-4 w-4 mr-2" />
                    )}
                    Mark Received
                  </Button>
                )}
                
                {selectedOrder.received_at && !selectedOrder.processing_started_at && !isSelectedRejected && (
                  <Button onClick={handleStartProcessing} disabled={startProcessing.isPending}>
                    {startProcessing.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Loader2 className="h-4 w-4 mr-2" />
                    )}
                    Start Processing
                  </Button>
                )}
                
                {selectedOrder.processing_started_at && !selectedOrder.quality_checked_at && !isSelectedRejected && (
                  <Button onClick={handleMarkQCPassed} disabled={markQCPassed.isPending}>
                    {markQCPassed.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Mark QC Passed
                  </Button>
                )}
                
                {selectedOrder.quality_checked_at && selectedOrder.status !== "completed" && !isSelectedRejected && (
                  <Button
                    onClick={() => {
                      setSelectedOrder(null);
                      setOrderToComplete(selectedOrder);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Order
                  </Button>
                )}

                {/* Reject button */}
                {canReject && !rejectingOrder && (
                  <Button
                    variant="destructive"
                    onClick={() => setRejectingOrder(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Sample
                  </Button>
                )}
              </div>

              {/* Rejection form */}
              {rejectingOrder && (
                <Card className="border-destructive/30">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-medium text-destructive">Reject Sample</p>
                    <Select value={rejectionReason} onValueChange={setRejectionReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REJECTION_REASONS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Additional notes (optional)"
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRejectSample}
                        disabled={!rejectionReason || rejectSample.isPending}
                      >
                        {rejectSample.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        Confirm Rejection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setRejectingOrder(false); setRejectionReason(""); setRejectionNotes(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CompleteLabOrderDialog
        order={orderToComplete}
        open={!!orderToComplete}
        onOpenChange={(open) => !open && setOrderToComplete(null)}
      />

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleBarcodeScan}
      />

      <BulkBarcodePrintDialog
        orders={selectedOrdersForPrint}
        open={bulkPrintOpen}
        onOpenChange={setBulkPrintOpen}
      />
    </div>
  );
}
