import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMedicationStreaks, STREAK_MILESTONES } from "@/hooks/useMedicationStreaks";
import { Flame, Trophy, Target, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

export const MedicationStreakCard = () => {
  const { t } = useTranslation();
  const { streak, isLoading, recalculateStreak, getNextMilestone, getAchievedMilestones } =
    useMedicationStreaks();

  useEffect(() => {
    recalculateStreak.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return null;

  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalPerfect = streak?.total_perfect_days || 0;
  const nextMilestone = getNextMilestone();
  const achieved = getAchievedMilestones();
  const progressToNext = nextMilestone
    ? Math.min(100, Math.round((currentStreak / nextMilestone.days) * 100))
    : 100;

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="p-1.5 sm:p-2 bg-orange-500/10 rounded-lg shrink-0">
              <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            </div>
            <CardTitle className="text-sm sm:text-lg leading-tight">{t("medications.streakTitle")}</CardTitle>
          </div>
          {currentStreak > 0 && (
            <Badge variant="secondary" className="text-xs sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1 font-bold shrink-0">
              🔥 {currentStreak} {currentStreak !== 1 ? t("common.date") : t("common.date")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="bg-muted/30 rounded-lg p-1.5 sm:p-2">
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:mb-1 text-orange-500" />
            <p className="text-sm sm:text-lg font-bold"><AnimatedCounter value={currentStreak} /></p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t("medications.currentStreak")}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-1.5 sm:p-2">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:mb-1 text-yellow-500" />
            <p className="text-sm sm:text-lg font-bold"><AnimatedCounter value={longestStreak} /></p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t("medications.bestStreak")}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-1.5 sm:p-2">
            <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-auto mb-0.5 sm:mb-1 text-primary" />
            <p className="text-sm sm:text-lg font-bold"><AnimatedCounter value={totalPerfect} /></p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{t("medications.perfectDays")}</p>
          </div>
        </div>

        {nextMilestone && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-3 w-3" />
                {t("medications.nextMilestone", { emoji: nextMilestone.emoji, label: nextMilestone.label })}
              </span>
              <span className="text-muted-foreground">
                {t("medications.daysProgress", { current: currentStreak, total: nextMilestone.days })}
              </span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        {achieved.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">{t("medications.badgesEarned")}</p>
            <TooltipProvider>
              <div className="flex flex-wrap gap-1.5">
                {achieved.map((m) => (
                  <Tooltip key={m.days}>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {m.emoji} {m.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{t("medications.streakAchieved", { days: m.days })}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}

        {currentStreak === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {t("medications.startStreakPrompt")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};