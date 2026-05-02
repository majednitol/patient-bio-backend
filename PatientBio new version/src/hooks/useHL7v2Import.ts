import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface HL7v2ImportResult {
  success: boolean;
  messageType: string;
  sendingApplication: string;
  sendingFacility: string;
  summary: {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  };
  results: Array<{
    success: boolean;
    resourceType: string;
    action: string;
    details?: string;
    error?: string;
  }>;
  importLogId?: string;
}

export function useHL7v2Import() {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<HL7v2ImportResult | null>(null);

  /**
   * Import an HL7v2 message
   */
  const importMessage = async (message: string, sourceFilename?: string): Promise<HL7v2ImportResult> => {
    setIsImporting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-hl7v2`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message, sourceFilename }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: "HL7v2 Import Complete",
          description: `${data.summary.imported} resources imported from ${data.messageType}`,
        });
      } else {
        toast({
          title: "HL7v2 Import Partial",
          description: `${data.summary.imported} imported, ${data.summary.errors} errors`,
          variant: "destructive",
        });
      }

      return data;
    } catch (error: any) {
      console.error("HL7v2 import error:", error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsImporting(false);
    }
  };

  /**
   * Parse an HL7v2 file
   */
  const parseFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  /**
   * Import from file
   */
  const importFile = async (file: File): Promise<HL7v2ImportResult> => {
    const content = await parseFile(file);
    return importMessage(content, file.name);
  };

  /**
   * Validate HL7v2 message structure (basic)
   */
  const validateMessage = (message: string): { valid: boolean; error?: string } => {
    if (!message || !message.trim()) {
      return { valid: false, error: "Message is empty" };
    }

    // Check for MSH segment
    if (!message.startsWith("MSH")) {
      return { valid: false, error: "Message must start with MSH segment" };
    }

    // Check for field separator
    if (message.length < 4) {
      return { valid: false, error: "Message is too short" };
    }

    const fieldSep = message[3];
    if (!fieldSep || fieldSep === " " || fieldSep === "\n" || fieldSep === "\r") {
      return { valid: false, error: "Invalid field separator" };
    }

    return { valid: true };
  };

  /**
   * Get supported message types
   */
  const getSupportedMessageTypes = () => [
    { type: "ADT^A01", description: "Admit/Visit Notification" },
    { type: "ADT^A02", description: "Transfer" },
    { type: "ADT^A03", description: "Discharge" },
    { type: "ADT^A04", description: "Register a Patient" },
    { type: "ADT^A08", description: "Update Patient Information" },
    { type: "ORU^R01", description: "Observation Result (Lab Results)" },
    { type: "ORM^O01", description: "Order Message (Limited Support)" },
  ];

  return {
    importMessage,
    importFile,
    parseFile,
    validateMessage,
    getSupportedMessageTypes,
    isImporting,
    result,
  };
}

export default useHL7v2Import;
