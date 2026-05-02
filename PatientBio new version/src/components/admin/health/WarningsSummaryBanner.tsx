import { useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthWarning, Severity } from "@/utils/healthSeverity";
import { severityTextClass } from "@/utils/healthSeverity";

interface WarningsSummaryBannerProps {
  warnings: HealthWarning[];
}

const severityIcon = (s: Severity) => {
  switch (s) {
    case "error": return <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
    default: return <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
  }
};

export default function WarningsSummaryBanner({ warnings }: WarningsSummaryBannerProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...warnings].sort((a, b) => (a.severity === "error" ? -1 : b.severity === "error" ? 1 : 0)),
    [warnings],
  );

  const errorCount = warnings.filter((w) => w.severity === "error").length;
  const warnCount = warnings.filter((w) => w.severity === "warning").length;

  if (warnings.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <CheckCircle className="h-5 w-5 text-emerald-500" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          All Systems Operational
        </span>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <span className="text-sm font-medium">
              {errorCount + warnCount} active {errorCount + warnCount === 1 ? "issue" : "issues"}
            </span>
            <div className="flex gap-1.5">
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/20 text-xs">
                  {errorCount} error{errorCount > 1 ? "s" : ""}
                </Badge>
              )}
              {warnCount > 0 && (
                <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs">
                  {warnCount} warning{warnCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-1.5">
        {sorted.map((w, i) => (
          <div key={`${w.source}-${i}`} className="flex items-start gap-3 px-4 py-2.5 rounded-md bg-muted/40 border">
            {severityIcon(w.severity)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{w.source}</span>
                <span className={cn("text-sm font-medium", severityTextClass(w.severity))}>{w.message}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{w.recommendation}</p>
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
