import { useMemo } from "react";
import { Sparkline } from "@/components/ui/Sparkline";
import { getRangesForType } from "@/lib/clinicalReferenceRanges";

interface Props {
  investigations: any[];
  investigationType: string;
}

/** Show mini sparklines for each tracked field within a given investigation type */
export function InvestigationTrendChart({ investigations, investigationType }: Props) {
  const ranges = getRangesForType(investigationType);

  const sorted = useMemo(
    () => [...investigations]
      .filter((i) => i.investigation_type === investigationType)
      .sort((a, b) => (a.investigation_date ?? "").localeCompare(b.investigation_date ?? "")),
    [investigations, investigationType]
  );

  const fieldData = useMemo(() => {
    return ranges
      .map((r) => {
        const values = sorted
          .map((inv) => Number((inv.results as Record<string, unknown>)?.[r.field]))
          .filter((v) => !isNaN(v) && v > 0);
        return { ...r, values };
      })
      .filter((r) => r.values.length >= 2);
  }, [sorted, ranges]);

  if (!ranges.length || sorted.length < 2 || !fieldData.length) return null;

  return (
    <div className="p-3 rounded-lg border bg-card space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trends</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fieldData.map((fd) => (
          <div key={fd.field} className="flex items-center gap-2">
            <Sparkline data={fd.values} width={56} height={20} />
            <div className="text-xs">
              <span className="text-muted-foreground">{fd.label}</span>
              <span className="ml-1 font-medium">{fd.values[fd.values.length - 1]} {fd.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
