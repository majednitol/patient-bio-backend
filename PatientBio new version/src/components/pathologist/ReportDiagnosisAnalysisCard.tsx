import { AnalysisResult, DiagnosisSuggestion, AiAnalysisData } from "@/hooks/useReportDiagnosisAnalysis";
import { AnalysisHistoryComparison } from "@/components/pathologist/AnalysisHistoryComparison";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, AlertTriangle, FlaskConical, Stethoscope, Save, History, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const confidenceConfig: Record<string, { color: string; bg: string; border: string }> = {
  high: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  low: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

function SuggestionCard({ suggestion }: { suggestion: DiagnosisSuggestion }) {
  const conf = confidenceConfig[suggestion.confidence] || confidenceConfig.low;

  return (
    <Card className={`${conf.border} border`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
            <h4 className="font-semibold text-sm">{suggestion.diagnosis}</h4>
          </div>
          <Badge variant="outline" className={`text-xs ${conf.color} ${conf.bg} ${conf.border}`}>
            {suggestion.confidence.charAt(0).toUpperCase() + suggestion.confidence.slice(1)} Confidence
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>

        {suggestion.recommended_followup_tests?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <FlaskConical className="h-3 w-3" /> Recommended Follow-up Tests
            </p>
            <div className="flex flex-wrap gap-1">
              {suggestion.recommended_followup_tests.map((test, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {test}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {suggestion.clinical_notes && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
            {suggestion.clinical_notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ReportDiagnosisAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAnalyzing: boolean;
  result: AnalysisResult | null;
  reportName: string;
  onSave?: () => void;
  isSaving?: boolean;
  savedAnalysis?: AiAnalysisData | null;
}

export function ReportDiagnosisAnalysisDialog({
  open,
  onOpenChange,
  isAnalyzing,
  result,
  reportName,
  onSave,
  isSaving,
  savedAnalysis,
}: ReportDiagnosisAnalysisDialogProps) {
  const [showHistory, setShowHistory] = useState(false);

  const history = savedAnalysis?.history || [];
  const hasPreviousAnalysis = history.length >= 1 && result;
  const previousEntry = history.length > 0 ? history[history.length - 1] : null;

  // Build a "current" entry from the live result for comparison
  const currentEntry = result
    ? {
        id: "current",
        analyzed_at: new Date().toISOString(),
        suggestions: result.suggestions,
        disclaimer: result.disclaimer,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[hsl(var(--diagnostic-primary))]" />
            AI Diagnosis Analysis
          </DialogTitle>
          <DialogDescription>
            Analysis for: {reportName}
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--diagnostic-primary))]" />
            <p className="text-sm text-muted-foreground">Analyzing report data with AI...</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {onSave && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSave}
                  disabled={isSaving}
                  className="gap-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  Save Analysis
                </Button>
              )}
              {hasPreviousAnalysis && previousEntry && (
                <Button
                  size="sm"
                  variant={showHistory ? "default" : "outline"}
                  onClick={() => setShowHistory(!showHistory)}
                  className="gap-1.5"
                >
                  <History className="h-3 w-3" />
                  {showHistory ? "Hide" : "Show"} Previous
                </Button>
              )}
            </div>

            {/* History comparison */}
            {showHistory && previousEntry && currentEntry && (
              <AnalysisHistoryComparison
                current={currentEntry}
                previous={previousEntry}
              />
            )}

            {/* Current suggestions */}
            {!showHistory && result.suggestions.map((suggestion, i) => (
              <SuggestionCard key={i} suggestion={suggestion} />
            ))}

            {result.disclaimer && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">{result.disclaimer}</p>
              </div>
            )}

            {/* Last analyzed timestamp */}
            {savedAnalysis?.last_analyzed_at && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last saved: {formatDistanceToNow(new Date(savedAnalysis.last_analyzed_at), { addSuffix: true })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
