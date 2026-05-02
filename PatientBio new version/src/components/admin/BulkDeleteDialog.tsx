import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { AdminUser, roleLabels } from "@/hooks/useAdminUsers";
import { useTranslation } from "react-i18next";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AdminUser[];
  onConfirm: () => void;
  isDeleting: boolean;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  users,
  onConfirm,
  isDeleting,
}: BulkDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t(users.length !== 1 ? "bulkDelete.deleteUsers_plural" : "bulkDelete.deleteUsers", { count: users.length })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("bulkDelete.cannotBeUndone")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-48 rounded-md border p-3">
          <ul className="space-y-2">
            {users.map((user) => (
              <li key={user.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[200px]">{user.email}</span>
                <Badge variant="outline" className="text-xs">
                  {roleLabels[user.role]}
                </Badge>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t("bulkDelete.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("bulkDelete.deleting")}
              </>
            ) : (
              t(users.length !== 1 ? "bulkDelete.confirmDelete_plural" : "bulkDelete.confirmDelete", { count: users.length })
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}