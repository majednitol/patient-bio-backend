import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Loader2, RefreshCw, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { pdfSafe } from "@/utils/pdfSafe";

export const ScheduledReportConfig = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["researcher-scheduled-reports", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("researcher_scheduled_reports")
        .select("id, researcher_id, report_type, frequency, filters, is_active, last_generated_at, next_run_at, created_at")
        .eq("researcher_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: !!user?.id,
  });

  const createSchedule = useMutation({
    mutationFn: async (frequency: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("researcher_scheduled_reports").insert({
        researcher_id: user.id,
        frequency,
        report_config: { includeSections: ["summary", "disease", "activity"] },
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Schedule Created" });
      queryClient.invalidateQueries({ queryKey: ["researcher-scheduled-reports"] });
    },
  });

  const toggleSchedule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("researcher_scheduled_reports")
        .update({ is_active: isActive } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["researcher-scheduled-reports"] });
    },
  });

  const generateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-research-report", {
        body: { reportConfig: { includeSections: ["summary", "disease", "activity"] } },
      });
      if (error) throw error;

      const report = data.report;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Research Report", 20, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 20, 30);
      doc.text(`Researcher: ${pdfSafe(report.researcher)}`, 20, 37);

      doc.setFontSize(14);
      doc.text("Summary", 20, 50);
      doc.setFontSize(10);
      let y = 58;
      Object.entries(report.summary).forEach(([k, v]) => {
        doc.text(`${pdfSafe(k.replace(/([A-Z])/g, " $1").trim())}: ${pdfSafe(String(v))}`, 25, y);
        y += 7;
      });

      y += 5;
      doc.setFontSize(14);
      doc.text("Disease Breakdown", 20, y);
      y += 8;
      doc.setFontSize(10);
      Object.entries(report.diseaseBreakdown).forEach(([k, v]) => {
        doc.text(`${pdfSafe(k)}: ${pdfSafe(String(v))}`, 25, y);
        y += 7;
      });

      doc.save("research-report.pdf");
      toast({ title: "Report Generated", description: "PDF downloaded successfully." });
    } catch (err) {
      console.error("Report error:", err);
      toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Scheduled Reports
        </CardTitle>
        <CardDescription>Configure automated research summaries</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={generateNow} disabled={generating} variant="outline">
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Generate Report Now
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-4"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {schedules.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No scheduled reports. Create one:</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => createSchedule.mutate("weekly")}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Weekly
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => createSchedule.mutate("monthly")}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Monthly
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{s.frequency}</Badge>
                        <Badge variant={s.is_active ? "default" : "outline"}>
                          {s.is_active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      {s.last_generated_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last generated: {new Date(s.last_generated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Switch checked={s.is_active} onCheckedChange={(checked) => toggleSchedule.mutate({ id: s.id, isActive: checked })} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
