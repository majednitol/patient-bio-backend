import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Sparkles, ChevronRight } from "lucide-react";
import { useDiagnosisSuggestion, DiagnosisSuggestion } from "@/hooks/useDiagnosisSuggestion";
import type { AppointmentIntake } from "@/hooks/useAppointmentIntake";

interface AIDiagnosisSuggestionCardProps {
  intake: AppointmentIntake;
  patientAge?: number;
  patientGender?: string;
  patientAllergies?: string[];
  onApplySuggestion?: (suggestion: DiagnosisSuggestion) => void;
}

const confidenceColor: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground",
};

export function AIDiagnosisSuggestionCard({
  intake,
  patientAge,
  patientGender,
  patientAllergies,
  onApplySuggestion,
}: AIDiagnosisSuggestionCardProps) {
  const { suggestions, isLoading, fetchSuggestions } = useDiagnosisSuggestion();

  useEffect(() => {
    if (!intake.chief_complaint) return;
    fetchSuggestions({
      chief_complaint: intake.chief_complaint,
      symptom_duration: intake.symptom_duration || undefined,
      symptom_severity: intake.symptom_severity || undefined,
      self_medications: intake.self_medications || undefined,
      additional_notes: intake.additional_notes || undefined,
      patient_age: patientAge,
      patient_gender: patientGender,
      patient_allergies: patientAllergies,
    });
    // Only trigger once on mount with intake data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!intake.chief_complaint) return null;

  return (
    <Card className="border-violet-500/30 bg-violet-500/5">
      <CardContent className="pt-4 pb-3 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-500" />
          AI Diagnosis Suggestions
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-violet-500/10 text-violet-600 border-violet-500/30">
            Beta
          </Badge>
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing intake data…
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">
            No AI suggestions available for this case.
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="border rounded-md p-2 bg-background/50 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {s.diagnosis}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 capitalize shrink-0 ${confidenceColor[s.confidence]}`}
                  >
                    {s.confidence}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {s.reasoning}
                </p>
                {s.medications.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Rx: {s.medications.map((m) => m.name).join(", ")}
                  </p>
                )}
                {onApplySuggestion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
                    onClick={() => onApplySuggestion(s)}
                  >
                    Apply Suggestion
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
