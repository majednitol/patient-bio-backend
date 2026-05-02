import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateDepartment } from "@/hooks/useDepartments";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { Department } from "@/types/department";
import { Loader2 } from "lucide-react";

interface EditDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId: string;
  department: Department | null;
}

export function EditDepartmentDialog({
  open,
  onOpenChange,
  hospitalId,
  department,
}: EditDepartmentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headStaffId, setHeadStaffId] = useState<string>("");

  const updateDepartment = useUpdateDepartment();
  const { data: staff } = useHospitalStaff(hospitalId);

  useEffect(() => {
    if (department) {
      setName(department.name);
      setDescription(department.description || "");
      setHeadStaffId(department.head_staff_id || "none");
    }
  }, [department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) return;

    await updateDepartment.mutateAsync({
      id: department.id,
      hospitalId,
      name: name.trim(),
      description: description.trim() || undefined,
      headStaffId: headStaffId === "none" ? null : headStaffId || null,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Update department details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Department Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emergency, Cardiology"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the department"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-head">Department Head</Label>
            <Select value={headStaffId} onValueChange={setHeadStaffId}>
              <SelectTrigger id="edit-head">
                <SelectValue placeholder="Select department head (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(No head assigned)</SelectItem>
                {staff
                  ?.filter((s) => s.role === "admin" || s.role === "doctor")
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.doctor_profile?.full_name || s.display_name || "Staff Member"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || updateDepartment.isPending}>
              {updateDepartment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
