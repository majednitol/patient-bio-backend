import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type HealthRecord = Tables<"health_records">;

interface RecordComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: HealthRecord[];
}

export function RecordComparisonDialog({
  open,
  onOpenChange,
  records,
}: RecordComparisonDialogProps) {
  if (records.length < 2) return null;

  // Sort by date ascending so oldest is first (left)
  const sorted = [...records].sort(
    (a, b) =>
      new Date(a.record_date || a.uploaded_at).getTime() -
      new Date(b.record_date || b.uploaded_at).getTime()
  );

  const fields: { label: string; key: keyof HealthRecord | "date" }[] = [
    { label: "Date", key: "date" },
    { label: "Category", key: "category" },
    { label: "Provider", key: "provider_name" },
    { label: "Description", key: "description" },
    { label: "Notes", key: "notes" },
  ];

  const getValue = (record: HealthRecord, key: string): string => {
    if (key === "date") {
      const d = record.record_date || record.uploaded_at;
      return d ? format(new Date(d), "MMM d, yyyy") : "—";
    }
    if (key === "category") {
      return record.category
        ? record.category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
        : "—";
    }
    const val = record[key as keyof HealthRecord];
    return (val as string) || "—";
  };

  // Check if values differ across records for highlighting
  const valuesDiffer = (key: string): boolean => {
    const values = sorted.map((r) => getValue(r, key));
    return new Set(values).size > 1;
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-3xl max-h-[85vh] w-[95vw] sm:w-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Compare Records ({sorted.length})
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ScrollArea className="max-h-[65vh]">
          {/* Desktop: grid layout */}
          <div className="hidden sm:block space-y-1">
            {/* Header row with record titles */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `140px repeat(${sorted.length}, 1fr)` }}>
              <div className="text-xs font-medium text-muted-foreground py-2">Field</div>
              {sorted.map((record) => (
                <Card key={record.id} className="border-primary/20">
                  <CardContent className="p-3">
                    <h4 className="font-semibold text-sm line-clamp-2 mb-1">
                      {record.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(record.record_date || record.uploaded_at), "MMM d, yyyy")}
                    </div>
                    {record.provider_name && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <User className="h-3 w-3" />
                        <span className="truncate">{record.provider_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comparison rows */}
            {fields.map(({ label, key }) => {
              const differs = valuesDiffer(key);
              return (
                <div
                  key={key}
                  className={`grid gap-3 py-2.5 px-2 rounded-md ${
                    differs ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                  }`}
                  style={{ gridTemplateColumns: `140px repeat(${sorted.length}, 1fr)` }}
                >
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    {label}
                    {differs && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                      >
                        Changed
                      </Badge>
                    )}
                  </div>
                  {sorted.map((record) => (
                    <div key={record.id} className="text-sm text-foreground break-words">
                      {getValue(record, key)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Mobile: stacked card layout */}
          <div className="sm:hidden space-y-4 px-1">
            {sorted.map((record, idx) => (
              <Card key={record.id} className="border-primary/20">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm line-clamp-2 min-w-0">
                      {record.title}
                    </h4>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Record {idx + 1}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {fields.map(({ label, key }) => {
                      const differs = valuesDiffer(key);
                      return (
                        <div
                          key={key}
                          className={`flex flex-col gap-0.5 py-1 px-2 rounded ${
                            differs ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                          }`}
                        >
                          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            {label}
                            {differs && (
                              <Badge
                                variant="outline"
                                className="text-[8px] px-1 py-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                              >
                                Changed
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-foreground break-words">
                            {getValue(record, key)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
