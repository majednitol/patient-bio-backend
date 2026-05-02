import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTransactionType, getTransactionTypeIcon } from "@/hooks/useBlockchainVerification";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

interface TimelineTx {
  id: string;
  transaction_type: string;
  actor_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  target_resource_type: string | null;
}

interface TransactionTimelineProps {
  transactions: TimelineTx[];
  actorNames: Map<string, string>;
  onViewDetails: (tx: any) => void;
  onExitTrace: () => void;
  resourceId: string;
}

const TYPE_COLORS: Record<string, string> = {
  HEALTH_RECORD_CREATED: "bg-green-500",
  HEALTH_RECORD_UPDATED: "bg-blue-500",
  HEALTH_RECORD_ACCESSED: "bg-amber-500",
  HEALTH_RECORD_DELETED: "bg-destructive",
  ACCESS_GRANTED: "bg-emerald-500",
  ACCESS_REVOKED: "bg-orange-500",
  CONSENT_GIVEN: "bg-cyan-500",
  CONSENT_WITHDRAWN: "bg-rose-500",
};

export function TransactionTimeline({ transactions, actorNames, onViewDetails, onExitTrace, resourceId }: TransactionTimelineProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Resource History Timeline</h3>
          <p className="text-xs text-muted-foreground font-mono">{resourceId}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onExitTrace} className="gap-1.5">
          <X className="h-3 w-3" /> Exit Trace
        </Button>
      </div>

      <div className="relative ml-4 border-l-2 border-border pl-6 space-y-6 pb-4">
        {transactions.map((tx, i) => {
          const dotColor = TYPE_COLORS[tx.transaction_type] || "bg-muted-foreground";
          const actorName = actorNames.get(tx.actor_id);
          const metaSnippet = tx.metadata
            ? Object.entries(tx.metadata).slice(0, 2).map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`).join(" · ")
            : null;

          return (
            <div key={tx.id} className="relative">
              {/* Dot on the line */}
              <div className={cn("absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background", dotColor)} />

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">
                    {getTransactionTypeIcon(tx.transaction_type)} {formatTransactionType(tx.transaction_type)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(tx.created_at), "MMM d, yyyy 'at' HH:mm:ss")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {actorName || `${tx.actor_id.slice(0, 8)}...`}
                  {tx.target_resource_type && <span className="ml-2 text-muted-foreground/60">({tx.target_resource_type})</span>}
                </p>
                {metaSnippet && (
                  <p className="text-[11px] text-muted-foreground/70 italic truncate max-w-md">{metaSnippet}</p>
                )}
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={() => onViewDetails(tx)}>
                  <Eye className="h-3 w-3" /> View Details
                </Button>
              </div>
            </div>
          );
        })}
        {transactions.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">No transactions found for this resource.</p>
        )}
      </div>
    </div>
  );
}
