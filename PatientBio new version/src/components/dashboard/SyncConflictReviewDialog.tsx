import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, ArrowLeft, ArrowRight, GitMerge, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SyncConflict } from "@/hooks/useSyncConflicts";

interface SyncConflictReviewDialogProps {
  conflict: SyncConflict | null;
  onClose: () => void;
  onResolve: (resolution: "keep_local" | "keep_remote" | "manual_merge") => void;
  isResolving: boolean;
}

export function SyncConflictReviewDialog({ conflict, onClose, onResolve, isResolving }: SyncConflictReviewDialogProps) {
  if (!conflict) return null;

  return (
    <ResponsiveDialog open={!!conflict} onOpenChange={() => onClose()}>
      <ResponsiveDialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Sync Conflict
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {conflict.resource_type} — {conflict.source_system || "Unknown source"} ·{" "}
            {formatDistanceToNow(new Date(conflict.created_at), { addSuffix: true })}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Conflicting fields */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Conflicting Fields</p>
          {conflict.conflict_fields.map((field) => (
            <div key={field} className="space-y-1">
              <Badge variant="outline" className="text-xs mb-1">{field}</Badge>
              <div className="grid grid-cols-2 gap-2">
                <Card className="border-primary/30">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                      <ArrowLeft className="h-3 w-3" /> Local
                    </p>
                    <p className="text-sm break-all">
                      {String((conflict.local_data as Record<string, unknown>)[field] ?? "—")}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-amber-300 dark:border-amber-700">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" /> Remote
                    </p>
                    <p className="text-sm break-all">
                      {String((conflict.remote_data as Record<string, unknown>)[field] ?? "—")}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onResolve("keep_local")} disabled={isResolving} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Keep Local
          </Button>
          <Button variant="outline" onClick={() => onResolve("keep_remote")} disabled={isResolving} className="flex-1">
            <ArrowRight className="h-4 w-4 mr-1" />
            Keep Remote
          </Button>
          <Button onClick={() => onResolve("manual_merge")} disabled={isResolving} className="flex-1">
            {isResolving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <GitMerge className="h-4 w-4 mr-1" />}
            Manual Merge
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
