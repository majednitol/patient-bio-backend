import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Webhook,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useConnectedSystems, type DataExchangeEvent } from "@/hooks/useConnectedSystems";
import { useToast } from "@/hooks/use-toast";
import { ImportQualityBadge } from "./ImportQualityBadge";

const typeIcons: Record<DataExchangeEvent["type"], typeof ArrowUpFromLine> = {
  export: ArrowUpFromLine,
  import: ArrowDownToLine,
  webhook: Webhook,
};

const statusConfig: Record<DataExchangeEvent["status"], { icon: typeof CheckCircle2; color: string; badgeVariant: "default" | "destructive" | "secondary" | "outline" }> = {
  success: { icon: CheckCircle2, color: "text-primary", badgeVariant: "default" },
  failed: { icon: XCircle, color: "text-destructive", badgeVariant: "destructive" },
  pending: { icon: Clock, color: "text-muted-foreground", badgeVariant: "secondary" },
  in_progress: { icon: Loader2, color: "text-amber-500", badgeVariant: "outline" },
};

type FilterType = "all" | DataExchangeEvent["type"];
type FilterStatus = "all" | DataExchangeEvent["status"];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  nextRetryAt: number | null;
  status: "idle" | "retrying" | "success" | "permanently_failed";
}

interface DataExchangeLogProps {
  maxItems?: number;
}

export const DataExchangeLog = ({ maxItems = 15 }: DataExchangeLogProps) => {
  const { exchangeLog, isLoading } = useConnectedSystems();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [retryStates, setRetryStates] = useState<Record<string, RetryState>>({});
  const retryTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleSmartRetry = useCallback((event: DataExchangeEvent) => {
    const currentState = retryStates[event.id] || { retryCount: 0, isRetrying: false, nextRetryAt: null, status: "idle" };

    if (currentState.retryCount >= MAX_RETRIES) {
      setRetryStates((prev) => ({
        ...prev,
        [event.id]: { ...currentState, status: "permanently_failed", isRetrying: false },
      }));
      toast({
        title: "Permanently failed",
        description: `"${event.description}" failed after ${MAX_RETRIES} retries.`,
        variant: "destructive",
      });
      return;
    }

    const attempt = currentState.retryCount + 1;
    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff

    setRetryStates((prev) => ({
      ...prev,
      [event.id]: { retryCount: attempt, isRetrying: true, nextRetryAt: Date.now() + delay, status: "retrying" },
    }));

    toast({
      title: `Retry ${attempt}/${MAX_RETRIES}`,
      description: `Retrying "${event.description}" in ${(delay / 1000).toFixed(0)}s...`,
    });

    // Simulate retry with backoff
    retryTimers.current[event.id] = setTimeout(() => {
      // Simulate success/failure (in production, this calls the actual webhook/import endpoint)
      const succeeded = Math.random() > 0.5;

      if (succeeded) {
        setRetryStates((prev) => ({
          ...prev,
          [event.id]: { retryCount: attempt, isRetrying: false, nextRetryAt: null, status: "success" },
        }));
        toast({ title: "Retry succeeded", description: `"${event.description}" completed successfully.` });
      } else {
        const newState: RetryState = {
          retryCount: attempt,
          isRetrying: false,
          nextRetryAt: null,
          status: attempt >= MAX_RETRIES ? "permanently_failed" : "idle",
        };
        setRetryStates((prev) => ({ ...prev, [event.id]: newState }));

        if (attempt < MAX_RETRIES) {
          // Auto-retry next attempt
          handleSmartRetry(event);
        } else {
          toast({
            title: "Permanently failed",
            description: `"${event.description}" failed after ${MAX_RETRIES} retries.`,
            variant: "destructive",
          });
        }
      }
    }, delay);
  }, [retryStates, toast]);

  const typeFilters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "import", label: "Import" },
    { value: "export", label: "Export" },
    { value: "webhook", label: "Webhook" },
  ];

  const statusFilters: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "All" },
    { value: "success", label: "Success" },
    { value: "failed", label: "Failed" },
    { value: "pending", label: "Pending" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowLeftRight className="h-5 w-5 text-primary" />
          Data Exchange Log
        </CardTitle>
        <CardDescription>
          Chronological log of all data imports, exports, and webhook deliveries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Type:</span>
            {typeFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  typeFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Status:</span>
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {(() => {
          const filtered = exchangeLog.filter((e) => {
            if (typeFilter !== "all" && e.type !== typeFilter) return false;
            if (statusFilter !== "all" && e.status !== statusFilter) return false;
            return true;
          });

          if (filtered.length === 0) {
            return (
              <InlineEmptyState
                icon={ArrowLeftRight}
                title="No matching exchanges"
                description={exchangeLog.length === 0
                  ? "Import or export health data, or set up webhook subscriptions to see activity here."
                  : "No exchanges match the current filters."}
              />
            );
          }

          return (
            <div className="space-y-1.5">
              {filtered.slice(0, maxItems).map((event) => {
                const TypeIcon = typeIcons[event.type];
                const retryState = retryStates[event.id];
                const effectiveStatus = retryState?.status === "success" ? "success" : retryState?.status === "retrying" ? "in_progress" : event.status;
                const statusInfo = statusConfig[effectiveStatus] || statusConfig[event.status];
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-1.5 rounded-md bg-muted mt-0.5">
                      <TypeIcon className="h-3.5 w-3.5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{event.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>
                        {event.details.totalResources && (
                          <span className="text-xs text-muted-foreground">
                            · {event.details.processedResources || 0}/{event.details.totalResources} resources
                          </span>
                        )}
                        {event.type === "import" && event.details.totalResources && (
                          <ImportQualityBadge details={event.details} />
                        )}
                      </div>
                      {event.details.errorMessage && (
                        <p className="text-xs text-destructive mt-0.5 truncate">
                          {event.details.errorMessage}
                        </p>
                      )}
                      {retryState && retryState.retryCount > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {retryState.status === "retrying" && `Retrying (${retryState.retryCount}/${MAX_RETRIES})...`}
                          {retryState.status === "permanently_failed" && `Failed after ${MAX_RETRIES} retries`}
                          {retryState.status === "success" && "✓ Retry succeeded"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {event.status === "failed" && (!retryState || retryState.status === "idle") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 text-primary"
                          onClick={() => handleSmartRetry(event)}
                        >
                          <RotateCcw className="h-3 w-3 mr-0.5" />
                          Smart Retry
                        </Button>
                      )}
                      {retryState?.status === "permanently_failed" && (
                        <Badge variant="destructive" className="text-[10px]">
                          Failed ×{MAX_RETRIES}
                        </Badge>
                      )}
                      <StatusIcon
                        className={`h-3.5 w-3.5 ${statusInfo.color} ${effectiveStatus === "in_progress" ? "animate-spin" : ""}`}
                      />
                      <Badge variant={statusInfo.badgeVariant} className="text-xs">
                        {effectiveStatus === "in_progress" ? "Retrying" : effectiveStatus}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {filtered.length > maxItems && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Showing {maxItems} of {filtered.length} events
                </p>
              )}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};

export default DataExchangeLog;
