import { AnalysisHistoryEntry, DiagnosisSuggestion } from "@/hooks/useReportDiagnosisAnalysis";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const confidenceOrder = { high: 3, medium: 2, low: 1 };

interface Props {
  current: AnalysisHistoryEntry;
  previous: AnalysisHistoryEntry;
}

export function AnalysisHistoryComparison({ current, previous }: Props) {
  const prevDiagnoses = new Map(previous.suggestions.map((s) => [s.diagnosis.toLowerCase(), s]));
  const currDiagnoses = new Map(current.suggestions.map((s) => [s.diagnosis.toLowerCase(), s]));

  const allDiagnoses = new Set([...prevDiagnoses.keys(), ...currDiagnoses.keys()]);

  const items: {
    diagnosis: string;
    status: "new" | "removed" | "changed" | "unchanged";
    current?: DiagnosisSuggestion;
    previous?: DiagnosisSuggestion;
    confidenceChange?: "up" | "down" | "same";
  }[] = [];

  allDiagnoses.forEach((key) => {
    const prev = prevDiagnoses.get(key);
    const curr = currDiagnoses.get(key);

    if (curr && !prev) {
      items.push({ diagnosis: curr.diagnosis, status: "new", current: curr });
    } else if (!curr && prev) {
      items.push({ diagnosis: prev.diagnosis, status: "removed", previous: prev });
    } else if (curr && prev) {
      const prevConf = confidenceOrder[prev.confidence];
      const currConf = confidenceOrder[curr.confidence];
      const change = currConf > prevConf ? "up" : currConf < prevConf ? "down" : "same";
      items.push({
        diagnosis: curr.diagnosis,
        status: change === "same" ? "unchanged" : "changed",
        current: curr,
        previous: prev,
        confidenceChange: change,
      });
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Comparing with analysis from {formatDistanceToNow(new Date(previous.analyzed_at), { addSuffix: true })}
      </div>

      {items.map((item, i) => (
        <Card
          key={i}
          className={`border ${
            item.status === "new"
              ? "border-green-200 bg-green-50/50"
              : item.status === "removed"
              ? "border-red-200 bg-red-50/50"
              : item.status === "changed"
              ? "border-amber-200 bg-amber-50/50"
              : "border-border"
          }`}
        >
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{item.diagnosis}</span>
              <div className="flex items-center gap-1.5">
                {item.status === "new" && (
                  <Badge variant="outline" className="text-xs text-green-700 bg-green-100 border-green-200">
                    New
                  </Badge>
                )}
                {item.status === "removed" && (
                  <Badge variant="outline" className="text-xs text-red-700 bg-red-100 border-red-200">
                    Removed
                  </Badge>
                )}
                {item.confidenceChange === "up" && (
                  <div className="flex items-center gap-0.5 text-green-600">
                    <ArrowUp className="h-3 w-3" />
                    <span className="text-xs">{item.previous?.confidence} → {item.current?.confidence}</span>
                  </div>
                )}
                {item.confidenceChange === "down" && (
                  <div className="flex items-center gap-0.5 text-red-600">
                    <ArrowDown className="h-3 w-3" />
                    <span className="text-xs">{item.previous?.confidence} → {item.current?.confidence}</span>
                  </div>
                )}
                {item.confidenceChange === "same" && (
                  <div className="flex items-center gap-0.5 text-muted-foreground">
                    <Minus className="h-3 w-3" />
                    <span className="text-xs">{item.current?.confidence}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
