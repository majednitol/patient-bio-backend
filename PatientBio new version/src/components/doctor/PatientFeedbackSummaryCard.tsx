import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import { useDoctorFeedback } from "@/hooks/useConsultationFeedback";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export function PatientFeedbackSummaryCard() {
  const { feedback, isLoading, avgRating, totalReviews, tagCounts, recentFeedback } =
    useDoctorFeedback();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (totalReviews === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
          <div className="bg-muted p-3 rounded-full">
            <Star className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No Patient Feedback Yet</p>
          <p className="text-xs text-muted-foreground">
            Feedback will appear here after patients rate their consultations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  const positiveTags = ["Thorough", "Good Listener", "Clear Explanations", "Caring", "Professional"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Patient Feedback
          <Badge variant="secondary" className="ml-auto text-xs">
            {totalReviews} reviews
          </Badge>
        </CardTitle>
        <CardDescription>How patients rate their consultation experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Average Rating */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-4 w-4",
                    star <= Math.round(avgRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = feedback.filter((f) => f.rating === star).length;
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-muted-foreground">{star}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tag Breakdown */}
        {sortedTags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Top Feedback Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sortedTags.map(([tag, count]) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    "text-xs",
                    positiveTags.includes(tag)
                      ? "border-primary/30 text-primary"
                      : "border-destructive/30 text-destructive"
                  )}
                >
                  {tag} ({count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Feedback */}
        {recentFeedback.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Recent Reviews</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {recentFeedback
                .filter((f) => f.comment)
                .slice(0, 3)
                .map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-3 w-3",
                              star <= f.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(f.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      "{f.comment}"
                    </p>
                    {f.is_anonymous && (
                      <span className="text-[10px] text-muted-foreground">— Anonymous</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
