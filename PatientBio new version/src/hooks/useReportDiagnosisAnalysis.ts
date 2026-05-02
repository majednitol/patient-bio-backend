import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface DiagnosisSuggestion {
  diagnosis: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  recommended_followup_tests: string[];
  clinical_notes: string;
}

export interface AnalysisResult {
  suggestions: DiagnosisSuggestion[];
  disclaimer: string;
}

export interface AnalysisHistoryEntry {
  id: string;
  analyzed_at: string;
  suggestions: DiagnosisSuggestion[];
  disclaimer: string;
}

export interface AiAnalysisData {
  history: AnalysisHistoryEntry[];
  last_analyzed_at: string;
}

export interface BulkAnalysisProgress {
  total: number;
  completed: number;
  currentReportName: string;
  results: { reportId: string; reportName: string; status: "success" | "error"; highConfidence: number; mediumConfidence: number; lowConfidence: number }[];
}

// Parse ai_analysis JSONB from DB
export const parseAiAnalysis = (data: Json | null): AiAnalysisData | null => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const obj = data as Record<string, Json | undefined>;
  if (!Array.isArray(obj.history)) return null;
  return obj as unknown as AiAnalysisData;
};

export const useReportDiagnosisAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkAnalysisProgress | null>(null);
  const cancelBulkRef = useRef(false);

  const analyze = async (reportId: string): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast({ title: "Please log in to use AI analysis", variant: "destructive" });
        return null;
      }

      const response = await supabase.functions.invoke("analyze-report-diagnosis", {
        body: { report_id: reportId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Analysis failed");
      }

      const data = response.data as AnalysisResult;
      if (!data?.suggestions?.length) {
        throw new Error("No suggestions returned");
      }

      setResult(data);
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to analyze report";
      toast({ title: "Analysis failed", description: message, variant: "destructive" });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = async (reportId: string, analysisResult: AnalysisResult): Promise<boolean> => {
    setIsSaving(true);
    try {
      // Fetch current ai_analysis
      const { data: current, error: fetchError } = await supabase
        .from("pathologist_reports")
        .select("ai_analysis")
        .eq("id", reportId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const existing = parseAiAnalysis(current?.ai_analysis as Json);
      const now = new Date().toISOString();

      const newEntry: AnalysisHistoryEntry = {
        id: crypto.randomUUID(),
        analyzed_at: now,
        suggestions: analysisResult.suggestions,
        disclaimer: analysisResult.disclaimer,
      };

      // Keep last 3 entries
      const history = existing?.history ? [...existing.history, newEntry].slice(-3) : [newEntry];

      const aiAnalysis: AiAnalysisData = {
        history,
        last_analyzed_at: now,
      };

      const { error } = await supabase
        .from("pathologist_reports")
        .update({ ai_analysis: aiAnalysis as unknown as Json })
        .eq("id", reportId);

      if (error) throw error;

      toast({ title: "Analysis saved successfully" });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save analysis";
      toast({ title: "Save failed", description: message, variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const bulkAnalyzeReports = useCallback(async (reports: { id: string; name: string }[]) => {
    setIsBulkAnalyzing(true);
    cancelBulkRef.current = false;

    const progress: BulkAnalysisProgress = {
      total: reports.length,
      completed: 0,
      currentReportName: "",
      results: [],
    };
    setBulkProgress({ ...progress });

    for (const report of reports) {
      if (cancelBulkRef.current) break;

      progress.currentReportName = report.name;
      setBulkProgress({ ...progress });

      try {
        const response = await supabase.functions.invoke("analyze-report-diagnosis", {
          body: { report_id: report.id },
        });

        if (response.error) throw new Error(response.error.message);

        const data = response.data as AnalysisResult;
        if (!data?.suggestions?.length) throw new Error("No suggestions");

        // Auto-save
        const now = new Date().toISOString();
        const { data: current } = await supabase
          .from("pathologist_reports")
          .select("ai_analysis")
          .eq("id", report.id)
          .maybeSingle();

        const existing = parseAiAnalysis(current?.ai_analysis as Json);
        const newEntry: AnalysisHistoryEntry = {
          id: crypto.randomUUID(),
          analyzed_at: now,
          suggestions: data.suggestions,
          disclaimer: data.disclaimer,
        };
        const history = existing?.history ? [...existing.history, newEntry].slice(-3) : [newEntry];

        await supabase
          .from("pathologist_reports")
          .update({ ai_analysis: { history, last_analyzed_at: now } as unknown as Json })
          .eq("id", report.id);

        const counts = data.suggestions.reduce(
          (acc, s) => {
            acc[s.confidence === "high" ? "high" : s.confidence === "medium" ? "medium" : "low"]++;
            return acc;
          },
          { high: 0, medium: 0, low: 0 }
        );

        progress.results.push({
          reportId: report.id,
          reportName: report.name,
          status: "success",
          highConfidence: counts.high,
          mediumConfidence: counts.medium,
          lowConfidence: counts.low,
        });
      } catch {
        progress.results.push({
          reportId: report.id,
          reportName: report.name,
          status: "error",
          highConfidence: 0,
          mediumConfidence: 0,
          lowConfidence: 0,
        });
      }

      progress.completed++;
      setBulkProgress({ ...progress });
    }

    setIsBulkAnalyzing(false);

    const successCount = progress.results.filter((r) => r.status === "success").length;
    const totalHigh = progress.results.reduce((s, r) => s + r.highConfidence, 0);
    const totalMedium = progress.results.reduce((s, r) => s + r.mediumConfidence, 0);

    toast({
      title: `Bulk analysis complete`,
      description: `Analyzed ${successCount}/${reports.length} reports: ${totalHigh} high, ${totalMedium} medium confidence`,
    });
  }, []);

  const cancelBulkAnalysis = useCallback(() => {
    cancelBulkRef.current = true;
  }, []);

  const reset = () => {
    setResult(null);
  };

  return {
    analyze,
    isAnalyzing,
    result,
    reset,
    saveAnalysis,
    isSaving,
    bulkAnalyzeReports,
    isBulkAnalyzing,
    bulkProgress,
    cancelBulkAnalysis,
  };
};
