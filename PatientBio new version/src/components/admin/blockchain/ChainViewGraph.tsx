import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Link2Off, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatTransactionType, getTransactionTypeIcon } from "@/hooks/useBlockchainVerification";

interface ChainViewGraphProps {
  selectedTxId: string;
  selectedTxCreatedAt: string;
  onSelectTx: (tx: any) => void;
  actorNames: Map<string, string>;
}

export function ChainViewGraph({ selectedTxId, selectedTxCreatedAt, onSelectTx, actorNames }: ChainViewGraphProps) {
  const { data: neighbors, isLoading } = useQuery({
    queryKey: ["chain-neighbors", selectedTxId],
    queryFn: async () => {
      // Fetch 2 before (newer) and 2 after (older) the selected tx
      const [beforeRes, currentRes, afterRes] = await Promise.all([
        supabase
          .from("blockchain_transactions")
          .select("*")
          .gt("created_at", selectedTxCreatedAt)
          .order("created_at", { ascending: true })
          .limit(2),
        supabase
          .from("blockchain_transactions")
          .select("*")
          .eq("id", selectedTxId),
        supabase
          .from("blockchain_transactions")
          .select("*")
          .lt("created_at", selectedTxCreatedAt)
          .order("created_at", { ascending: false })
          .limit(2),
      ]);

      const before = (beforeRes.data || []).reverse();
      const current = currentRes.data || [];
      const after = afterRes.data || [];
      return [...before, ...current, ...after];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto py-6 px-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-44 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!neighbors || neighbors.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-max py-4 px-2">
        {neighbors.map((tx, i) => {
          const isSelected = tx.id === selectedTxId;
          const prevTx = i < neighbors.length - 1 ? neighbors[i + 1] : null;
          const linkValid = prevTx ? tx.previous_hash === prevTx.data_hash : (tx.previous_hash?.startsWith("GENESIS") || i === neighbors.length - 1);
          const actorName = actorNames.get(tx.actor_id);

          return (
            <div key={tx.id} className="flex items-center">
              {/* Block */}
              <div
                onClick={() => onSelectTx(tx)}
                className={cn(
                  "shrink-0 w-44 rounded-xl border-2 p-3 cursor-pointer transition-all hover:shadow-md",
                  isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="text-[10px] text-muted-foreground mb-1">
                  {format(new Date(tx.created_at), "MMM d, HH:mm:ss")}
                </div>
                <div className="text-xs font-semibold mb-1 truncate">
                  {getTransactionTypeIcon(tx.transaction_type)} {formatTransactionType(tx.transaction_type)}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {actorName || `${tx.actor_id.slice(0, 8)}...`}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground/70 mt-2 truncate" title={tx.data_hash}>
                  #{tx.data_hash.slice(0, 16)}
                </div>
              </div>

              {/* Connector arrow */}
              {i < neighbors.length - 1 && (
                <div className="flex flex-col items-center mx-1 shrink-0 w-16">
                  <div className={cn(
                    "h-0.5 w-full",
                    linkValid ? "bg-green-500" : "bg-destructive border-dashed border-t-2 border-destructive bg-transparent"
                  )} />
                  <div className="mt-1">
                    {linkValid ? (
                      <Link2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <Link2Off className="h-3 w-3 text-destructive" />
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
