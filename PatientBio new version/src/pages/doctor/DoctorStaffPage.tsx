import { useState } from "react";
import { useDoctorStaff, useRemoveStaff, type DoctorStaff } from "@/hooks/useDoctorStaff";
import { AddStaffDialog } from "@/components/doctor/AddStaffDialog";
import { EditStaffDialog } from "@/components/doctor/EditStaffDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, UserX, UserCheck, Users } from "lucide-react";
import { useUpdateStaff } from "@/hooks/useDoctorStaff";

const roleBadgeVariants: Record<string, string> = {
  nurse: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  receptionist: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  assistant: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const statusBadge = (staff: DoctorStaff) => {
  if (!staff.is_active) return <Badge variant="secondary">Inactive</Badge>;
  if (staff.invite_status === "manual") return <Badge variant="outline">Manual</Badge>;
  if (staff.invite_status === "pending") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Invited</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>;
};

const DoctorStaffPage = () => {
  const { data: staffList = [], isLoading } = useDoctorStaff();
  const removeStaff = useRemoveStaff();
  const updateStaff = useUpdateStaff();
  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<DoctorStaff | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = staffList.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = staffList.filter((s) => s.is_active).length;

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Staff</h1>
          <p className="text-muted-foreground">
            {activeCount} active staff member{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="nurse">Nurse</SelectItem>
            <SelectItem value="receptionist">Receptionist</SelectItem>
            <SelectItem value="assistant">Assistant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading staff...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No staff members</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Add your first staff member to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="sm:hidden space-y-2">
            {filtered.map((staff) => (
              <div
                key={staff.id}
                className={`border rounded-lg p-3 space-y-2 ${!staff.is_active ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{staff.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{staff.email || "—"}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover z-50">
                      <DropdownMenuItem onClick={() => setEditStaff(staff)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {staff.is_active ? (
                        <DropdownMenuItem
                          onClick={() => removeStaff.mutate(staff.id)}
                          className="text-destructive"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => updateStaff.mutate({ id: staff.id, is_active: true })}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeVariants[staff.role]}`}>
                    {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                  </span>
                  {statusBadge(staff)}
                  {staff.phone && (
                    <span className="text-xs text-muted-foreground">{staff.phone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden sm:block border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((staff) => (
                  <TableRow key={staff.id} className={!staff.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{staff.full_name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeVariants[staff.role]}`}>
                        {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(staff)}</TableCell>
                    <TableCell className="text-muted-foreground">{staff.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{staff.email || "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover z-50">
                          <DropdownMenuItem onClick={() => setEditStaff(staff)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {staff.is_active ? (
                            <DropdownMenuItem
                              onClick={() => removeStaff.mutate(staff.id)}
                              className="text-destructive"
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => updateStaff.mutate({ id: staff.id, is_active: true })}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <AddStaffDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditStaffDialog
        open={!!editStaff}
        onOpenChange={(open) => !open && setEditStaff(null)}
        staff={editStaff}
      />
    </div>
  );
};

export default DoctorStaffPage;
