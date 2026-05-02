import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useHealthScore, MetricStatus } from "@/hooks/useHealthScore";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, useSpring, useTransform } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Loader2,
  Target,
  BarChart3,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Tip {
  title: string;
  description: string;
  estimatedImpact: number;
  targetCategory: string;
}

const CATEGORY_INFO: Record<string, { label: string; description: string; max: number; icon: React.ReactNode }> = {
  coverage: {
    label: "Metric Coverage",
    description: "How many of the 10 health metric types you're actively tracking.",
    max: 25,
    icon: <Target className="h-4 w-4" />,
  },
  inRange: {
    label: "In Normal Range",
    description: "Percentage of your recent readings that fall within healthy ranges.",
    max: 35,
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  trend: {
    label: "Trend Direction",
    description: "Whether your metrics are improving or moving toward optimal values.",
    max: 25,
    icon: <BarChart3 className="h-4 w-4" />,
  },
  consistency: {
    label: "Tracking Consistency",
    description: "How regularly you log health data — daily tracking earns the most points.",
    max: 15,
    icon: <Activity className="h-4 w-4" />,
  },
};

const statusConfig = {
  good: { color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> },
  warning: { color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" /> },
  critical: { color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", icon: <XCircle className="h-3.5 w-3.5 text-red-600" /> },
  untracked: { color: "text-muted-foreground", bg: "bg-muted/50", icon: <Minus className="h-3.5 w-3.5 text-muted-foreground" /> },
};

const HealthScoreDetailPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { score, breakdown, label, color, trackedTypes, totalTypes, metricStatuses, untrackedTypes } = useHealthScore();
  const { snapshots, scoreChange, saveSnapshot, shouldSaveSnapshot } = useScoreHistory();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  // Save weekly snapshot
  useEffect(() => {
    if (score > 0 && shouldSaveSnapshot()) {
      saveSnapshot({ score, breakdown, trackedTypes });
    }
  }, [score]);

  // Gauge animation
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const springProgress = useSpring(0, { stiffness: 50, damping: 18 });
  React.useEffect(() => {
    springProgress.set((score / 100) * circumference);
  }, [score, circumference, springProgress]);
  const animatedOffset = useTransform(springProgress, (v) => circumference - v);

  const springScore = useSpring(0, { stiffness: 50, damping: 18 });
  React.useEffect(() => { springScore.set(score); }, [score, springScore]);
  const displayScore = useTransform(springScore, (v) => Math.round(v));
  const scoreRef = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const unsub = displayScore.on("change", (v) => {
      if (scoreRef.current) scoreRef.current.textContent = String(v);
    });
    return unsub;
  }, [displayScore]);

  const strokeColor = score >= 80
    ? "url(#gaugeGradientGreen)"
    : score >= 60
    ? "url(#gaugeGradientBlue)"
    : score >= 40
    ? "url(#gaugeGradientYellow)"
    : "url(#gaugeGradientRed)";

  const fetchTips = async () => {
    setLoadingTips(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke("generate-score-tips", {
        body: {
          breakdown,
          trackedTypes: metricStatuses.filter((m) => m.status !== "untracked").map((m) => m.type),
          untrackedTypes,
          totalScore: score,
        },
      });
      if (error) throw error;
      setTips(data?.tips || []);
    } catch (err) {
      console.error("Failed to fetch tips:", err);
    } finally {
      setLoadingTips(false);
    }
  };

  const chartData = snapshots.map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: s.score,
  }));

  const trackedMetrics = metricStatuses.filter((m) => m.status !== "untracked");
  const untrackedMetrics = metricStatuses.filter((m) => m.status === "untracked");

  return (
    <div className="space-y-6 pb-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> {t("common.back", "Back")}
      </Button>

      {/* Hero: Large Gauge + Score Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            {/* Gauge */}
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <defs>
                  <linearGradient id="gaugeGradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(142 76% 36%)" />
                    <stop offset="100%" stopColor="hsl(160 60% 45%)" />
                  </linearGradient>
                  <linearGradient id="gaugeGradientBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" />
                    <stop offset="100%" stopColor="hsl(199 89% 48%)" />
                  </linearGradient>
                  <linearGradient id="gaugeGradientYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(45 93% 47%)" />
                    <stop offset="100%" stopColor="hsl(36 100% 50%)" />
                  </linearGradient>
                  <linearGradient id="gaugeGradientRed" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(0 72% 51%)" />
                    <stop offset="100%" stopColor="hsl(15 75% 55%)" />
                  </linearGradient>
                  <filter id="gaugeGlow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
                <motion.circle
                  cx={size / 2} cy={size / 2} r={radius} fill="none"
                  stroke={strokeColor} strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  style={{ strokeDashoffset: animatedOffset }}
                  strokeLinecap="round"
                  filter="url(#gaugeGlow)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span ref={scoreRef} className="text-4xl font-bold">{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className={`text-lg font-semibold ${color}`}>{label}</span>
                {scoreChange !== null && scoreChange !== 0 && (
                  <Badge variant={scoreChange > 0 ? "default" : "destructive"} className="text-xs gap-0.5">
                    {scoreChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {scoreChange > 0 ? "+" : ""}{scoreChange} pts
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Tracking {trackedTypes} of {totalTypes} metrics
              </p>
            </div>

            {/* Category badges */}
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                const val = breakdown[key as keyof typeof breakdown];
                const pct = Math.round((val / info.max) * 100);
                const badgeColor = pct >= 70 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : pct >= 40 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
                return (
                  <span key={key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                    {info.icon} {info.label}: {val}/{info.max}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(CATEGORY_INFO).map(([key, info], i) => {
          const val = breakdown[key as keyof typeof breakdown];
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">{info.icon}</div>
                    <div>
                      <h4 className="font-medium text-sm">{info.label}</h4>
                      <p className="text-xs text-muted-foreground">{val} / {info.max} pts</p>
                    </div>
                  </div>
                  <Progress value={val} max={info.max} className="h-2" />
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Score history chart */}
      {chartData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Score History</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Per-metric status grid */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Metric Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trackedMetrics.map((m) => {
                const cfg = statusConfig[m.status];
                return (
                  <div key={m.type} className={`flex items-center gap-3 p-3 rounded-lg ${cfg.bg}`}>
                    <span className="text-lg">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.latestValue !== null ? `${m.latestValue} ${m.unit}` : "—"} · Range: {m.normalRange.min}–{m.normalRange.max}
                      </p>
                    </div>
                    {cfg.icon}
                  </div>
                );
              })}
            </div>

            {/* Untracked section */}
            {untrackedMetrics.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Not yet tracked ({untrackedMetrics.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {untrackedMetrics.map((m) => (
                    <Button
                      key={m.type}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => navigate("/dashboard/health-data")}
                    >
                      <Plus className="h-3 w-3" /> {m.icon} {m.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Tips */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> AI Improvement Tips
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchTips} disabled={loadingTips} className="text-xs">
              {loadingTips ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Get Tips"}
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {tips.length === 0 && !loadingTips && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Click "Get Tips" for personalized recommendations to boost your score.
              </p>
            )}
            {tips.length > 0 && (
              <div className="space-y-3">
                {tips.map((tip, i) => (
                  <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{tip.title}</h4>
                      <Badge variant="secondary" className="text-[10px]">
                        +{tip.estimatedImpact} pts
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tip.description}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {CATEGORY_INFO[tip.targetCategory]?.label || tip.targetCategory}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default HealthScoreDetailPage;
