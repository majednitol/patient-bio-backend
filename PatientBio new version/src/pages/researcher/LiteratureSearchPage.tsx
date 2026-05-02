import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Search, Sparkles, Download, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CrossReference {
  id: string;
  dataPattern: string;
  knownContext: string;
  confidence: number;
  relevance: string;
  implications: string;
  suggestedFollowUp: string;
  relatedThemes: string[];
}

interface LiteratureResult {
  crossReferences: CrossReference[];
  overallSummary: string;
  gaps: string[];
  recommendedReadings: { title: string; relevance: string }[];
}

const LiteratureSearchPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { researcherShares } = usePatientResearcherShares();
  const [question, setQuestion] = useState("");
  const [studyNotes, setStudyNotes] = useState("");
  const [result, setResult] = useState<LiteratureResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const buildCohortSummary = () => {
    const total = researcherShares.length;
    const diseases: Record<string, number> = {};
    researcherShares.forEach((s) => {
      const cat = s.disease_category || "Unspecified";
      diseases[cat] = (diseases[cat] || 0) + 1;
    });
    const anonymized = researcherShares.filter((s) => s.is_anonymized).length;
    return `Total patients: ${total}. Disease distribution: ${JSON.stringify(diseases)}. Anonymized shares: ${anonymized}/${total}.`;
  };

  const handleSearch = async () => {
    if (!question.trim()) {
      toast({ title: "Please enter a research question", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-literature-crossref", {
        body: {
          question: question.trim(),
          cohortSummary: buildCohortSummary(),
          studyNotes: studyNotes.trim() || undefined,
        },
      });
      if (error) throw error;
      setResult(data as LiteratureResult);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    if (c >= 0.5) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    return "bg-red-500/15 text-red-700 dark:text-red-400";
  };

  const exportAsPDF = () => {
    toast({ title: "Export started", description: "PDF generation will be available in a future update." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-research-primary" />
            AI Literature Cross-Reference
          </h1>
          <p className="text-muted-foreground mt-2">
            Cross-reference your cohort findings with known medical research themes using AI analysis.
          </p>
        </div>
        {result && (
          <Button variant="outline" onClick={exportAsPDF} className="gap-2">
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" /> Research Query
            </CardTitle>
            <CardDescription>
              Enter your research question and optionally paste study notes for deeper cross-referencing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Research Question *</label>
              <Textarea
                placeholder="e.g., What is the relationship between HbA1c levels and cardiovascular outcomes in diabetic patients over 60?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Study Notes (optional)</label>
              <Textarea
                placeholder="Paste relevant observations, preliminary findings, or methodology notes..."
                value={studyNotes}
                onChange={(e) => setStudyNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium">Cohort context:</p>
              <p>{researcherShares.length} patient shares will be summarized for cross-referencing.</p>
            </div>
            <Button onClick={handleSearch} disabled={isLoading || !question.trim()} className="w-full gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isLoading ? "Analyzing..." : "Cross-Reference with AI"}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !isLoading && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-16 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-lg">Enter a research question to begin AI cross-referencing</p>
                <p className="text-muted-foreground/60 text-sm mt-1">
                  The engine will analyze your cohort data against known medical research patterns.
                </p>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-research-primary mb-4" />
                <p className="text-muted-foreground">Analyzing your data against medical literature...</p>
                <p className="text-muted-foreground/60 text-sm mt-1">This may take 15-30 seconds.</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Summary */}
              <Card className="border-research-primary/30 bg-research-primary/5">
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-2">Overall Summary</h3>
                  <p className="text-muted-foreground">{result.overallSummary}</p>
                </CardContent>
              </Card>

              {/* Cross-Reference Cards */}
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-4">
                  {result.crossReferences.map((cr) => (
                    <Card key={cr.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{cr.id}</Badge>
                          <div className="flex gap-2">
                            <Badge className={confidenceColor(cr.confidence)}>
                              {Math.round(cr.confidence * 100)}% confidence
                            </Badge>
                            <Badge variant={cr.relevance === "high" ? "default" : "secondary"}>
                              {cr.relevance} relevance
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-lg bg-muted/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              Your Data Pattern
                            </p>
                            <p className="text-sm">{cr.dataPattern}</p>
                          </div>
                          <div className="rounded-lg bg-research-primary/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-research-primary mb-2">
                              Known Research Context
                            </p>
                            <p className="text-sm">{cr.knownContext}</p>
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm"><span className="font-medium">Implications:</span> {cr.implications}</p>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <p><span className="font-medium text-foreground">Follow-up:</span> {cr.suggestedFollowUp}</p>
                        </div>
                        {cr.relatedThemes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {cr.relatedThemes.map((theme) => (
                              <Badge key={theme} variant="outline" className="text-xs">{theme}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {/* Gaps & Readings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.gaps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" /> Research Gaps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {result.gaps.map((gap, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-1">•</span>
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {result.recommendedReadings.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-research-primary" /> Recommended Readings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-sm">
                        {result.recommendedReadings.map((reading, i) => (
                          <li key={i}>
                            <p className="font-medium">{reading.title}</p>
                            <p className="text-muted-foreground text-xs">{reading.relevance}</p>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiteratureSearchPage;
