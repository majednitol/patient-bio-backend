import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DoctorRatingStats } from "@/hooks/useDoctorRatings";

interface DoctorRatingDisplayProps {
  stats: DoctorRatingStats | undefined;
  size?: "sm" | "md";
  showBadge?: boolean;
}

export function DoctorRatingDisplay({ stats, size = "sm", showBadge = true }: DoctorRatingDisplayProps) {
  if (!stats || stats.avg_rating == null || stats.total_reviews === 0) return null;

  const isHighlyRated = stats.avg_rating >= 4.5 && stats.total_reviews >= 10;
  const starSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-0.5">
        <Star className={`${starSize} fill-amber-400 text-amber-400`} />
        <span className={`${textSize} font-medium`}>{stats.avg_rating.toFixed(1)}</span>
        <span className={`${textSize} text-muted-foreground`}>({stats.total_reviews} review{stats.total_reviews !== 1 ? "s" : ""})</span>
      </div>
      {showBadge && isHighlyRated && (
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 gap-0.5">
          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
          Highly Rated
        </Badge>
      )}
    </div>
  );
}
