import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseFHIRBundle, type ImportPreview, type FHIRBundle } from "@/lib/fhirResourceMapper";
import { validateFHIRBundle, type ValidationResult } from "@/lib/fhirValidator";

export type ConflictResolution = "merge" | "replace" | "skip";

interface ImportResult {
  success: boolean;
  summary: {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  };
  details: Array<{
    resourceType: string;
    action: string;
    details?: string;
    error?: string;
  }>;
  importLogId?: string;
}

interface UseFHIRImportReturn {
  // State
  isLoading: boolean;
  isParsing: boolean;
  isImporting: boolean;
  bundle: FHIRBundle | null;
  preview: ImportPreview | null;
  validation: ValidationResult | null;
  importResult: ImportResult | null;
  error: string | null;
  
  // Actions
  parseFile: (file: File) => Promise<void>;
  importBundle: (conflictResolution: ConflictResolution) => Promise<boolean>;
  reset: () => void;
}

export function useFHIRImport(): UseFHIRImportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [bundle, setBundle] = useState<FHIRBundle | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilename, setSourceFilename] = useState<string>("");

  const reset = useCallback(() => {
    setBundle(null);
    setPreview(null);
    setValidation(null);
    setImportResult(null);
    setError(null);
    setSourceFilename("");
  }, []);

  const parseFile = useCallback(async (file: File) => {
    setIsParsing(true);
    setError(null);
    setImportResult(null);
    setSourceFilename(file.name);

    try {
      // Read file content
      const text = await file.text();
      
      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file. Please upload a valid FHIR JSON bundle.");
      }

      // Check if it's a FHIR Bundle
      const potentialBundle = parsed as Record<string, unknown>;
      if (potentialBundle.resourceType !== "Bundle") {
        throw new Error("File is not a FHIR Bundle. Expected resourceType: 'Bundle'");
      }

      const fhirBundle = parsed as FHIRBundle;
      
      // Validate the bundle
      const validationResult = validateFHIRBundle(fhirBundle);
      setValidation(validationResult);

      // Parse for preview
      const importPreview = parseFHIRBundle(fhirBundle);
      
      if (importPreview.totalCount === 0) {
        throw new Error("Bundle contains no resources to import.");
      }

      setBundle(fhirBundle);
      setPreview(importPreview);
      
      toast.success(`Parsed ${importPreview.totalCount} resources from ${file.name}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to parse file";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const importBundle = useCallback(async (conflictResolution: ConflictResolution): Promise<boolean> => {
    if (!bundle) {
      toast.error("No bundle to import");
      return false;
    }

    setIsImporting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be logged in to import data");
      }

      const { data, error: invokeError } = await supabase.functions.invoke("import-fhir", {
        body: {
          bundle,
          conflictResolution,
          sourceFilename,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message || "Import failed");
      }

      if (!data.success) {
        throw new Error(data.error || "Import failed");
      }

      setImportResult(data);
      
      const summary = data.summary;
      toast.success(
        `Import complete: ${summary.imported} imported, ${summary.skipped} skipped, ${summary.errors} errors`
      );

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Import failed";
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsImporting(false);
    }
  }, [bundle, sourceFilename]);

  return {
    isLoading: isParsing || isImporting,
    isParsing,
    isImporting,
    bundle,
    preview,
    validation,
    importResult,
    error,
    parseFile,
    importBundle,
    reset,
  };
}
