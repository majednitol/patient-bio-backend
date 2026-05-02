import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserCog } from "lucide-react";
import { AdminUser, UserRole, roleLabels } from "@/hooks/useAdminUsers";
import { useTranslation } from "react-i18next";

interface BulkRoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AdminUser[];
  onConfirm: (role: UserRole) => void;
  isChanging: boolean;
}

export function BulkRoleChangeDialog({
  open,
  onOpenChange,
  users,
  onConfirm,
  isChanging,
}: BulkRoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm(selectedRole);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            {t(users.length !== 1 ? "bulkRoleChange.changeRoleFor_plural" : "bulkRoleChange.changeRoleFor", { count: users.length })}
          </DialogTitle>
          <DialogDescription>
            {t("bulkRoleChange.selectNewRole")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("bulkRoleChange.newRole")}</label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as UserRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t("bulkRoleChange.patient")}</SelectItem>
                <SelectItem value="doctor">{t("bulkRoleChange.doctor")}</SelectItem>
                <SelectItem value="hospital_admin">{t("bulkRoleChange.hospitalAdmin")}</SelectItem>
                <SelectItem value="pathologist">{t("bulkRoleChange.pathologist")}</SelectItem>
                <SelectItem value="researcher">{t("bulkRoleChange.researcher")}</SelectItem>
                <SelectItem value="admin">{t("bulkRoleChange.administrator")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t("bulkRoleChange.affectedUsers", { count: users.length })}
            </label>
            <ScrollArea className="max-h-36 rounded-md border p-3">
              <ul className="space-y-2">
                {users.map((user) => (
                  <li key={user.id} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[180px]">{user.email}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[user.role]}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="secondary" className="text-xs">
                        {roleLabels[selectedRole]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isChanging}>
            {t("bulkRoleChange.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isChanging}>
            {isChanging ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("bulkRoleChange.updating")}
              </>
            ) : (
              t(users.length !== 1 ? "bulkRoleChange.updateUsers_plural" : "bulkRoleChange.updateUsers", { count: users.length })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}