import { useTreatmentInsights, TreatmentBrief } from "@/hooks/useTreatmentInsights";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Loader2, AlertTriangle, Pill, TestTube2, CalendarClock, Lightbulb } from "lucide-react";

interface TreatmentDecisionCardProps {
  patientId: string;
  appointmentId?: string;
  onApplyMedications?: (medications: TreatmentBrief["recommended_medications"]) => void;
}

export const TreatmentDecisionCard = ({
  patientId,
  appointmentId,
  onApplyMedications,
}: TreatmentDecisionCardProps) => {
  const { brief, generate, isGenerating, isGenerated } = useTreatmentInsights();

  if (!isGenerated && !isGenerating) {
    return (
      <Card className="border-dashed border-primary/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">AI Treatment Decision Support</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generate({ patientId, appointmentId })}
            >
              <Brain className="h-3.5 w-3.5 mr-1" />
              Generate Brief
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Aggregates vitals, prescriptions, allergies, and intake for holistic recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6 flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing patient history...</p>
        </CardContent>
      </Card>
    );
  }

  if (!brief) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Treatment Brief
          </p>
          <Badge variant="secondary" className="text-[10px]">AI-Assisted</Badge>
        </div>

        {/* Treatment Plan */}
        <p className="text-sm">{brief.suggested_plan}</p>

        {/* Contraindications */}
        {brief.contraindicated_medications?.length > 0 && (
          <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Contraindicated
            </p>
            {brief.contraindicated_medications.map((m, i) => (
              <p key={i} className="text-xs text-destructive">
                <span className="font-medium">{m.name}</span>: {m.reason}
              </p>
            ))}
          </div>
        )}

        <Separator />

        {/* Recommended Medications */}
        {brief.recommended_medications?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold flex items-center gap-1">
                <Pill className="h-3.5 w-3.5" />
                Recommended Medications
              </p>
              {onApplyMedications && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs px-2"
                  onClick={() => onApplyMedications(brief.recommended_medications)}
                >
                  Apply to Prescription
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {brief.recommended_medications.map((m, i) => (
                <div key={i} className="text-xs p-2 rounded bg-background border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-muted-foreground">{m.dosage} • {m.frequency}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{m.duration} — {m.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lab Tests */}
        {brief.recommended_lab_tests?.length > 0 && (
          <div>
            <p className="text-xs font-semibold flex items-center gap-1 mb-1">
              <TestTube2 className="h-3.5 w-3.5" />
              Recommended Lab Tests
            </p>
            <div className="flex flex-wrap gap-1">
              {brief.recommended_lab_tests.map((test, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{test}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up + Considerations */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {brief.follow_up_timeline && (
            <div className="p-2 rounded bg-background border">
              <p className="text-muted-foreground flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Follow-up
              </p>
              <p className="font-medium mt-0.5">{brief.follow_up_timeline}</p>
            </div>
          )}
          {brief.key_considerations?.length > 0 && (
            <div className="p-2 rounded bg-background border">
              <p className="text-muted-foreground flex items-center gap-1 mb-0.5">
                <Lightbulb className="h-3 w-3" />
                Key Considerations
              </p>
              {brief.key_considerations.map((c, i) => (
                <p key={i} className="text-[10px]">• {c}</p>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          AI-generated suggestions. Clinical judgment should always prevail.
        </p>
      </CardContent>
    </Card>
  );
};
