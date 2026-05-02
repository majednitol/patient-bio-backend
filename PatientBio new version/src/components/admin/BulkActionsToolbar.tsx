import { Button } from "@/components/ui/button";
import { Trash2, UserCog, Download, X } from "lucide-react";
import { AdminUser } from "@/hooks/useAdminUsers";
import { useTranslation } from "react-i18next";

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedUsers: AdminUser[];
  onBulkDelete: () => void;
  onBulkRoleChange: () => void;
  onExport: () => void;
  onClearSelection: () => void;
  isDeleting?: boolean;
  isChangingRole?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedUsers,
  onBulkDelete,
  onBulkRoleChange,
  onExport,
  onClearSelection,
  isDeleting,
  isChangingRole,
}: BulkActionsToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-card border rounded-xl shadow-lg px-3 sm:px-4 py-2 sm:py-3">
        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
          {t(selectedCount !== 1 ? "bulkActions.usersSelected_plural" : "bulkActions.usersSelected", { count: selectedCount })}
        </span>
        
        <div className="h-4 w-px bg-border hidden sm:block" />
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkDelete}
            disabled={isDeleting || isChangingRole}
            className="h-8 text-xs sm:text-sm"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">{t("bulkActions.delete")}</span>
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={onBulkRoleChange}
            disabled={isDeleting || isChangingRole}
            className="h-8 text-xs sm:text-sm"
          >
            <UserCog className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">{t("bulkActions.changeRole")}</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isDeleting || isChangingRole}
            className="h-8 text-xs sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">{t("bulkActions.exportCsv")}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8"
            title={t("bulkActions.clearSelection")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}