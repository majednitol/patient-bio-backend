import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDoctorName } from "@/utils/formatDoctorName";
import { ArrowRight, TrendingUp, Clock, Building2, GraduationCap, Briefcase, DollarSign, ChevronDown, Info, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parse, isToday, isTomorrow } from "date-fns";
import type { BookableDoctor } from "@/hooks/useBookableDoctors";
import type { MatchResult, DiseaseMatch } from "./smartMatchUtils";
import type { DoctorRatingStats } from "@/hooks/useDoctorRatings";
import { DoctorRatingDisplay } from "./DoctorRatingDisplay";

interface MatchResultCardProps {
  match: MatchResult;
  doctor: BookableDoctor;
  nextSlot?: { date: string; time: string } | null;
  onSelect: (doctor: BookableDoctor) => void;
  compareMode?: boolean;
  isCompared?: boolean;
  onToggleCompare?: (doctorId: string) => void;
  ratingStats?: DoctorRatingStats;
}

function getConfidenceLabel(score: number, maxScore: number) {
  const pct = (score / maxScore) * 100;
  if (pct >= 70) return { label: "Strong match", color: "text-green-600 dark:text-green-400" };
  if (pct >= 40) return { label: "Good match", color: "text-primary" };
  return { label: "Possible match", color: "text-muted-foreground" };
}

function formatNextSlot(slot: { date: string; time: string }): string {
  const date = parse(slot.date, "yyyy-MM-dd", new Date());
  const time = parse(slot.time, "HH:mm:ss", new Date());
  const timeStr = format(time, "h:mm a");

  if (isToday(date)) return `Today ${timeStr}`;
  if (isTomorrow(date)) return `Tomorrow ${timeStr}`;
  return `${format(date, "EEE, MMM d")} ${timeStr}`;
}

export function MatchResultCard({ match, doctor, nextSlot, onSelect, compareMode, isCompared, onToggleCompare, ratingStats }: MatchResultCardProps) {
  const confidence = getConfidenceLabel(match.score, match.maxScore);
  const pct = Math.min(Math.round((match.score / match.maxScore) * 100), 100);
  const initials = doctor.full_name.split(" ").map(n => n[0]).join("").slice(0, 2);
  const [explainOpen, setExplainOpen] = useState(false);

  return (
    <div className="relative">
      {/* Compare checkbox */}
      {compareMode && onToggleCompare && (
        <label className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isCompared}
            onChange={() => onToggleCompare(doctor.id)}
            className="h-3.5 w-3.5 rounded border-muted-foreground/40"
          />
          Compare
        </label>
      )}

      <button
        type="button"
        onClick={() => onSelect(doctor)}
        className={cn(
          "flex items-start gap-3 w-full p-3 rounded-xl border bg-background hover:bg-primary/5 transition-all text-left group",
          isCompared ? "border-primary ring-1 ring-primary/30" : "border-primary/20 hover:border-primary/50"
        )}
      >
        <Avatar className="h-10 w-10 shrink-0 mt-0.5">
          <AvatarImage src={doctor.avatar_url || undefined} alt={doctor.full_name} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium truncate">
              {formatDoctorName(doctor.full_name)}
            </span>
            {doctor.connection_type === "granted_access" && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-primary/10 text-primary">
                Connected
              </Badge>
            )}
          </div>

          {/* Qualification & Experience */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            {doctor.qualification && (
              <span className="flex items-center gap-0.5">
                <GraduationCap className="h-3 w-3" />
                {doctor.qualification}
              </span>
            )}
            {doctor.experience_years != null && (
              <span className="flex items-center gap-0.5">
                <Briefcase className="h-3 w-3" />
                {doctor.experience_years}y exp
              </span>
            )}
            {doctor.consultation_fee != null && (
              <span className="flex items-center gap-0.5">
                <DollarSign className="h-3 w-3" />
                ₹{doctor.consultation_fee}
              </span>
            )}
          </div>

          {/* Hospital */}
          {doctor.hospital_name && (
            <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {doctor.hospital_name}
            </div>
          )}

          {/* Rating */}
          <DoctorRatingDisplay stats={ratingStats} size="sm" />

          <p className="text-[11px] text-muted-foreground">{match.reason}</p>

          <div className="flex items-center gap-2">
            <Progress value={pct} className="h-1 flex-1 max-w-[80px]" />
            <span className={cn("text-[10px] font-medium flex items-center gap-0.5", confidence.color)}>
              <TrendingUp className="h-2.5 w-2.5" />
              {confidence.label}
            </span>
          </div>

          {/* Keyword badges */}
          {(match.matchedKeywords.length > 0 || (match.matchedDiseases && match.matchedDiseases.length > 0)) && (
            <div className="flex gap-1 flex-wrap">
              {match.matchedKeywords.map((kw) => (
                <Badge key={kw} variant="outline" className="text-[9px] px-1 py-0 font-normal">
                  {kw}
                </Badge>
              ))}
              {match.matchedDiseases?.map((d: DiseaseMatch, i: number) => (
                <Badge
                  key={`${d.name}-${i}`}
                  variant="secondary"
                  className={cn(
                    "text-[9px] px-1 py-0 font-normal gap-0.5",
                    d.matchType === "exact"
                      ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
                      : d.matchType === "synonym"
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 border-dashed"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                  title={d.via ? `Matched via "${d.via}"` : undefined}
                >
                  <Pill className="h-2.5 w-2.5" />
                  {d.name}
                  {d.via && (
                    <span className="text-[8px] opacity-70 ml-0.5">via: {d.via}</span>
                  )}
                </Badge>
              ))}
            </div>
          )}

          {/* Next Available Slot */}
          {nextSlot && (
            <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
              <Clock className="h-3 w-3" />
              Next available: {formatNextSlot(nextSlot)}
            </div>
          )}

          {/* Match Explanation Collapsible */}
          {match.scoreBreakdown && (
            <Collapsible open={explainOpen} onOpenChange={setExplainOpen}>
              <CollapsibleTrigger
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <Info className="h-3 w-3" />
                Why this match?
                <ChevronDown className={cn("h-3 w-3 transition-transform", explainOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] space-y-0.5 p-2 rounded-md bg-muted/50 border border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Specialty relevance</span>
                    <span className="font-medium">+{match.scoreBreakdown.specialtyScore}</span>
                  </div>
                  {match.scoreBreakdown.diseaseScore > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disease match</span>
                      <span className="font-medium text-green-600 dark:text-green-400">+{match.scoreBreakdown.diseaseScore}</span>
                    </div>
                  )}
                  {match.scoreBreakdown.connectionBonus > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connected doctor</span>
                      <span className="font-medium text-primary">+{match.scoreBreakdown.connectionBonus}</span>
                    </div>
                  )}
                  {(match.scoreBreakdown.ratingBonus ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient rating</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">+{match.scoreBreakdown.ratingBonus}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-0.5 border-t border-border">
                    <span className="font-medium">Total</span>
                    <span className="font-semibold">{match.score}/{match.maxScore}</span>
                  </div>
                  {match.isAI && (
                    <p className="text-muted-foreground pt-0.5 italic">{match.reason}</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-3" />
      </button>
    </div>
  );
}
