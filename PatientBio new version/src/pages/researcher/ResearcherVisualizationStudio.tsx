import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Download, Users } from "lucide-react";
import { ChartConfigPanel } from "@/components/researcher/visualization/ChartConfigPanel";
import { CorrelationAnalysis } from "@/components/researcher/visualization/CorrelationAnalysis";
import { StatisticalSummary } from "@/components/researcher/visualization/StatisticalSummary";
import { SavedChartsGallery } from "@/components/researcher/visualization/SavedChartsGallery";
import { BiomarkerTrendAnalyzer } from "@/components/researcher/visualization/BiomarkerTrendAnalyzer";
import { useResearcherSavedCharts } from "@/hooks/useResearcherSavedCharts";
import { toast } from "@/hooks/use-toast";

interface PatientData {
  user_id: string;
  gender?: string;
  date_of_birth?: string;
  blood_group?: string;
  allergies?: string;
  chronic_diseases?: string;
  medications?: string;
}

const ResearcherVisualizationStudio = () => {
  const { user } = useAuth();
  const { researcherShares, isLoading: sharesLoading } = usePatientResearcherShares();
  const [activeTab, setActiveTab] = useState("builder");
  const { charts, saveChart } = useResearcherSavedCharts();

  const { data: patientData = [], isLoading: dataLoading } = useQuery({
    queryKey: ["visualization-patient-data", user?.id, researcherShares.length],
    queryFn: async () => {
      if (!user?.id || researcherShares.length === 0) return [];
      const patientIds = [
        ...new Set(
          researcherShares.filter((s) => !s.is_anonymized).map((s) => s.patient_id)
        ),
      ];
      if (patientIds.length === 0) return [];
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, gender, date_of_birth")
        .in("user_id", patientIds.slice(0, 1000));
      return (data || []) as PatientData[];
    },
    enabled: !!user?.id && researcherShares.length > 0,
  });

  const handleSaveChart = (chart: { name: string; type: string; config: Record<string, any> }) => {
    saveChart.mutate(chart);
  };

  const isLoading = sharesLoading || dataLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Visualization Studio</h1>
        <p className="text-muted-foreground mt-2">
          Build custom charts, analyze correlations, and explore statistical patterns in your cohort data.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading cohort data...</p>
          </div>
        </div>
      ) : researcherShares.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              No patient data available. Build a cohort first to use the visualization studio.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />Total Patients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{researcherShares.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />Analyzable Records
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patientData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />Saved Charts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{charts.length}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="builder">Chart Builder</TabsTrigger>
              <TabsTrigger value="biomarkers">Biomarkers</TabsTrigger>
              <TabsTrigger value="correlation">Correlation</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="gallery">Saved Charts</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="space-y-4">
              <ChartConfigPanel shares={researcherShares} patientData={patientData} onSaveChart={handleSaveChart} />
            </TabsContent>
            <TabsContent value="biomarkers" className="space-y-4">
              <BiomarkerTrendAnalyzer patientData={patientData} shares={researcherShares} />
            </TabsContent>
            <TabsContent value="correlation" className="space-y-4">
              <CorrelationAnalysis patientData={patientData} onSaveChart={handleSaveChart} />
            </TabsContent>
            <TabsContent value="statistics" className="space-y-4">
              <StatisticalSummary patientData={patientData} shares={researcherShares} />
            </TabsContent>
            <TabsContent value="gallery" className="space-y-4">
              <SavedChartsGallery />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default ResearcherVisualizationStudio;
