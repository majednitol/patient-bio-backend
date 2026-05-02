import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Star, UserCheck, CalendarPlus, Sparkles } from "lucide-react";
import type { RecommendedDoctor } from "@/hooks/useSymptomTriageRecommend";

interface RecommendedDoctorCardProps {
  doctor: RecommendedDoctor;
  rank: number;
  nextSlot?: { date: string; time: string } | null;
  onBook: (doctorId: string) => void;
}

export function RecommendedDoctorCard({ doctor, rank, nextSlot, onBook }: RecommendedDoctorCardProps) {
  const { t } = useTranslation();

  const scoreColor = doctor.match_score >= 80 ? "text-green-600" : doctor.match_score >= 60 ? "text-primary" : "text-orange-500";
  const progressColor = doctor.match_score >= 80 ? "bg-green-600" : doctor.match_score >= 60 ? "bg-primary" : "bg-orange-500";

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      rank === 1 && "border-primary/40 ring-1 ring-primary/20"
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {rank <= 3 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  #{rank}
                </Badge>
              )}
              <h4 className="text-sm sm:text-base font-semibold truncate">{doctor.full_name}</h4>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">{doctor.specialty}</p>
            {doctor.qualification && (
              <p className="text-[11px] text-muted-foreground">{doctor.qualification}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={cn("text-lg font-bold", scoreColor)}>{doctor.match_score}%</p>
            <p className="text-[10px] text-muted-foreground">{t("triageEngine.matchScore", "Match")}</p>
          </div>
        </div>

        {/* Match score bar */}
        <div className="mt-2">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", progressColor)}
              style={{ width: `${doctor.match_score}%` }}
            />
          </div>
        </div>

        {/* Why this doctor */}
        <p className="text-xs text-muted-foreground mt-2 italic">
          "{doctor.match_reasoning}"
        </p>

        {/* Tags row */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {doctor.is_connected && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
              <UserCheck className="h-2.5 w-2.5" />
              {t("triageEngine.connected", "Connected")}
            </Badge>
          )}
          {doctor.diseases_treated?.slice(0, 2).map((d, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
              {d}
            </Badge>
          ))}
          {nextSlot && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-green-600">
              <CalendarPlus className="h-2.5 w-2.5" />
              {nextSlot.date}
            </Badge>
          )}
        </div>

        {/* Book button */}
        <Button
          size="sm"
          className="w-full mt-3 text-xs h-8"
          onClick={() => onBook(doctor.doctor_id)}
        >
          <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
          {t("triageEngine.bookNow", "Book Appointment")}
        </Button>
      </CardContent>
    </Card>
  );
}
