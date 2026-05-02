import { cn } from "@/lib/utils";

interface TransactionDiffProps {
  metadata: Record<string, unknown> | null;
}

interface DiffEntry {
  key: string;
  before: string;
  after: string;
  changed: boolean;
}

function extractDiff(metadata: Record<string, unknown>): DiffEntry[] | null {
  // Try to find before/after patterns in metadata
  const before = metadata.previous_values || metadata.before || metadata.old;
  const after = metadata.new_values || metadata.after || metadata.new || metadata.current;

  if (before && after && typeof before === "object" && typeof after === "object") {
    const allKeys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);
    return Array.from(allKeys).map((key) => {
      const bVal = String((before as Record<string, unknown>)[key] ?? "—");
      const aVal = String((after as Record<string, unknown>)[key] ?? "—");
      return { key, before: bVal, after: aVal, changed: bVal !== aVal };
    });
  }

  // Fallback: if metadata has title_before/title_after pattern
  const diffEntries: DiffEntry[] = [];
  const keys = Object.keys(metadata);
  const beforeKeys = keys.filter((k) => k.endsWith("_before") || k.startsWith("old_"));
  if (beforeKeys.length > 0) {
    beforeKeys.forEach((bk) => {
      const field = bk.replace(/_before$/, "").replace(/^old_/, "");
      const ak = keys.find((k) => k === `${field}_after` || k === `new_${field}`);
      const bVal = String(metadata[bk] ?? "—");
      const aVal = ak ? String(metadata[ak] ?? "—") : "—";
      diffEntries.push({ key: field, before: bVal, after: aVal, changed: bVal !== aVal });
    });
    return diffEntries;
  }

  return null;
}

export function TransactionDiff({ metadata }: TransactionDiffProps) {
  if (!metadata) return null;

  const diff = extractDiff(metadata);
  if (!diff) return null;

  return (
    <div className="border-t pt-4">
      <h4 className="text-sm font-semibold mb-3">Changes Detected</h4>
      <div className="rounded-lg border overflow-hidden">
        <div className="grid grid-cols-3 text-[11px] font-medium bg-muted px-3 py-1.5">
          <span>Field</span>
          <span>Before</span>
          <span>After</span>
        </div>
        {diff.map((entry) => (
          <div
            key={entry.key}
            className={cn(
              "grid grid-cols-3 text-xs px-3 py-2 border-t",
              entry.changed && "bg-amber-500/5"
            )}
          >
            <span className="font-medium capitalize">{entry.key.replace(/_/g, " ")}</span>
            <span className={cn(entry.changed && "text-destructive line-through")}>{entry.before}</span>
            <span className={cn(entry.changed && "text-green-600 font-medium")}>{entry.after}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
