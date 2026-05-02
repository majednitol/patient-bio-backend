import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, BarChart3, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useResearcherSavedCharts, SavedChart } from "@/hooks/useResearcherSavedCharts";

interface SavedChartsGalleryProps {
  charts?: any[]; // legacy prop, ignored
  onDelete?: (id: string) => void; // legacy prop, ignored
}

export const SavedChartsGallery = (_props: SavedChartsGalleryProps) => {
  const { t } = useTranslation();
  const { charts, isLoading, deleteChart } = useResearcherSavedCharts();

  const CHART_TYPE_LABELS: Record<string, string> = {
    bar: t("chartConfig.barChart"),
    pie: t("chartConfig.pieChart"),
    line: t("chartConfig.lineChart"),
    scatter: t("chartConfig.scatterPlot"),
    correlation: "Correlation",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">{t("savedCharts.noSavedCharts")}</h3>
          <p className="text-muted-foreground max-w-md">{t("savedCharts.noSavedChartsDesc")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {charts.map((chart) => (
        <Card key={chart.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base line-clamp-2">{chart.name}</CardTitle>
                <CardDescription className="text-xs mt-1">
                  {formatDistanceToNow(new Date(chart.createdAt), { addSuffix: true })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Badge variant="secondary" className="text-xs">
                {CHART_TYPE_LABELS[chart.type] || chart.type}
              </Badge>
              {chart.config?.xAxis && (
                <p className="text-xs text-muted-foreground">
                  X: {String(chart.config.xAxis).replace(/_/g, " ")}
                </p>
              )}
              {chart.config?.variable1 && (
                <p className="text-xs text-muted-foreground">
                  Var 1: {String(chart.config.variable1).replace(/_/g, " ")}
                </p>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => deleteChart.mutate(chart.id)}
              disabled={deleteChart.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("common.delete")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
