import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkline } from "@/components/ui/Sparkline";
import { useResearcherStudies, useStudyMilestones } from "@/hooks/useResearcherStudies";
import { useRechartsComponents, ChartSkeleton } from "@/components/shared/LazyChart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp, Users, Target, Calendar, FlaskConical, BarChart3,
  CheckCircle2, Clock, AlertTriangle, FileText, Loader2,
} from "lucide-react";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const STATUS_ORDER = ["draft", "recruiting", "active", "analysis", "completed", "archived"];

/** Aggregate milestone progress for a single study (inline, no hook call needed at top level) */
const StudyProgressRow = ({ studyId, title, status }: { studyId: string; title: string; status: string }) => {
  const { progress, completedCount, totalCount } = useStudyMilestones(studyId);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium truncate flex-1 min-w-0">{title}</span>
      <Badge variant="outline" className="text-xs capitalize shrink-0">{status}</Badge>
      <div className="w-28 shrink-0">
        <Progress value={progress} className="h-2" />
      </div>
      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
        {completedCount}/{totalCount}
      </span>
    </div>
  );
};

const CrossStudyAnalyticsPage = () => {
  const { user } = useAuth();
  const { studies, isLoading: studiesLoading } = useResearcherStudies();
  const { components: recharts, isLoading: chartsLoading } = useRechartsComponents();

  // Fetch study notes for publication pipeline
  const { data: studyNotes = [] } = useQuery({
    queryKey: ["cross-study-notes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("researcher_study_notes")
        .select("id, publication_status, created_at, updated_at")
        .eq("researcher_id", user.id);
      return (data || []) as Array<{ id: string; publication_status: string | null; created_at: string; updated_at: string }>;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all milestones for the researcher's studies (aggregate)
  const studyIds = useMemo(() => studies.map((s) => s.id), [studies]);
  const { data: allMilestones = [] } = useQuery({
    queryKey: ["cross-study-milestones", studyIds],
    queryFn: async () => {
      if (studyIds.length === 0) return [];
      const { data } = await supabase
        .from("researcher_study_milestones")
        .select("id, study_id, status, due_date, completed_at")
        .in("study_id", studyIds);
      return (data || []) as Array<{ id: string; study_id: string; status: string; due_date: string | null; completed_at: string | null }>;
    },
    enabled: studyIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // ---- Computed Analytics ----
  const analytics = useMemo(() => {
    const activeStudies = studies.filter((s) => !["completed", "archived"].includes(s.status));
    const completedStudies = studies.filter((s) => s.status === "completed");

    // Recruitment
    const totalTarget = studies.reduce((sum, s) => sum + (s.target_sample_size || 0), 0);
    const totalRecruited = studies.reduce((sum, s) => sum + (s.current_sample_size || 0), 0);
    const recruitmentRate = totalTarget > 0 ? Math.round((totalRecruited / totalTarget) * 100) : 0;

    // Recruitment sparkline (per study)
    const recruitmentByStudy = studies
      .filter((s) => s.target_sample_size && s.target_sample_size > 0)
      .map((s) => Math.round(((s.current_sample_size || 0) / s.target_sample_size!) * 100));

    // Status distribution
    const statusDist = STATUS_ORDER.map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: studies.filter((s) => s.status === status).length,
    })).filter((d) => d.value > 0);

    // Study type distribution
    const typeDist: Record<string, number> = {};
    studies.forEach((s) => {
      const type = s.study_type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
      typeDist[type] = (typeDist[type] || 0) + 1;
    });
    const typeData = Object.entries(typeDist).map(([name, value]) => ({ name, value }));

    // Milestone health
    const totalMilestones = allMilestones.length;
    const completedMilestones = allMilestones.filter((m) => m.status === "completed").length;
    const overdueMilestones = allMilestones.filter(
      (m) => m.status !== "completed" && m.due_date && new Date(m.due_date) < new Date()
    ).length;
    const milestoneCompletionRate = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    // Data completeness (studies with description, disease categories, target sample size)
    const completenessScores = studies.map((s) => {
      let score = 0;
      let total = 4;
      if (s.description) score++;
      if (s.disease_categories?.length) score++;
      if (s.target_sample_size) score++;
      if (s.consent_scopes?.length) score++;
      return { name: s.title, completeness: Math.round((score / total) * 100) };
    });
    const avgCompleteness = completenessScores.length > 0
      ? Math.round(completenessScores.reduce((sum, c) => sum + c.completeness, 0) / completenessScores.length)
      : 0;

    // Publication pipeline
    const pubStatuses = ["draft", "submitted", "under_review", "accepted", "published"];
    const pubPipeline = pubStatuses.map((status) => ({
      name: status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      value: studyNotes.filter((n) => (n.publication_status || "draft") === status).length,
    }));

    // Timeline: studies created per month
    const monthCounts: Record<string, number> = {};
    studies.forEach((s) => {
      const month = s.created_at.slice(0, 7); // YYYY-MM
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    const timelineData = Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        name: new Date(month + "-01").toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        studies: count,
      }));

    return {
      totalStudies: studies.length,
      activeStudies: activeStudies.length,
      completedStudies: completedStudies.length,
      totalTarget,
      totalRecruited,
      recruitmentRate,
      recruitmentByStudy,
      statusDist,
      typeData,
      totalMilestones,
      completedMilestones,
      overdueMilestones,
      milestoneCompletionRate,
      avgCompleteness,
      completenessScores,
      pubPipeline,
      timelineData,
    };
  }, [studies, allMilestones, studyNotes]);

  if (studiesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeStudyList = studies.filter((s) => !["completed", "archived"].includes(s.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Cross-Study Analytics
        </h1>
        <p className="text-muted-foreground">
          Strategic overview across {analytics.totalStudies} studies
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Studies</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalStudies}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeStudies} active · {analytics.completedStudies} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Recruitment</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">{analytics.recruitmentRate}%</div>
              {analytics.recruitmentByStudy.length > 1 && (
                <Sparkline data={analytics.recruitmentByStudy} className="opacity-70" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalRecruited}/{analytics.totalTarget} patients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Milestone Health</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.milestoneCompletionRate}%</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {analytics.completedMilestones} done
              </span>
              {analytics.overdueMilestones > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {analytics.overdueMilestones} overdue
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Completeness</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgCompleteness}%</div>
            <Progress value={analytics.avgCompleteness} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      {studies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <TrendingUp className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No studies yet</h3>
            <p className="text-muted-foreground text-sm">Create studies to see cross-study analytics</p>
          </CardContent>
        </Card>
      ) : chartsLoading || !recharts ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardHeader><CardTitle>Study Pipeline</CardTitle></CardHeader><CardContent><ChartSkeleton height={280} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Study Types</CardTitle></CardHeader><CardContent><ChartSkeleton height={280} /></CardContent></Card>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Study Pipeline Status */}
            <Card>
              <CardHeader>
                <CardTitle>Study Pipeline</CardTitle>
                <CardDescription>Distribution across workflow stages</CardDescription>
              </CardHeader>
              <CardContent>
                <recharts.ResponsiveContainer width="100%" height={280}>
                  <recharts.BarChart data={analytics.statusDist} layout="vertical">
                    <recharts.CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <recharts.XAxis type="number" allowDecimals={false} />
                    <recharts.YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <recharts.Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <recharts.Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </recharts.BarChart>
                </recharts.ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Study Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Study Types</CardTitle>
                <CardDescription>Breakdown by methodology</CardDescription>
              </CardHeader>
              <CardContent>
                <recharts.ResponsiveContainer width="100%" height={280}>
                  <recharts.PieChart>
                    <recharts.Pie
                      data={analytics.typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.typeData.map((_, i) => (
                        <recharts.Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </recharts.Pie>
                    <recharts.Tooltip />
                  </recharts.PieChart>
                </recharts.ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Study Creation Timeline */}
            {analytics.timelineData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Study Creation Trend</CardTitle>
                  <CardDescription>New studies over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <recharts.ResponsiveContainer width="100%" height={280}>
                    <recharts.AreaChart data={analytics.timelineData}>
                      <recharts.CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <recharts.XAxis dataKey="name" className="text-xs" />
                      <recharts.YAxis allowDecimals={false} />
                      <recharts.Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <recharts.Area
                        type="monotone"
                        dataKey="studies"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </recharts.AreaChart>
                  </recharts.ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Publication Pipeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Publication Pipeline
                </CardTitle>
                <CardDescription>Research notes across publication stages</CardDescription>
              </CardHeader>
              <CardContent>
                <recharts.ResponsiveContainer width="100%" height={280}>
                  <recharts.BarChart data={analytics.pubPipeline}>
                    <recharts.CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <recharts.XAxis dataKey="name" className="text-xs" />
                    <recharts.YAxis allowDecimals={false} />
                    <recharts.Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <recharts.Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {analytics.pubPipeline.map((_, i) => (
                        <recharts.Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </recharts.Bar>
                  </recharts.BarChart>
                </recharts.ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Per-Study Milestone Progress */}
          {activeStudyList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Active Study Progress
                </CardTitle>
                <CardDescription>Milestone completion across active studies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeStudyList.map((study) => (
                  <StudyProgressRow
                    key={study.id}
                    studyId={study.id}
                    title={study.title}
                    status={study.status}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CrossStudyAnalyticsPage;
