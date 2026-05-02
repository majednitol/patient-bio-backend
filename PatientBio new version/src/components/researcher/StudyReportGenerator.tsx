import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLazyPDF, type PDFContentItem } from "@/components/shared/LazyPDFExport";
import { FileBarChart, Loader2, Brain, Users, Shield, BarChart3 } from "lucide-react";

interface StudyReportGeneratorProps {
  shareIds: string[];
  totalShares: number;
}

const SECTIONS = [
  { id: "demographics", label: "Cohort Demographics", icon: Users, description: "Age distribution, gender split" },
  { id: "statistics", label: "Data Statistics", icon: BarChart3, description: "Disease categories, status breakdown" },
  { id: "provenance", label: "Data Provenance", icon: Shield, description: "Blockchain verification hashes" },
  { id: "ai_insights", label: "AI Insights", icon: Brain, description: "Gemini-generated observations" },
] as const;

const StudyReportGenerator = ({ shareIds, totalShares }: StudyReportGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>(["demographics", "statistics", "ai_insights"]);
  const { generate, isGenerating } = useLazyPDF();

  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-study-report", {
        body: { shareIds, sections: selectedSections },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Build PDF content
      const content: PDFContentItem[] = [];

      content.push({ type: "heading", text: "Study Summary Report", level: 1 });
      content.push({ type: "paragraph", text: `Generated from ${data.cohortSummary.totalShares} data shares across ${data.cohortSummary.uniquePatients} unique patients.` });
      content.push({ type: "divider" });

      // Demographics
      if (selectedSections.includes("demographics")) {
        content.push({ type: "heading", text: "Cohort Demographics", level: 2 });
        content.push({
          type: "keyValue",
          data: {
            "Total Patients": String(data.cohortSummary.uniquePatients),
            "Anonymized": String(data.cohortSummary.anonymizedCount),
            "Identified": String(data.cohortSummary.identifiedCount),
          },
        });

        if (Object.keys(data.demographics.ageGroups).length > 0) {
          content.push({ type: "heading", text: "Age Distribution", level: 3 });
          content.push({
            type: "table",
            headers: ["Age Group", "Count"],
            rows: Object.entries(data.demographics.ageGroups).map(([k, v]) => [k, String(v)]),
          });
        }

        if (Object.keys(data.demographics.genderCounts).length > 0) {
          content.push({ type: "heading", text: "Gender Distribution", level: 3 });
          content.push({
            type: "table",
            headers: ["Gender", "Count"],
            rows: Object.entries(data.demographics.genderCounts).map(([k, v]) => [String(k).charAt(0).toUpperCase() + String(k).slice(1), String(v)]),
          });
        }
        content.push({ type: "divider" });
      }

      // Statistics
      if (selectedSections.includes("statistics")) {
        content.push({ type: "heading", text: "Data Statistics", level: 2 });
        content.push({
          type: "table",
          headers: ["Disease Category", "Share Count"],
          rows: Object.entries(data.cohortSummary.diseaseCounts).map(([k, v]) => [
            k.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            String(v),
          ]),
        });
        content.push({
          type: "keyValue",
          data: {
            "Pending Reviews": String(data.cohortSummary.statusCounts.pending || 0),
            "In Progress": String(data.cohortSummary.statusCounts.viewed || 0),
            "Completed": String(data.cohortSummary.statusCounts.completed || 0),
            "Collection Period": `${new Date(data.cohortSummary.dateRange.earliest).toLocaleDateString()} – ${new Date(data.cohortSummary.dateRange.latest).toLocaleDateString()}`,
          },
        });
        content.push({ type: "divider" });
      }

      // Provenance
      if (selectedSections.includes("provenance") && data.provenanceHashes?.length > 0) {
        content.push({ type: "heading", text: "Data Provenance", level: 2 });
        content.push({ type: "paragraph", text: "Blockchain verification hashes for data integrity." });
        content.push({
          type: "table",
          headers: ["Hash", "Type", "Date"],
          rows: data.provenanceHashes.map((h: any) => [h.hash, h.type.replace(/_/g, " "), new Date(h.date).toLocaleDateString()]),
        });
        content.push({ type: "divider" });
      }

      // AI Insights
      if (selectedSections.includes("ai_insights") && data.aiInsights) {
        content.push({ type: "heading", text: "AI-Generated Insights", level: 2 });
        // Split markdown into paragraphs
        const lines = data.aiInsights.split("\n").filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.startsWith("###")) {
            content.push({ type: "heading", text: line.replace(/^#+\s*/, ""), level: 3 });
          } else if (line.startsWith("##")) {
            content.push({ type: "heading", text: line.replace(/^#+\s*/, ""), level: 2 });
          } else if (line.startsWith("- ") || line.startsWith("* ")) {
            content.push({ type: "paragraph", text: `• ${line.replace(/^[-*]\s*/, "")}` });
          } else {
            content.push({ type: "paragraph", text: line.replace(/\*\*/g, "") });
          }
        }
      }

      await generate({
        filename: `study-report-${new Date().toISOString().split("T")[0]}`,
        title: "Study Summary Report",
        subtitle: `${data.cohortSummary.totalShares} shares • ${data.cohortSummary.uniquePatients} patients • Generated ${new Date().toLocaleDateString()}`,
        content,
      });

      toast({ title: "Report Generated", description: "Your study summary PDF has been downloaded." });
      setOpen(false);
    } catch (err) {
      console.error("Report generation error:", err);
      toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || isGenerating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={totalShares === 0}>
          <FileBarChart className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            Study Summary Report
          </DialogTitle>
          <DialogDescription>
            Generate a professional PDF report from {totalShares} data share{totalShares !== 1 ? "s" : ""}. Select sections to include.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {SECTIONS.map((section) => (
            <Card
              key={section.id}
              className={`cursor-pointer transition-colors ${
                selectedSections.includes(section.id) ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => toggleSection(section.id)}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={selectedSections.includes(section.id)}
                  onCheckedChange={() => toggleSection(section.id)}
                />
                <section.icon className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <Label className="font-medium cursor-pointer">{section.label}</Label>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isBusy || selectedSections.length === 0}
          className="w-full"
        >
          {isBusy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {loading ? "Analyzing with AI..." : "Generating PDF..."}
            </>
          ) : (
            <>
              <FileBarChart className="h-4 w-4 mr-2" />
              Generate & Download PDF
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default StudyReportGenerator;
