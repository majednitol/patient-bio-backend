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
import { useCreateDepartment } from "@/hooks/useDepartments";
import { useHospitalStaff } from "@/hooks/useHospitalStaff";
import { Loader2 } from "lucide-react";

interface AddDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId: string;
}

export function AddDepartmentDialog({
  open,
  onOpenChange,
  hospitalId,
}: AddDepartmentDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [headStaffId, setHeadStaffId] = useState<string>("");

  const createDepartment = useCreateDepartment();
  const { data: staff } = useHospitalStaff(hospitalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createDepartment.mutateAsync({
      hospitalId,
      name: name.trim(),
      description: description.trim() || undefined,
      headStaffId: headStaffId || undefined,
    });

    setName("");
    setDescription("");
    setHeadStaffId("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setHeadStaffId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Department</DialogTitle>
          <DialogDescription>
            Create a new department for your hospital.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Department Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Emergency, Cardiology"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the department"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="head">Department Head</Label>
            <Select value={headStaffId} onValueChange={setHeadStaffId}>
              <SelectTrigger id="head">
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createDepartment.isPending}>
              {createDepartment.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Department
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
