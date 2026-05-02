import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Pill, Stethoscope, TestTube, Image, Calendar } from "lucide-react";

interface TimelineRecord {
  id: string;
  title: string;
  category?: string;
  disease_category?: string;
  record_date?: string;
  uploaded_at?: string;
  description?: string;
  signed_url?: string;
}

interface LongitudinalTimelineProps {
  records: TimelineRecord[];
}

const CATEGORY_CONFIG: Record<string, { icon: typeof FileText; color: string }> = {
  lab_result: { icon: TestTube, color: "text-chart-2" },
  prescription: { icon: Pill, color: "text-chart-3" },
  imaging: { icon: Image, color: "text-chart-4" },
  diagnosis: { icon: Stethoscope, color: "text-chart-5" },
  default: { icon: FileText, color: "text-primary" },
};

const LongitudinalTimeline = ({ records }: LongitudinalTimelineProps) => {
  const sortedRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        const dateA = new Date(a.record_date || a.uploaded_at || 0).getTime();
        const dateB = new Date(b.record_date || b.uploaded_at || 0).getTime();
        return dateB - dateA;
      });
  }, [records]);

  if (sortedRecords.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No records with dates available for timeline</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[360px]">
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />

        <div className="space-y-4">
          {sortedRecords.map((record) => {
            const catKey = record.category?.toLowerCase().replace(/\s+/g, "_") || "default";
            const config = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.default;
            const Icon = config.icon;
            const dateStr = record.record_date || record.uploaded_at;

            return (
              <div key={record.id} className="relative">
                {/* Dot on the line */}
                <div className={`absolute -left-5 top-3 w-3 h-3 rounded-full border-2 border-background bg-primary`} />

                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{record.title}</span>
                          {record.category && (
                            <Badge variant="outline" className="text-xs">{record.category}</Badge>
                          )}
                          {record.disease_category && (
                            <Badge variant="secondary" className="text-xs">
                              {record.disease_category.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        {dateStr && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        )}
                        {record.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{record.description}</p>
                        )}
                      </div>
                      {record.signed_url && (
                        <a
                          href={record.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline shrink-0"
                        >
                          View
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};

export default LongitudinalTimeline;
