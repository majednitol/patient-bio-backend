import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw, BookOpen, ExternalLink, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { DomainInsightTemplates, type InsightTemplate } from "@/components/researcher/DomainInsightTemplates";

interface CohortStats {
  totalShares: number;
  uniquePatients: number;
  anonymized: number;
  identified: number;
  diseaseDistribution: Record<string, number>;
  statusBreakdown: Record<string, number>;
  genderDistribution?: Record<string, number>;
  ageDistribution?: Record<string, number>;
}

interface PubMedPaper {
  title: string;
  authors: string;
  journal: string;
  year: string;
  pmid: string;
  abstract: string;
}

interface AIResearchInsightsProps {
  cohortStats: CohortStats;
  activeDomain?: string | null;
}

export const AIResearchInsights = ({ cohortStats, activeDomain }: AIResearchInsightsProps) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [literatureInsight, setLiteratureInsight] = useState<string | null>(null);
  const [papers, setPapers] = useState<PubMedPaper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLitLoading, setIsLitLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const [selectedTemplate, setSelectedTemplate] = useState<InsightTemplate | null>(null);

  const generateInsights = async (templatePrompt?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("research-ai-insights", {
        body: { 
          cohortStats, 
          includeLiterature: false,
          ...(templatePrompt ? { customPrompt: templatePrompt } : {}),
        },
      });
      if (error) throw error;
      setInsight(data.insight);
      setActiveTab("insights");
    } catch (err) {
      console.error("AI insights error:", err);
      toast({ title: "Error", description: "Failed to generate insights.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: InsightTemplate) => {
    setSelectedTemplate(template);
    generateInsights(template.prompt);
  };

  const generateLiteratureInsights = async () => {
    setIsLitLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("research-ai-insights", {
        body: { cohortStats, includeLiterature: true },
      });
      if (error) throw error;
      setLiteratureInsight(data.insight);
      setPapers(data.papers || []);
      setActiveTab("literature");
    } catch (err) {
      console.error("Literature insights error:", err);
      toast({ title: "Error", description: "Failed to generate literature analysis.", variant: "destructive" });
    } finally {
      setIsLitLoading(false);
    }
  };

  const hasDiseaseData = Object.keys(cohortStats.diseaseDistribution || {}).filter(k => k !== "General").length > 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            AI Research Insights
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-1">
            AI-powered cohort analysis & literature integration
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateInsights()}
            disabled={isLoading || isLitLoading || cohortStats.totalShares === 0}
            size="sm"
            variant="outline"
            className="h-8 text-xs"
          >
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5 mr-1.5" />}
            {insight ? "Refresh" : "Cohort Analysis"}
          </Button>
          <Button
            onClick={generateLiteratureInsights}
            disabled={isLoading || isLitLoading || cohortStats.totalShares === 0 || !hasDiseaseData}
            size="sm"
            className="h-8 text-xs"
          >
            {isLitLoading ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5 mr-1.5" />}
            {literatureInsight ? "Refresh" : "Literature Analysis"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Domain Templates */}
        <div className="mb-4">
          <DomainInsightTemplates onSelectTemplate={handleTemplateSelect} activeDomain={activeDomain} />
        </div>

        {selectedTemplate && (
          <div className="mb-4 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
            Using template: <span className="font-medium">{selectedTemplate.name}</span> ({selectedTemplate.domain})
          </div>
        )}

        {!insight && !literatureInsight ? (
          <p className="text-sm text-muted-foreground">
            {cohortStats.totalShares === 0
              ? "No data available for analysis. Receive patient shares first."
              : !hasDiseaseData
                ? "Click \"Cohort Analysis\" for AI insights. Add disease-specific data shares to enable Literature Analysis."
                : "Click \"Cohort Analysis\" for AI insights, select a domain template, or use \"Literature Analysis\" to cross-reference with published research."}
          </p>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {insight && <TabsTrigger value="insights">Cohort Insights</TabsTrigger>}
              {literatureInsight && <TabsTrigger value="literature">Literature Integration</TabsTrigger>}
              {papers.length > 0 && <TabsTrigger value="papers">Suggested Papers ({papers.length})</TabsTrigger>}
            </TabsList>

            {insight && (
              <TabsContent value="insights" className="mt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{insight}</ReactMarkdown>
                </div>
              </TabsContent>
            )}

            {literatureInsight && (
              <TabsContent value="literature" className="mt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{literatureInsight}</ReactMarkdown>
                </div>
              </TabsContent>
            )}

            {papers.length > 0 && (
              <TabsContent value="papers" className="mt-4 space-y-3">
                {papers.map((paper) => (
                  <div key={paper.pmid} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold leading-tight">{paper.title}</h4>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-accent">
                          <ExternalLink className="h-3 w-3" />
                          PMID {paper.pmid}
                        </Badge>
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {paper.authors} · <span className="font-medium">{paper.journal}</span> ({paper.year})
                    </p>
                    {paper.abstract && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-3">
                        {paper.abstract}
                      </p>
                    )}
                  </div>
                ))}
              </TabsContent>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
