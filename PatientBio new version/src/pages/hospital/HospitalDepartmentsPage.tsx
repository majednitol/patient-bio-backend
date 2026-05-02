import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Hospital } from "@/types/hospital";
import { Department } from "@/types/department";
import { useDepartments, useDeleteDepartment } from "@/hooks/useDepartments";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddDepartmentDialog } from "@/components/hospital/AddDepartmentDialog";
import { EditDepartmentDialog } from "@/components/hospital/EditDepartmentDialog";
import { Building2, Users, Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp, UserX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface OutletContext {
  hospital: Hospital;
  isAdmin: boolean;
}

// Hook to fetch staff grouped by department
function useDepartmentStaff(hospitalId: string) {
  return useQuery({
    queryKey: ["hospital-department-staff", hospitalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_staff")
        .select("id, department_id, role, employee_id, doctor_profile:doctor_profiles(full_name)")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!hospitalId,
  });
}

export default function HospitalDepartmentsPage() {
  const { hospital, isAdmin } = useOutletContext<OutletContext>();
  const { data: departments, isLoading } = useDepartments(hospital.id);
  const { data: allStaff } = useDepartmentStaff(hospital.id);
  const deleteDepartment = useDeleteDepartment();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const totalStaff = departments?.reduce((sum, d) => sum + (d.staff_count || 0), 0) || 0;
  const unassignedStaff = allStaff?.filter(s => !s.department_id).length || 0;

  const toggleExpanded = (id: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getDeptStaff = (deptId: string) => allStaff?.filter(s => s.department_id === deptId) || [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDepartment.mutateAsync({ id: deleteTarget.id, hospitalId: hospital.id });
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground">Manage hospital departments and their staff assignments</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStaff}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unassigned Staff</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{unassignedStaff}</div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Table */}
      {departments?.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create your first department to organize staff"
          action={isAdmin ? { label: "Add Department", onClick: () => setShowAddDialog(true), icon: Plus } : undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Departments</CardTitle>
            <CardDescription>Click the arrow to see staff assigned to each department</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead className="text-center">Staff</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments?.map((dept) => {
                  const isExpanded = expandedDepts.has(dept.id);
                  const deptStaff = getDeptStaff(dept.id);
                  return (
                    <Collapsible key={dept.id} open={isExpanded} onOpenChange={() => toggleExpanded(dept.id)} asChild>
                      <>
                        <TableRow className="cursor-pointer" onClick={() => toggleExpanded(dept.id)}>
                          <TableCell>
                            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[200px] truncate">
                            {dept.description || "—"}
                          </TableCell>
                          <TableCell>{dept.head_staff?.doctor_profile?.full_name || "—"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{dept.staff_count || 0}</Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" onClick={() => setEditDepartment(dept)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(dept)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={isAdmin ? 6 : 5} className="p-0">
                              <div className="bg-muted/30 px-8 py-3 border-b">
                                {deptStaff.length === 0 ? (
                                  <p className="text-sm text-muted-foreground italic">No staff assigned to this department</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {deptStaff.map((staff: any) => (
                                      <div key={staff.id} className="flex items-center gap-2 text-sm p-2 bg-background rounded border">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">{staff.doctor_profile?.full_name || "Unknown"}</span>
                                        <Badge variant="outline" className="text-xs ml-auto capitalize">{staff.role}</Badge>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddDepartmentDialog open={showAddDialog} onOpenChange={setShowAddDialog} hospitalId={hospital.id} />
      <EditDepartmentDialog open={!!editDepartment} onOpenChange={(open) => !open && setEditDepartment(null)} hospitalId={hospital.id} department={editDepartment} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteTarget?.name}" from the hospital. Staff assigned to this department will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteDepartment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
