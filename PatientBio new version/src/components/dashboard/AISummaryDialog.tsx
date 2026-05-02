import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocumentSummary } from "@/hooks/useDocumentSummary";
import {
  Sparkles,
  Loader2,
  Copy,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AISummaryDialogProps {
  documentTitle: string;
  documentType: string;
  documentUrl?: string;
  additionalContext?: string;
  trigger?: React.ReactNode;
}

export const AISummaryDialog = ({
  documentTitle,
  documentType,
  documentUrl,
  additionalContext,
  trigger,
}: AISummaryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { generateSummary, summary, isLoading, clearSummary } = useDocumentSummary();

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !summary) {
      await generateSummary(documentTitle, documentType, documentUrl, additionalContext);
    }
    if (!isOpen) {
      clearSummary();
      setCopied(false);
    }
  };

  const handleCopy = () => {
    if (summary?.summary) {
      navigator.clipboard.writeText(summary.summary);
      setCopied(true);
      toast.success("Summary copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    await generateSummary(documentTitle, documentType, documentUrl, additionalContext);
  };

  return (
    <>
      <span onClick={() => handleOpen(true)}>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Summary
          </Button>
        )}
      </span>
      <ResponsiveDialog open={open} onOpenChange={handleOpen}>
        <ResponsiveDialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Document Summary
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {documentTitle}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing document...
              </p>
            </div>
          ) : summary ? (
            <ScrollArea className="h-[350px] pr-4">
              <div className="space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {summary.summary}
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    This AI-generated summary is for informational purposes only.
                    Always consult your healthcare provider for medical advice.
                  </p>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Unable to generate summary. Please try again.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleRegenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            onClick={handleCopy}
            disabled={!summary || isLoading}
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Summary
              </>
            )}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
    </>
  );
};
