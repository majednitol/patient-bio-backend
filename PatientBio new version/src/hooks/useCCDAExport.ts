import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ExportFormat = "fhir" | "ccda" | "ndjson";

interface CCDAExportOptions {
  format: ExportFormat;
}

export const useCCDAExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportCCDA = async (options: CCDAExportOptions = { format: "ccda" }) => {
    setIsExporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be logged in to export data");
        return null;
      }

      const endpoint = options.format === "ccda" ? "export-ccda" : "bulk-export";
      
      if (options.format === "ndjson") {
        // Bulk export returns NDJSON
        const { data, error } = await supabase.functions.invoke(endpoint, {
          body: { action: "start", includeOptions: { includeMetrics: true } },
        });

        if (error) throw error;

        // Download the NDJSON file
        const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data)], { 
          type: "application/ndjson" 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `fhir-bulk-export-${new Date().toISOString().split("T")[0]}.ndjson`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Bulk export downloaded successfully!");
        return data;
      } else {
        // C-CDA export returns XML
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Export failed");
        }

        const xmlContent = await response.text();

        // Download the XML file
        const blob = new Blob([xmlContent], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `patient-ccda-${new Date().toISOString().split("T")[0]}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("C-CDA document exported successfully!");
        return xmlContent;
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export data");
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCCDA, isExporting };
};
