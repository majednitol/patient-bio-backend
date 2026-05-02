/**
 * BlockchainExplorerPage - Searchable, filterable transaction explorer for admins
 * With chain view graph, actor resolution, date filtering, diff, CSV export, and timeline trace
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Link2, Link2Off, Hash, Clock, FileText, ChevronLeft, ChevronRight, LayoutGrid, TableIcon } from "lucide-react";
import { format } from "date-fns";
import { formatTransactionType, getTransactionTypeIcon } from "@/hooks/useBlockchainVerification";
import { DateRangeFilter, useDateRangeFilter, type DateRange } from "@/components/admin/DateRangeFilter";
import { ChainViewGraph } from "@/components/admin/blockchain/ChainViewGraph";
import { TransactionTimeline } from "@/components/admin/blockchain/TransactionTimeline";
import { TransactionDiff } from "@/components/admin/blockchain/TransactionDiff";
import { ExportCSV } from "@/components/admin/blockchain/ExportCSV";

const PAGE_SIZE = 20;

const TRANSACTION_TYPES = [
  "ALL",
  "HEALTH_RECORD_CREATED",
  "HEALTH_RECORD_ACCESSED",
  "HEALTH_RECORD_UPDATED",
  "HEALTH_RECORD_DELETED",
  "ACCESS_GRANTED",
  "ACCESS_REVOKED",
  "CONSENT_GIVEN",
  "CONSENT_WITHDRAWN",
  "DATA_EXPORTED",
  "CROSS_BORDER_TRANSFER",
  "EMERGENCY_ACCESS",
  "PROVIDER_VERIFIED",
];

interface BlockchainTx {
  id: string;
  transaction_type: string;
  actor_id: string;
  target_resource_type: string | null;
  target_resource_id: string | null;
  data_hash: string;
  previous_hash: string | null;
  signature: string | null;
  merkle_root: string | null;
  block_number: number | null;
  is_verified: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  timestamp: string;
}

export default function BlockchainExplorerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [traceResourceId, setTraceResourceId] = useState("");
  const [page, setPage] = useState(0);
  const [selectedTx, setSelectedTx] = useState<BlockchainTx | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chain">("table");
  const { dateRange, setDateRange } = useDateRangeFilter("30d");

  const isTraceMode = !!traceResourceId.trim();

  // Fetch transactions
  const { data, isLoading } = useQuery({
    queryKey: ["blockchain-explorer", typeFilter, searchTerm, traceResourceId, page, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      // In trace mode, resolve the actual target_resource_id first
      let resolvedResourceId = traceResourceId.trim();
      if (resolvedResourceId) {
        // Check if the entered ID is a transaction id (not a target_resource_id)
        const { data: lookup } = await supabase
          .from("blockchain_transactions")
          .select("target_resource_id")
          .eq("id", resolvedResourceId)
          .maybeSingle();
        if (lookup?.target_resource_id) {
          resolvedResourceId = lookup.target_resource_id;
        }
      }

      const isTracing = !!resolvedResourceId;

      let query = supabase
        .from("blockchain_transactions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Skip date range filter in trace mode to show full history
      if (!isTracing) {
        query = query
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (typeFilter !== "ALL") {
        query = query.eq("transaction_type", typeFilter as any);
      }
      if (isTracing) {
        query = query.eq("target_resource_id", resolvedResourceId);
      }
      if (searchTerm.trim()) {
        query = query.or(`data_hash.ilike.%${searchTerm}%,actor_id.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { transactions: data as BlockchainTx[], total: count || 0 };
    },
  });

  const transactions = data?.transactions || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Actor identity resolution
  const actorIds = useMemo(() => [...new Set(transactions.map((tx) => tx.actor_id))], [transactions]);
  const { data: actorProfiles } = useQuery({
    queryKey: ["actor-profiles", actorIds],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", actorIds);
      return data || [];
    },
  });
  const actorNames = useMemo(() => {
    const map = new Map<string, string>();
    actorProfiles?.forEach((p) => { if (p.display_name) map.set(p.user_id, p.display_name); });
    return map;
  }, [actorProfiles]);

  // Chain status computation
  const chainStatus = new Map<string, boolean>();
  if (transactions.length > 1) {
    for (let i = 0; i < transactions.length - 1; i++) {
      const current = transactions[i];
      const next = transactions[i + 1];
      chainStatus.set(current.id, current.previous_hash === next.data_hash);
    }
    const last = transactions[transactions.length - 1];
    chainStatus.set(last.id, last.previous_hash?.startsWith("GENESIS") || false);
  } else if (transactions.length === 1) {
    chainStatus.set(transactions[0].id, true);
  }

  const isUpdateType = selectedTx?.transaction_type === "HEALTH_RECORD_UPDATED";

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Hash className="h-8 w-8 text-primary" />
          Blockchain Explorer
        </h1>
        <p className="text-muted-foreground">Inspect individual blockchain transactions and trace record histories</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by hash or actor..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "ALL" ? "All Types" : formatTransactionType(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-xs">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Trace Resource ID..."
                value={traceResourceId}
                onChange={(e) => { setTraceResourceId(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
          </div>
          {/* Date Range Filter */}
          <DateRangeFilter value={dateRange} onChange={(r) => { setDateRange(r); setPage(0); }} />
        </CardContent>
      </Card>

      {/* Chain View Graph */}
      {viewMode === "chain" && selectedTx && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chain Link View</CardTitle>
          </CardHeader>
          <CardContent>
            <ChainViewGraph
              selectedTxId={selectedTx.id}
              selectedTxCreatedAt={selectedTx.created_at}
              onSelectTx={setSelectedTx}
              actorNames={actorNames}
            />
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>{totalCount.toLocaleString()} total transactions found</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ExportCSV
                typeFilter={typeFilter}
                searchTerm={searchTerm}
                traceResourceId={traceResourceId}
                dateFrom={dateRange.from}
                dateTo={dateRange.to}
                totalCount={totalCount}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setViewMode(viewMode === "table" ? "chain" : "table")}
              >
                {viewMode === "table" ? <LayoutGrid className="h-3.5 w-3.5" /> : <TableIcon className="h-3.5 w-3.5" />}
                {viewMode === "table" ? "Chain View" : "Table View"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isTraceMode ? (
            /* Timeline mode for trace */
            <TransactionTimeline
              transactions={transactions}
              actorNames={actorNames}
              onViewDetails={setSelectedTx}
              onExitTrace={() => { setTraceResourceId(""); setPage(0); }}
              resourceId={traceResourceId}
            />
          ) : (
            <>
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Chain</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => {
                      const name = actorNames.get(tx.actor_id);
                      return (
                        <TableRow
                          key={tx.id}
                          className="cursor-pointer hover:bg-muted/80"
                          onClick={() => setSelectedTx(tx)}
                        >
                          <TableCell className="text-xs whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(tx.created_at), "MMM d, HH:mm:ss")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getTransactionTypeIcon(tx.transaction_type)} {formatTransactionType(tx.transaction_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={name ? "" : "font-mono"}>
                                  {name || `${tx.actor_id.slice(0, 8)}...`}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono text-xs">{tx.actor_id}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-xs">
                            {tx.target_resource_type ? (
                              <span className="text-muted-foreground">{tx.target_resource_type}</span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {tx.data_hash.slice(0, 12)}...
                          </TableCell>
                          <TableCell>
                            {chainStatus.get(tx.id) !== false ? (
                              <Link2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Link2Off className="h-4 w-4 text-destructive" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No transactions found matching your filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Transaction Details
            </SheetTitle>
            <SheetDescription>
              {selectedTx && formatTransactionType(selectedTx.transaction_type)}
            </SheetDescription>
          </SheetHeader>
          {selectedTx && (
            <div className="mt-6 space-y-4">
              <DetailRow label="ID" value={selectedTx.id} mono />
              <DetailRow label="Type" value={`${getTransactionTypeIcon(selectedTx.transaction_type)} ${formatTransactionType(selectedTx.transaction_type)}`} />
              <DetailRow label="Actor" value={actorNames.get(selectedTx.actor_id) || selectedTx.actor_id} mono={!actorNames.has(selectedTx.actor_id)} />
              <DetailRow label="Actor ID" value={selectedTx.actor_id} mono />
              <DetailRow label="Resource Type" value={selectedTx.target_resource_type || "—"} />
              <DetailRow label="Resource ID" value={selectedTx.target_resource_id || "—"} mono />
              <DetailRow label="Timestamp" value={format(new Date(selectedTx.created_at), "PPP 'at' pp")} />
              <DetailRow label="Block Number" value={selectedTx.block_number?.toString() || "—"} />
              <DetailRow label="Verified" value={selectedTx.is_verified ? "✅ Yes" : "❌ No"} />

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-2">Cryptographic Data</h4>
                <DetailRow label="Data Hash" value={selectedTx.data_hash} mono break />
                <DetailRow label="Previous Hash" value={selectedTx.previous_hash || "GENESIS"} mono break />
                <DetailRow label="Signature" value={selectedTx.signature || "—"} mono break />
                <DetailRow label="Merkle Root" value={selectedTx.merkle_root || "—"} mono break />
              </div>

              {/* Diff for update transactions */}
              {isUpdateType && <TransactionDiff metadata={selectedTx.metadata} />}

              {selectedTx.metadata && Object.keys(selectedTx.metadata).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2">Metadata</h4>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(selectedTx.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedTx.target_resource_id && (
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTraceResourceId(selectedTx.target_resource_id!);
                      setSelectedTx(null);
                      setPage(0);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Trace All Transactions for This Resource
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ label, value, mono, break: breakWord }: { label: string; value: string; mono?: boolean; break?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""} ${breakWord ? "break-all" : ""}`}>{value}</p>
    </div>
  );
}
