import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, RefreshCw, Shield, UserCog, FileText, Building2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

interface AuditLog {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const getActionIcon = (action: string) => {
  if (action.includes("role")) return <UserCog className="h-4 w-4" />;
  if (action.includes("hospital")) return <Building2 className="h-4 w-4" />;
  if (action.includes("content")) return <FileText className="h-4 w-4" />;
  if (action.includes("security")) return <Shield className="h-4 w-4" />;
  return <History className="h-4 w-4" />;
};

const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  if (action.includes("delete") || action.includes("remove")) return "destructive";
  if (action.includes("create") || action.includes("add")) return "default";
  if (action.includes("update") || action.includes("change")) return "secondary";
  return "outline";
};

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("id, admin_id, action, target_type, target_id, details, ip_address, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data || []) as AuditLog[];
    },
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery.trim()) return logs;

    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(query) ||
        log.target_type?.toLowerCase().includes(query) ||
        log.admin_email?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination({ data: filteredLogs, itemsPerPage: 15 });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy HH:mm");
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Audit Logs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track administrative actions and system changes
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <History className="h-4 w-4 sm:h-5 sm:w-5" />
                Activity Log
                {filteredLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                    {filteredLogs.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Recent administrative actions and system events
              </CardDescription>
            </div>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search actions..."
              className="w-full sm:w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">
                Audit logs table not configured yet
              </p>
              <p className="text-xs text-muted-foreground">
                Audit logging will be available after the database migration is applied.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-0 sm:mx-0">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Action</TableHead>
                      <TableHead className="text-xs sm:text-sm">Target</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Details</TableHead>
                      <TableHead className="text-xs sm:text-sm">Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton columns={4} rows={10} />
                    ) : paginatedData.length > 0 ? (
                      paginatedData.map((log: AuditLog) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <Badge variant={getActionBadgeVariant(log.action)}>
                                {log.action}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {log.target_type && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {log.target_type}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {log.details ? JSON.stringify(log.details).slice(0, 50) + "..." : "-"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm text-muted-foreground">
                            {formatDate(log.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                          {searchQuery ? "No logs match your search" : "No audit logs recorded yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
