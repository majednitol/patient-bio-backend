import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ExportCSVProps {
  typeFilter: string;
  searchTerm: string;
  traceResourceId: string;
  dateFrom?: Date;
  dateTo?: Date;
  totalCount: number;
}

export function ExportCSV({ typeFilter, searchTerm, traceResourceId, dateFrom, dateTo, totalCount }: ExportCSVProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      let query = supabase
        .from("blockchain_transactions")
        .select("transaction_type, actor_id, target_resource_type, target_resource_id, data_hash, previous_hash, created_at, is_verified")
        .order("created_at", { ascending: false })
        .limit(5000);

      if (typeFilter !== "ALL") query = query.eq("transaction_type", typeFilter as any);
      if (traceResourceId.trim()) query = query.eq("target_resource_id", traceResourceId.trim());
      if (searchTerm.trim()) query = query.or(`data_hash.ilike.%${searchTerm}%,actor_id.ilike.%${searchTerm}%`);
      if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
      if (dateTo) query = query.lte("created_at", dateTo.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) return;

      const headers = ["timestamp", "type", "actor_id", "resource_type", "resource_id", "data_hash", "previous_hash", "verified"];
      const rows = data.map((tx) => [
        tx.created_at,
        tx.transaction_type,
        tx.actor_id,
        tx.target_resource_type || "",
        tx.target_resource_id || "",
        tx.data_hash,
        tx.previous_hash || "",
        tx.is_verified ? "yes" : "no",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blockchain_transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || totalCount === 0} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      {exporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
