import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { useMergeHistory } from "@/hooks/useMergeHistory";
import { History, Undo2, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";

export default function MergeHistoryCard() {
  const { history, isLoading, undoMerge, isUndoing } = useMergeHistory();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Merge History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <InlineEmptyState icon={History} title="No merges yet" description="Merged patient records will appear here with undo capability." />
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((entry) => {
              const canUndo = !entry.is_undone && !isPast(new Date(entry.undo_deadline));
              return (
                <div key={entry.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        Merged into {entry.kept_patient_id.slice(0, 8)}…
                      </span>
                      {entry.is_undone ? (
                        <Badge variant="secondary" className="text-[10px]">Undone</Badge>
                      ) : canUndo ? (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Undo until {format(new Date(entry.undo_deadline), "MMM d, HH:mm")}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Finalized
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {canUndo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => undoMerge(entry.id)}
                      disabled={isUndoing}
                      className="shrink-0 ml-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      {isUndoing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1" />}
                      Undo
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
