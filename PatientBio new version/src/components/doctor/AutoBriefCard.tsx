import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Sparkles, AlertCircle } from "lucide-react";
import { useConsultationBrief } from "@/hooks/useConsultationBrief";
import ReactMarkdown from "react-markdown";

interface AutoBriefCardProps {
  patientId: string;
  appointmentId?: string;
  enabled?: boolean;
}

export function AutoBriefCard({ patientId, appointmentId, enabled = true }: AutoBriefCardProps) {
  const { data, isLoading, error } = useConsultationBrief(patientId, appointmentId, enabled);

  if (!enabled) return null;

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
            <Brain className="h-4 w-4 animate-pulse" />
            Generating Pre-Consultation Brief...
            <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto" />
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-primary/10 rounded w-full" />
            <div className="h-3 bg-primary/10 rounded w-4/5" />
            <div className="h-3 bg-primary/10 rounded w-3/5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-300/50 bg-amber-500/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span>Brief unavailable — review patient data below</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.brief) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
          <Brain className="h-4 w-4" />
          Pre-Consultation Brief
          {data.ai_generated && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 ml-auto border-primary/30 text-primary">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              AI Generated
            </Badge>
          )}
          {!data.data_available && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 ml-auto">
              First Visit
            </Badge>
          )}
        </div>
        <div className="text-sm prose prose-sm prose-neutral dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:my-1 [&>ul]:ml-4 [&>li]:my-0.5">
          <ReactMarkdown>{data.brief}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
