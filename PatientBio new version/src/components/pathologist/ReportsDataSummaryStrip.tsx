import { usePathologistReports } from "@/hooks/usePathologistReports";
import { useTestCatalog } from "@/hooks/useTestCatalog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, FlaskConical, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export function ReportsDataSummaryStrip() {
  const { reports } = usePathologistReports();
  const { tests } = useTestCatalog();
  const { user } = useAuth();

  const { data: lastImport } = useQuery({
    queryKey: ["pathologist-last-import", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_import_logs")
        .select("status, created_at")
        .eq("provider_id", user?.id)
        .eq("provider_type", "pathologist")
        .order("created_at", { ascending: false })
        .limit(1);
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

  const activeTests = tests.filter((t) => t.is_active).length;

  const items = [
    {
      label: "Total Reports",
      value: reports.length,
      icon: FileText,
      href: "/pathologist/reports",
      color: "text-[hsl(var(--diagnostic-primary))]",
      bg: "bg-[hsl(var(--diagnostic-primary))]/10",
    },
    {
      label: "Active Tests",
      value: activeTests,
      icon: FlaskConical,
      href: "/pathologist/test-catalog",
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Last Import",
      value: lastImport?.status || "None",
      icon: Upload,
      href: "/pathologist/import",
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      isBadge: true,
    },
  ];

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 border border-border/50">
      {items.map((item, i) => (
        <Link
          key={item.label}
          to={item.href}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-background transition-colors group"
        >
          <div className={`p-1.5 rounded-md ${item.bg}`}>
            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{item.label}:</span>
            {item.isBadge ? (
              <Badge
                variant={
                  item.value === "completed" ? "default" :
                  item.value === "failed" ? "destructive" : "secondary"
                }
                className={`text-xs ${item.value === "completed" ? "bg-green-600" : ""}`}
              >
                {typeof item.value === "string" ? item.value : "None"}
              </Badge>
            ) : (
              <span className="text-sm font-semibold">{item.value}</span>
            )}
          </div>
          {i < items.length - 1 && (
            <div className="ml-2 h-4 w-px bg-border/50 hidden sm:block" />
          )}
        </Link>
      ))}
    </div>
  );
}
