import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { useSyncConflicts, type SyncConflict } from "@/hooks/useSyncConflicts";
import { SyncConflictReviewDialog } from "./SyncConflictReviewDialog";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function SyncConflictsCard() {
  const { t } = useTranslation();
  const { conflicts, isLoading, unresolvedCount, resolveConflict, isResolving } = useSyncConflicts();
  const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);

  if (isLoading) return null;
  if (unresolvedCount === 0) return null;

  return (
    <>
      <Card className="border-amber-300/50 dark:border-amber-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
           <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("syncConflicts.syncConflicts")}
            <Badge variant="secondary" className="text-xs">{unresolvedCount}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {conflicts.slice(0, 5).map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedConflict(conflict)}
              >
                <div className="min-w-0 flex-1">
                   <p className="text-sm font-medium truncate">
                    {t("syncConflicts.conflict", { type: conflict.resource_type })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conflict.conflict_fields.length} field{conflict.conflict_fields.length !== 1 ? "s" : ""} ·{" "}
                    {formatDistanceToNow(new Date(conflict.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-xs shrink-0">
                  {t("syncConflicts.review")}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <SyncConflictReviewDialog
        conflict={selectedConflict}
        onClose={() => setSelectedConflict(null)}
        onResolve={(resolution) => {
          if (selectedConflict) {
            resolveConflict(
              { conflictId: selectedConflict.id, resolution },
              { onSuccess: () => setSelectedConflict(null) }
            );
          }
        }}
        isResolving={isResolving}
      />
    </>
  );
}
