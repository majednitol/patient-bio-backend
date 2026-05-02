import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useHealthMetrics, METRIC_TYPES } from "@/hooks/useHealthMetrics";

export interface HealthInsight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  content: string;
  severity: string | null;
  metric_types: string[] | null;
  data_summary: Record<string, unknown> | null;
  is_read: boolean | null;
  generated_at: string;
  expires_at: string | null;
}

export interface TrendAnalysis {
  metricType: string;
  direction: 'up' | 'down' | 'stable';
  percentageChange: number;
  averageValue: number;
  latestValue: number;
  dataPoints: number;
  isAnomaly: boolean;
  anomalyDescription?: string;
}

export const useHealthInsights = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { metrics, latestMetrics } = useHealthMetrics(undefined, 30);

  // Fetch existing insights
  const { data: insights, isLoading } = useQuery({
    queryKey: ["health-insights", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("health_insights")
        .select("*")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("generated_at", { ascending: false });

      if (error) throw error;
      return data as HealthInsight[];
    },
    enabled: !!user?.id,
  });

  // Advanced trend analysis (Phase 5.2 Enhancement)
  const analyzeTrends = (): TrendAnalysis[] => {
    if (!metrics || metrics.length === 0) return [];

    const trendsByType: Record<string, TrendAnalysis> = {};

    // Group metrics by type
    const metricsByType: Record<string, Array<{ value: number; date: Date }>> = {};
    for (const metric of metrics) {
      if (!metricsByType[metric.metric_type]) {
        metricsByType[metric.metric_type] = [];
      }
      metricsByType[metric.metric_type].push({
        value: Number(metric.value),
        date: new Date(metric.measured_at),
      });
    }

    // Analyze each metric type
    for (const [type, data] of Object.entries(metricsByType)) {
      if (data.length < 2) continue;

      // Sort by date
      data.sort((a, b) => a.date.getTime() - b.date.getTime());

      const values = data.map(d => d.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const latest = values[values.length - 1];
      const oldest = values[0];

      // Calculate percentage change
      const percentageChange = oldest !== 0 
        ? ((latest - oldest) / oldest) * 100 
        : 0;

      // Determine direction
      let direction: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(percentageChange) >= 5) {
        direction = percentageChange > 0 ? 'up' : 'down';
      }

      // Detect anomalies (values > 2 standard deviations from mean)
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length
      );
      const isAnomaly = Math.abs(latest - average) > 2 * stdDev;
      
      let anomalyDescription: string | undefined;
      if (isAnomaly) {
        const metricDef = METRIC_TYPES.find(m => m.type === type);
        const metricName = metricDef?.label || type.replace(/_/g, ' ');
        anomalyDescription = `Your recent ${metricName} reading of ${latest.toFixed(1)} is ${
          latest > average ? 'significantly higher' : 'significantly lower'
        } than your average of ${average.toFixed(1)}`;
      }

      trendsByType[type] = {
        metricType: type,
        direction,
        percentageChange,
        averageValue: average,
        latestValue: latest,
        dataPoints: data.length,
        isAnomaly,
        anomalyDescription,
      };
    }

    return Object.values(trendsByType);
  };

  // Get anomalies from trend analysis
  const getAnomalies = (): TrendAnalysis[] => {
    return analyzeTrends().filter(t => t.isAnomaly);
  };

  // Generate new insights using AI
  const generateInsights = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!metrics || metrics.length === 0) {
        throw new Error("No health metrics available to analyze");
      }

      // Prepare metrics summary for AI
      const metricsSummary: Record<string, { values: number[]; unit: string; latest: number }> = {};
      
      for (const metric of metrics) {
        if (!metricsSummary[metric.metric_type]) {
          const metricDef = METRIC_TYPES.find(m => m.type === metric.metric_type);
          metricsSummary[metric.metric_type] = {
            values: [],
            unit: metricDef?.unit || metric.unit,
            latest: 0,
          };
        }
        metricsSummary[metric.metric_type].values.push(Number(metric.value));
      }

      // Calculate stats
      for (const [type, data] of Object.entries(metricsSummary)) {
        data.latest = data.values[data.values.length - 1];
      }

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke("generate-health-insights", {
        body: {
          metrics_summary: metricsSummary,
          user_id: user.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-insights"] });
      toast({
        title: "Success",
        description: "Health insights generated!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate insights: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Mark insight as read
  const markAsRead = useMutation({
    mutationFn: async (insightId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("health_insights")
        .update({ is_read: true })
        .eq("id", insightId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-insights"] });
    },
  });

  // Delete insight
  const deleteInsight = useMutation({
    mutationFn: async (insightId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("health_insights")
        .delete()
        .eq("id", insightId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-insights"] });
      toast({
        title: "Success",
        description: "Insight dismissed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to dismiss insight: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Get severity color
  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "positive":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  // Get unread count
  const unreadCount = insights?.filter(i => !i.is_read).length || 0;

  // Get trends
  const trends = analyzeTrends();
  const anomalies = getAnomalies();

  return {
    insights: insights || [],
    isLoading,
    generateInsights,
    isGenerating: generateInsights.isPending,
    markAsRead,
    deleteInsight,
    getSeverityColor,
    unreadCount,
    hasMetrics: metrics.length > 0,
    // Phase 5.2 Enhanced trend analysis
    trends,
    anomalies,
    analyzeTrends,
    getAnomalies,
  };
};
