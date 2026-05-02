import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface DocumentSummary {
  summary: string;
  documentTitle: string;
  documentType: string;
  generatedAt: string;
}

export const useDocumentSummary = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);

  const generateSummary = async (
    documentTitle: string,
    documentType: string,
    documentUrl?: string,
    additionalContext?: string
  ): Promise<DocumentSummary | null> => {
    setIsLoading(true);
    setSummary(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to generate summaries");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("summarize-document", {
        body: {
          documentUrl,
          documentTitle,
          documentType,
          additionalContext,
        },
      });

      if (error) {
        console.error("Summary error:", error);
        toast.error("Failed to generate summary");
        return null;
      }

      const result = data as DocumentSummary;
      setSummary(result);
      return result;
    } catch (err) {
      console.error("Summary error:", err);
      toast.error("An error occurred while generating the summary");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearSummary = () => {
    setSummary(null);
  };

  return {
    generateSummary,
    clearSummary,
    summary,
    isLoading,
  };
};
