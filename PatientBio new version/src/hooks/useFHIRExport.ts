import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface FHIRExportOptions {
  format: "json" | "xml";
  includeRecords: boolean;
  includePrescriptions: boolean;
}

export const useFHIRExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportFHIR = async (options: FHIRExportOptions = { format: "json", includeRecords: true, includePrescriptions: true }) => {
    setIsExporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to export data");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("export-fhir", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("FHIR export error:", error);
        toast.error("Failed to export health data");
        return null;
      }

      // Create and download the file
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/fhir+json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `patient-bio-fhir-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Health data exported successfully!");
      return data;
    } catch (err) {
      console.error("Export error:", err);
      toast.error("An error occurred during export");
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportFHIR,
    isExporting,
  };
};
