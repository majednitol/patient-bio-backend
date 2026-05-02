import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useHealthScore } from "@/hooks/useHealthScore";
import { useScoreHistory } from "@/hooks/useScoreHistory";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { motion, useSpring, useTransform } from "framer-motion";

interface HealthScoreGaugeProps {
  className?: string;
  compact?: boolean;
}

export const HealthScoreGauge = React.memo(({ className, compact = false }: HealthScoreGaugeProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { score, breakdown, label, color, trackedTypes, totalTypes } = useHealthScore();
  const { scoreChange, saveSnapshot, shouldSaveSnapshot } = useScoreHistory();

  // Auto-save weekly snapshot
  useEffect(() => {
    if (score > 0 && shouldSaveSnapshot()) {
      saveSnapshot({ score, breakdown, trackedTypes });
    }
  }, [score]);

  // SVG circular gauge
  const size = compact ? 64 : 96;
  const strokeWidth = compact ? 5 : 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate the progress with a spring
  const springProgress = useSpring(0, { stiffness: 60, damping: 20 });
  React.useEffect(() => {
    springProgress.set((score / 100) * circumference);
  }, [score, circumference, springProgress]);
  const animatedOffset = useTransform(springProgress, (v) => circumference - v);

  // Animate the score number
  const springScore = useSpring(0, { stiffness: 60, damping: 20 });
  React.useEffect(() => {
    springScore.set(score);
  }, [score, springScore]);
  const displayScore = useTransform(springScore, (v) => Math.round(v));
  const scoreRef = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const unsub = displayScore.on("change", (v) => {
      if (scoreRef.current) scoreRef.current.textContent = String(v);
    });
    return unsub;
  }, [displayScore]);

  const gradientId = compact ? "gaugeGradC" : "gaugeGrad";
  const glowId = compact ? "glowC" : "glow";

  const breakdownItems = [
    { label: t("healthScore.metricCoverage"), value: breakdown.coverage, max: 25 },
    { label: t("healthScore.inNormalRange"), value: breakdown.inRange, max: 35 },
    { label: t("healthScore.trendDirection"), value: breakdown.trend, max: 25 },
    { label: t("healthScore.consistency"), value: breakdown.consistency, max: 15 },
  ];

  const gauge = (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {score >= 80 ? (
              <><stop offset="0%" stopColor="hsl(142 76% 36%)" /><stop offset="100%" stopColor="hsl(160 60% 45%)" /></>
            ) : score >= 60 ? (
              <><stop offset="0%" stopColor="hsl(217 91% 60%)" /><stop offset="100%" stopColor="hsl(199 89% 48%)" /></>
            ) : score >= 40 ? (
              <><stop offset="0%" stopColor="hsl(45 93% 47%)" /><stop offset="100%" stopColor="hsl(36 100% 50%)" /></>
            ) : (
              <><stop offset="0%" stopColor="hsl(0 72% 51%)" /><stop offset="100%" stopColor="hsl(15 75% 55%)" /></>
            )}
          </linearGradient>
          {!compact && (
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: animatedOffset }}
          strokeLinecap="round"
          filter={compact ? undefined : `url(#${glowId})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span ref={scoreRef} className={`font-bold ${compact ? "text-sm" : "text-xl"}`}>{score}</span>
        {!compact && <span className="text-[10px] text-muted-foreground">/ 100</span>}
      </div>
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 cursor-pointer ${className}`} onClick={() => navigate("/dashboard/health-score")}>
              {gauge}
              <div>
                <p className={`text-xs font-medium ${color}`}>{label}</p>
                <p className="text-[10px] text-muted-foreground">{t("healthScore.metricsTracked", { tracked: trackedTypes, total: totalTypes })}</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-52">
            <p className="font-semibold mb-2">{t("healthScore.healthScoreBreakdown")}</p>
            {breakdownItems.map((item) => (
              <div key={item.label} className="flex justify-between text-xs mb-1">
                <span>{item.label}</span>
                <span className="font-medium">{item.value}/{item.max}</span>
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={`cursor-pointer transition-shadow hover:shadow-md dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${className}`} onClick={() => navigate("/dashboard/health-score")}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xs sm:text-sm">{t("healthScore.healthScore")}</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">{t("healthScore.metricsTracked", { tracked: trackedTypes, total: totalTypes })}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{gauge}</TooltipTrigger>
              <TooltipContent side="left" className="w-56">
                <p className="font-semibold mb-2">{t("healthScore.scoreBreakdown")}</p>
                {breakdownItems.map((item) => (
                  <div key={item.label} className="mb-1.5">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.value}/{item.max}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: `${(item.value / item.max) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center justify-between mt-2 sm:mt-3">
          <div className="flex items-center gap-2">
            <p className={`text-xs sm:text-sm font-medium ${color}`}>{label}</p>
            {scoreChange !== null && scoreChange !== 0 && (
              <Badge variant={scoreChange > 0 ? "default" : "destructive"} className="text-[10px] gap-0.5 px-1.5 py-0">
                {scoreChange > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {scoreChange > 0 ? "+" : ""}{scoreChange}
              </Badge>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
});
