import { BulkAnalysisProgress } from "@/hooks/useReportDiagnosisAnalysis";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Brain, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: BulkAnalysisProgress | null;
  isAnalyzing: boolean;
  onCancel: () => void;
}

export function BulkAnalysisProgressDialog({ open, onOpenChange, progress, isAnalyzing, onCancel }: Props) {
  if (!progress) return null;

  const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const successCount = progress.results.filter((r) => r.status === "success").length;
  const errorCount = progress.results.filter((r) => r.status === "error").length;
  const totalHigh = progress.results.reduce((s, r) => s + r.highConfidence, 0);
  const totalMedium = progress.results.reduce((s, r) => s + r.mediumConfidence, 0);
  const totalLow = progress.results.reduce((s, r) => s + r.lowConfidence, 0);

  return (
    <Dialog open={open} onOpenChange={isAnalyzing ? undefined : onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            Bulk AI Analysis
          </DialogTitle>
          <DialogDescription>
            {isAnalyzing
              ? `Analyzing report ${progress.completed + 1} of ${progress.total}...`
              : `Completed ${progress.completed} of ${progress.total} reports`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {isAnalyzing && progress.currentReportName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing: {progress.currentReportName}
            </div>
          )}

          {progress.results.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {progress.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {r.status === "success" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                    )}
                    <span className="truncate">{r.reportName}</span>
                  </div>
                  {r.status === "success" && (
                    <div className="flex gap-1 flex-shrink-0">
                      {r.highConfidence > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-700 bg-green-50">{r.highConfidence}H</Badge>}
                      {r.mediumConfidence > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-700 bg-amber-50">{r.mediumConfidence}M</Badge>}
                      {r.lowConfidence > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0 text-red-700 bg-red-50">{r.lowConfidence}L</Badge>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isAnalyzing && progress.completed > 0 && (
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">Summary</p>
              <div className="flex gap-3 text-xs">
                <span className="text-green-700">{successCount} analyzed</span>
                {errorCount > 0 && <span className="text-red-700">{errorCount} failed</span>}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{totalHigh} high confidence</span>
                <span>{totalMedium} medium</span>
                <span>{totalLow} low</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {isAnalyzing ? (
              <Button variant="destructive" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : (
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
