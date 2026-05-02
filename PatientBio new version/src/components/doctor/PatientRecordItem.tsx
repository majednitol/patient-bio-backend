import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PatientRecordItemProps {
  record: {
    id: string;
    title: string;
    category: string;
    disease_category: string;
    record_date: string | null;
    file_type: string | null;
  };
}

export const PatientRecordItem = ({ record }: PatientRecordItemProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleViewDocument = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-doctor-document-url",
        {
          body: { record_id: record.id },
        }
      );

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to get document URL");
      }

      if (data?.error) {
        if (data.error === "forbidden") {
          toast({
            title: "Access Denied",
            description: "You don't have access to this patient's records.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to load document",
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.url) {
        // Open in new tab
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      toast({
        title: "Error",
        description: "Failed to load document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFileTypeLabel = (fileType: string | null) => {
    if (!fileType) return "File";
    if (fileType.includes("pdf")) return "PDF";
    if (fileType.includes("image")) return "Image";
    return "File";
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{record.title}</p>
          <p className="text-xs text-muted-foreground">
            {record.category} • {record.disease_category}
            {record.record_date &&
              ` • ${format(new Date(record.record_date), "MMM d, yyyy")}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs">
          {getFileTypeLabel(record.file_type)}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewDocument}
          disabled={isLoading}
          className="h-8 px-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              View
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
