import { Button } from "@/components/ui/button";
import { XCircle, Trash2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BulkTokenActionsProps {
  selectedCount: number;
  hasActiveSelected: boolean;
  onRevokeSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  isRevoking?: boolean;
  isDeleting?: boolean;
}

const BulkTokenActions = ({
  selectedCount,
  hasActiveSelected,
  onRevokeSelected,
  onDeleteSelected,
  onClearSelection,
  isRevoking,
  isDeleting,
}: BulkTokenActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 flex items-center justify-between gap-2 bg-background border rounded-lg shadow-lg p-3 mx-auto max-w-lg">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{selectedCount} selected</span>
      </div>
      <div className="flex items-center gap-2">
        {hasActiveSelected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isRevoking}>
                <XCircle className="mr-1 h-3 w-3" />
                Revoke
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke {selectedCount} Links</AlertDialogTitle>
                <AlertDialogDescription>
                  This will deactivate all selected active links immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRevokeSelected}>Revoke All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isDeleting}>
              <Trash2 className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} Links</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the selected links. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={onDeleteSelected}>
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default BulkTokenActions;
