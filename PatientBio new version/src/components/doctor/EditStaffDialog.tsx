import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useUpdateStaff, type DoctorStaff } from "@/hooks/useDoctorStaff";
import {
  STAFF_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  groupPermissions,
} from "@/constants/staffPermissions";
import { Shield } from "lucide-react";

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: DoctorStaff | null;
}

export function EditStaffDialog({ open, onOpenChange, staff }: EditStaffDialogProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"nurse" | "receptionist" | "assistant">("nurse");
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(DEFAULT_PERMISSIONS);
  const updateStaff = useUpdateStaff();

  useEffect(() => {
    if (staff) {
      setFullName(staff.full_name);
      setPhone(staff.phone || "");
      setRole(staff.role);
      setIsActive(staff.is_active);
      // Merge saved permissions with defaults so new keys are included
      const saved = (staff.permissions as Record<string, boolean>) || {};
      setPermissions({ ...DEFAULT_PERMISSIONS, ...saved });
    }
  }, [staff]);

  const togglePermission = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  const handleSave = () => {
    if (!staff || !fullName) return;
    updateStaff.mutate(
      {
        id: staff.id,
        full_name: fullName,
        phone: phone || null,
        role,
        is_active: isActive,
        permissions: permissions as any,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const grouped = groupPermissions(STAFF_PERMISSIONS);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Separator />

          {/* Permissions Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">Permissions</Label>
              </div>
              <Badge variant="outline" className="text-xs">
                {enabledCount}/{STAFF_PERMISSIONS.length} enabled
              </Badge>
            </div>

            {Object.entries(grouped).map(([group, perms]) => (
              <div key={group} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-1">
                  {group}
                </p>
                {perms.map((perm) => (
                  <div
                    key={perm.key}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-0.5 pr-4">
                      <p className="text-sm font-medium leading-none">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                    <Switch
                      checked={!!permissions[perm.key]}
                      onCheckedChange={() => togglePermission(perm.key)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!fullName || updateStaff.isPending}
          >
            {updateStaff.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
