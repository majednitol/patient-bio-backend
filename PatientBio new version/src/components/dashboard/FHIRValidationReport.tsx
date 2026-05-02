import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  FileJson,
  ExternalLink,
} from "lucide-react";
import { ValidationResult, ValidationIssue } from "@/lib/fhirValidator";

interface FHIRValidationReportProps {
  result: ValidationResult;
  onDownloadAnyway?: () => void;
  onClose?: () => void;
}

export const FHIRValidationReport = ({
  result,
  onDownloadAnyway,
  onClose,
}: FHIRValidationReportProps) => {
  const getSeverityIcon = (severity: ValidationIssue["severity"]) => {
    switch (severity) {
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "info":
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getSeverityBadge = (severity: ValidationIssue["severity"]) => {
    switch (severity) {
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "warning":
        return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
      case "info":
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  // Group issues by resource type
  const groupedIssues = [...result.errors, ...result.warnings, ...result.infos].reduce(
    (acc, issue) => {
      const key = issue.resourceType;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    },
    {} as Record<string, ValidationIssue[]>
  );

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className={result.isValid ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.isValid ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
              <CardTitle className="text-lg">
                {result.isValid ? "Validation Passed" : "Validation Issues Found"}
              </CardTitle>
            </div>
          </div>
          <CardDescription>
            {result.totalResources} resources • {result.errors.length} errors • {result.warnings.length} warnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.resourceCounts).map(([type, count]) => (
              <Badge key={type} variant="secondary" className="gap-1">
                <FileJson className="h-3 w-3" />
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {(result.errors.length > 0 || result.warnings.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Validation Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <Accordion type="multiple" className="px-4">
                {Object.entries(groupedIssues).map(([resourceType, issues]) => (
                  <AccordionItem key={resourceType} value={resourceType}>
                    <AccordionTrigger className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{resourceType}</span>
                        <Badge variant="outline" className="ml-2">
                          {issues.length} issue{issues.length !== 1 ? "s" : ""}
                        </Badge>
                        {issues.some((i) => i.severity === "error") && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pl-2">
                        {issues.map((issue, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                          >
                            {getSeverityIcon(issue.severity)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getSeverityBadge(issue.severity)}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {issue.path}
                                </code>
                              </div>
                              <p className="text-sm mt-1">{issue.message}</p>
                              {issue.resourceId && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Resource ID: {issue.resourceId}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* FHIR Specification Link */}
      <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        <span>Validated against FHIR R4 specification</span>
        <a
          href="https://hl7.org/fhir/R4/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-primary hover:underline"
        >
          View Spec
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onClose && (
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
        )}
        {!result.isValid && onDownloadAnyway && (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onDownloadAnyway}
          >
            Download Anyway
          </Button>
        )}
      </div>
    </div>
  );
};
