import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital, STAFF_ROLES, HospitalStaffRole, DoctorProfile } from "@/types/hospital";
import { useHospitalStaff, useRemoveStaff } from "@/hooks/useHospitalStaff";
import { useStaffInvitations, useCancelInvitation, useResendInvitation } from "@/hooks/useAddHospitalStaff";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { Users, Search, UserMinus, Loader2, UserPlus, Mail, RotateCcw, X, Clock, Pencil } from "lucide-react";
import { AddStaffDialog } from "@/components/hospital/AddStaffDialog";
import { EditStaffDialog } from "@/components/hospital/EditStaffDialog";

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

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

export default function HospitalStaffPage() {
  const { hospital, isAdmin } = useOutletContext<HospitalContext>();
  const { data: staff, isLoading } = useHospitalStaff(hospital.id);
  const { data: invitations, isLoading: invitationsLoading } = useStaffInvitations(hospital.id);
  const removeStaff = useRemoveStaff();
  const cancelInvitation = useCancelInvitation();
  const resendInvitation = useResendInvitation();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);
  const [editStaff, setEditStaff] = useState<StaffWithProfile | null>(null);

  const filteredStaff = staff?.filter((s) => {
    const name = s.display_name || s.doctor_profile?.full_name || "";
    const matchesSearch = 
      name.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.department?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Role counts
  const roleCounts = staff?.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const handleRemove = async () => {
    if (!removeId) return;
    await removeStaff.mutateAsync({ id: removeId, hospitalId: hospital.id });
    setRemoveId(null);
  };

  const handleCancelInvitation = async () => {
    if (!cancelInviteId) return;
    await cancelInvitation.mutateAsync({ invitationId: cancelInviteId, hospitalId: hospital.id });
    setCancelInviteId(null);
  };

  const handleResendInvitation = async (invitationId: string) => {
    await resendInvitation.mutateAsync({
      invitationId,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "doctor":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Staff Directory</h1>
          <p className="text-muted-foreground">
            Manage hospital staff and their roles
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Staff ({staff?.length || 0})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations ({invitations?.length || 0})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="staff">
          {/* Role Summary Badges */}
          {Object.keys(roleCounts).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(roleCounts).sort(([,a],[,b]) => b - a).map(([role, count]) => (
                <Badge
                  key={role}
                  variant={roleFilter === role ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => setRoleFilter(roleFilter === role ? "all" : role)}
                >
                  {count} {role}{count > 1 ? "s" : ""}
                </Badge>
              ))}
              {roleFilter !== "all" && (
                <Badge variant="secondary" className="cursor-pointer" onClick={() => setRoleFilter("all")}>
                  Clear filter ✕
                </Badge>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Staff
                  </CardTitle>
                  <CardDescription>
                    View and manage hospital staff members
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <PageSkeleton type="table" />
              ) : filteredStaff?.length === 0 ? (
                <InlineEmptyState
                  icon={Users}
                  title={search ? "No matching staff" : "No staff members yet"}
                  description={search 
                    ? "Try adjusting your search terms to find staff members." 
                    : "Staff members who join this hospital will appear here."}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Joined</TableHead>
                        {isAdmin && <TableHead className="w-[80px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff?.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.display_name || "Staff Member"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">
                            {member.employee_id || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {member.doctor_profile?.specialty || "—"}
                          </TableCell>
                          <TableCell>{member.department || "—"}</TableCell>
                          <TableCell>
                            {new Date(member.joined_at).toLocaleDateString()}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditStaff(member as StaffWithProfile)}
                                  title="Edit staff"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setRemoveId(member.id)}
                                  className="text-destructive hover:text-destructive"
                                  title="Remove staff"
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invitations
                </CardTitle>
                <CardDescription>
                  Staff members who have been invited but haven't accepted yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <PageSkeleton type="table" />
                ) : !invitations?.length ? (
                  <InlineEmptyState
                    icon={Mail}
                    title="No pending invitations"
                    description="Invite new staff members using the Add Staff button above."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead className="w-[120px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invitations.map((invite) => {
                          const isExpired = new Date(invite.expires_at) < new Date();
                          return (
                            <TableRow key={invite.id}>
                              <TableCell className="font-medium">
                                {invite.name || "—"}
                              </TableCell>
                              <TableCell>{invite.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {invite.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isExpired ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    Expired
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(invite.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResendInvitation(invite.id)}
                                    disabled={resendInvitation.isPending}
                                    title="Resend invitation"
                                  >
                                    {resendInvitation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCancelInviteId(invite.id)}
                                    className="text-destructive hover:text-destructive"
                                    title="Cancel invitation"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Staff Dialog */}
      <AddStaffDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        hospitalId={hospital.id}
        hospitalName={hospital.name}
      />

      {/* Edit Staff Dialog */}
      <EditStaffDialog
        open={!!editStaff}
        onOpenChange={(open) => !open && setEditStaff(null)}
        hospitalId={hospital.id}
        staff={editStaff}
      />

      {/* Remove Staff Confirmation */}
      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this staff member? They will lose access to this hospital's management portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeStaff.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!cancelInviteId} onOpenChange={() => setCancelInviteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The invite link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelInvitation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancel Invitation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
