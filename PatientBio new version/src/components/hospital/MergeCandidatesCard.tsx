import { useMergeCandidates, useDismissMergeCandidate, useRunDuplicateDetection } from "@/hooks/useMergeCandidates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, X, Check, AlertTriangle } from "lucide-react";
import { useState } from "react";
import MergeReviewDialog from "./MergeReviewDialog";
import type { MergeCandidate } from "@/hooks/useMergeCandidates";

interface MergeCandidatesCardProps {
  hospitalId: string;
}

export default function MergeCandidatesCard({ hospitalId }: MergeCandidatesCardProps) {
  const { data: candidates, isLoading } = useMergeCandidates(hospitalId);
  const dismiss = useDismissMergeCandidate();
  const runScan = useRunDuplicateDetection();
  const [reviewCandidate, setReviewCandidate] = useState<MergeCandidate | null>(null);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "destructive";
    if (score >= 0.6) return "secondary";
    return "outline";
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Duplicate Detection
                {candidates && candidates.length > 0 && (
                  <Badge variant="destructive" className="ml-1">{candidates.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Potential duplicate patient records</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => runScan.mutate(hospitalId)}
              disabled={runScan.isPending}
            >
              <Search className="h-3 w-3" />
              {runScan.isPending ? "Scanning..." : "Scan Now"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="space-y-3">
              {candidates.slice(0, 5).map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {candidate.profile_a?.display_name || "Unknown"} ↔ {candidate.profile_b?.display_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.match_factors?.dob_match && "DOB match • "}
                        {candidate.match_factors?.phone_match && "Phone match • "}
                        {candidate.match_factors?.name_similarity
                          ? `Name ${Math.round(candidate.match_factors.name_similarity * 100)}% similar`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getConfidenceColor(candidate.confidence_score)}>
                      {Math.round(candidate.confidence_score * 100)}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setReviewCandidate(candidate)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => dismiss.mutate({ candidateId: candidate.id, status: "dismissed" })}
                      disabled={dismiss.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {candidates.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{candidates.length - 5} more candidates
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No duplicate candidates found. Run a scan to check.
            </p>
          )}
        </CardContent>
      </Card>

      <MergeReviewDialog
        candidate={reviewCandidate}
        onClose={() => setReviewCandidate(null)}
      />
    </>
  );
}
