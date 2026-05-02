import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RefreshCw, FlaskConical, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PoolStats {
  totalContributors: number;
  diseaseDistribution: Record<string, number>;
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  jurisdictions: string[];
}

interface Hypothesis {
  id: string;
  title: string;
  hypothesis: string;
  rationale: string;
  suggestedDesign: string;
  estimatedEffectSize: string;
  confidence: string;
  relevantSubgroups: string[];
  potentialImpact: string;
}

interface HypothesisResult {
  hypotheses: Hypothesis[];
  dataQualityNote: string;
}

export const HypothesisGenerator = ({ stats }: { stats: PoolStats }) => {
  const [result, setResult] = useState<HypothesisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const generate = async () => {
    setIsLoading(true);
    setAccepted(new Set());
    setDismissed(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("ai-hypothesis-generator", {
        body: { poolStats: stats, mode: "hypotheses" },
      });
      if (error) throw error;
      setResult(data);
    } catch {
      toast({ title: "Error", description: "Failed to generate hypotheses.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceColor = (c: string) => {
    if (c === "high") return "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400";
    if (c === "medium") return "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400";
    return "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400";
  };

  const effectBadge = (e: string) => {
    const map: Record<string, string> = { small: "d = 0.2", medium: "d = 0.5", large: "d = 0.8" };
    return map[e] || e;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-primary" />
              AI Hypothesis Generator
            </CardTitle>
            <CardDescription>AI-generated testable research hypotheses from pool data patterns</CardDescription>
          </div>
          <Button onClick={generate} disabled={isLoading || stats.totalContributors === 0} size="sm">
            {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            {result ? "Regenerate" : "Generate Hypotheses"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!result ? (
          <p className="text-sm text-muted-foreground">
            {stats.totalContributors === 0
              ? "No pool data available. Contributions needed to generate hypotheses."
              : "Click \"Generate Hypotheses\" to get AI-suggested testable research hypotheses based on current pool data patterns."}
          </p>
        ) : (
          <div className="space-y-3">
            {result.hypotheses
              .filter(h => !dismissed.has(h.id))
              .map((h) => (
                <Collapsible
                  key={h.id}
                  open={expandedId === h.id}
                  onOpenChange={(open) => setExpandedId(open ? h.id : null)}
                >
                  <div className={`border rounded-lg p-4 transition-colors ${accepted.has(h.id) ? "border-primary/40 bg-primary/5" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <CollapsibleTrigger asChild>
                        <div className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">{h.id}</Badge>
                            <Badge variant="outline" className={`text-xs ${confidenceColor(h.confidence)}`}>
                              {h.confidence} confidence
                            </Badge>
                            <Badge variant="secondary" className="text-xs">{h.suggestedDesign}</Badge>
                          </div>
                          <h4 className="text-sm font-semibold">{h.title}</h4>
                        </div>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600"
                          onClick={() => {
                            setAccepted(prev => new Set(prev).add(h.id));
                            toast({ title: "Hypothesis accepted", description: `${h.id} marked for further investigation.` });
                          }}
                          disabled={accepted.has(h.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => setDismissed(prev => new Set(prev).add(h.id))}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            {expandedId === h.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-3 space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Hypothesis: </span>
                        <span>{h.hypothesis}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Rationale: </span>
                        <span>{h.rationale}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="font-medium text-muted-foreground text-xs">Effect size:</span>
                        <Badge variant="outline" className="text-xs">{effectBadge(h.estimatedEffectSize)}</Badge>
                        <span className="font-medium text-muted-foreground text-xs">Subgroups:</span>
                        {h.relevantSubgroups.map(s => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground italic">{h.potentialImpact}</div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            {result.dataQualityNote && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2">{result.dataQualityNote}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
