import { useState, useEffect } from "react";
import { HospitalStaffRole, STAFF_ROLES, DoctorProfile } from "@/types/hospital";
import { useUpdateStaff } from "@/hooks/useHospitalStaff";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DepartmentSelect } from "./DepartmentSelect";
import { Loader2 } from "lucide-react";

interface StaffWithProfile {
  id: string;
  user_id: string;
  role: HospitalStaffRole;
  department: string | null;
  department_id: string | null;
  employee_id: string | null;
  joined_at: string;
  doctor_profile?: DoctorProfile | null;
  display_name?: string | null;
}

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospitalId: string;
  staff: StaffWithProfile | null;
}

export function EditStaffDialog({
  open,
  onOpenChange,
  hospitalId,
  staff,
}: EditStaffDialogProps) {
  const updateStaff = useUpdateStaff();
  const [role, setRole] = useState<HospitalStaffRole>("receptionist");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [showDemotionWarning, setShowDemotionWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  useEffect(() => {
    if (staff) {
      setRole(staff.role);
      setDepartmentId(staff.department_id || null);
      setEmployeeId(staff.employee_id || "");
    }
  }, [staff]);

  const staffName = staff?.display_name || staff?.doctor_profile?.full_name || "Staff Member";

  const handleSubmit = async () => {
    if (!staff) return;

    // Check for admin demotion
    if (staff.role === "admin" && role !== "admin") {
      setShowDemotionWarning(true);
      setPendingSubmit(true);
      return;
    }

    await performUpdate();
  };

  const performUpdate = async () => {
    if (!staff) return;

    await updateStaff.mutateAsync({
      id: staff.id,
      hospitalId,
      role,
      department_id: departmentId,
      employee_id: employeeId || null,
    });

    onOpenChange(false);
    setPendingSubmit(false);
  };

  const handleDemotionConfirm = async () => {
    setShowDemotionWarning(false);
    if (pendingSubmit) {
      await performUpdate();
    }
  };

  const handleDemotionCancel = () => {
    setShowDemotionWarning(false);
    setPendingSubmit(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update details for {staffName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as HospitalStaffRole)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <DepartmentSelect
                hospitalId={hospitalId}
                value={departmentId}
                onChange={setDepartmentId}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="e.g., EMP-001"
              />
            </div>

            {staff && (
              <p className="text-sm text-muted-foreground">
                Joined: {new Date(staff.joined_at).toLocaleDateString()}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updateStaff.isPending}>
              {updateStaff.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Demotion Warning */}
      <AlertDialog open={showDemotionWarning} onOpenChange={setShowDemotionWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote Administrator?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to change this user from Administrator to {STAFF_ROLES.find(r => r.value === role)?.label}. 
              They will lose administrative privileges for this hospital.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDemotionCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDemotionConfirm}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
