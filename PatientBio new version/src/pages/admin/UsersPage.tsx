import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, User, Loader2, RefreshCw, Stethoscope, Building2, FlaskConical, Microscope, Trash2 } from "lucide-react";
import { useAdminUsers, useSetUserRole, useDeleteUser, useBulkDeleteUsers, useBulkSetRole, AdminUser, UserRole, roleLabels } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { usePagination } from "@/hooks/usePagination";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { SearchInput } from "@/components/admin/SearchInput";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { DeleteUserDialog } from "@/components/admin/DeleteUserDialog";
import { BulkActionsToolbar } from "@/components/admin/BulkActionsToolbar";
import { BulkDeleteDialog } from "@/components/admin/BulkDeleteDialog";
import { BulkRoleChangeDialog } from "@/components/admin/BulkRoleChangeDialog";
import { toast } from "@/hooks/use-toast";
import { UserProfileSheet } from "@/components/admin/UserProfileSheet";

const roleIcons: Record<UserRole, React.ReactNode> = {
  user: <User className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  doctor: <Stethoscope className="h-3 w-3" />,
  hospital_admin: <Building2 className="h-3 w-3" />,
  pathologist: <Microscope className="h-3 w-3" />,
  researcher: <FlaskConical className="h-3 w-3" />,
};

const roleColors: Record<UserRole, string> = {
  user: "bg-muted text-muted-foreground",
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  doctor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  hospital_admin: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  pathologist: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  researcher: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, error, refetch } = useAdminUsers();
  const setRoleMutation = useSetUserRole();
  const deleteUserMutation = useDeleteUser();
  const bulkDeleteMutation = useBulkDeleteUsers();
  const bulkSetRoleMutation = useBulkSetRole();
  
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkRoleDialog, setShowBulkRoleDialog] = useState(false);
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter((user) =>
      user.email?.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      roleLabels[user.role]?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    hasNextPage,
    hasPrevPage,
  } = usePagination({ data: filteredUsers, itemsPerPage: 10 });

  // Selection helpers
  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    const pageIds = paginatedData
      .filter((u) => u.id !== currentUser?.id) // Can't select yourself
      .map((u) => u.id);
    const allSelected = pageIds.every((id) => selectedUserIds.has(id));
    
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const clearSelection = () => setSelectedUserIds(new Set());

  const selectedUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => selectedUserIds.has(u.id));
  }, [users, selectedUserIds]);

  const pageSelectableIds = paginatedData
    .filter((u) => u.id !== currentUser?.id)
    .map((u) => u.id);
  const allOnPageSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedUserIds.has(id));
  const someOnPageSelected = pageSelectableIds.some((id) => selectedUserIds.has(id));

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setPendingRoles((prev) => ({ ...prev, [userId]: newRole }));
    setRoleMutation.mutate(
      { targetUserId: userId, role: newRole },
      {
        onSettled: () => {
          setPendingRoles((prev) => {
            const updated = { ...prev };
            delete updated[userId];
            return updated;
          });
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!userToDelete) return;
    deleteUserMutation.mutate(userToDelete.id, {
      onSettled: () => {
        setUserToDelete(null);
      },
    });
  };

  const handleBulkDelete = () => {
    const idsToDelete = Array.from(selectedUserIds);
    bulkDeleteMutation.mutate(idsToDelete, {
      onSuccess: () => {
        setShowBulkDeleteDialog(false);
        clearSelection();
      },
      onError: () => {
        setShowBulkDeleteDialog(false);
      },
    });
  };

  const handleBulkRoleChange = (role: UserRole) => {
    const idsToUpdate = Array.from(selectedUserIds);
    bulkSetRoleMutation.mutate(
      { targetUserIds: idsToUpdate, role },
      {
        onSuccess: () => {
          setShowBulkRoleDialog(false);
          clearSelection();
        },
        onError: () => {
          setShowBulkRoleDialog(false);
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (selectedUsers.length === 0) return;

    const headers = ["Email", "Role", "Verified", "Joined", "Last Sign In", "Last Activity"];
    const rows = selectedUsers.map((user) => [
      user.email,
      roleLabels[user.role],
      user.email_confirmed_at ? "Yes" : "No",
      user.created_at ? format(new Date(user.created_at), "yyyy-MM-dd") : "",
      user.last_sign_in_at ? format(new Date(user.last_sign_in_at), "yyyy-MM-dd") : "Never",
      user.last_activity_at ? format(new Date(user.last_activity_at), "yyyy-MM-dd HH:mm") : "Never",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedUsers.length} user(s) to CSV`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage user accounts and roles</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Users
                {filteredUsers.length > 0 && (
                  <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
                    {filteredUsers.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                View and manage registered users. Assign roles to users.
              </CardDescription>
            </div>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by email..."
              className="w-full sm:w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">Failed to load users: {error.message}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-0 sm:mx-0">
                <Table className="min-w-[650px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={toggleAllOnPage}
                          aria-label="Select all users on this page"
                          className={someOnPageSelected && !allOnPageSelected ? "opacity-50" : ""}
                        />
                      </TableHead>
                      <TableHead className="text-xs sm:text-sm">Email</TableHead>
                      <TableHead className="text-xs sm:text-sm">Role</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Verified</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden md:table-cell">Joined</TableHead>
                      <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Last Activity</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton columns={7} rows={5} />
                    ) : paginatedData.length > 0 ? (
                    paginatedData.map((user: AdminUser) => {
                      const isCurrentUser = user.id === currentUser?.id;
                      const isPending = pendingRoles[user.id] !== undefined;
                      const isSelected = selectedUserIds.has(user.id);
                      
                      return (
                        <TableRow 
                          key={user.id}
                          className={cn(isSelected ? "bg-muted/50" : "", "cursor-pointer")}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest("button, [role='combobox'], [role='listbox'], [data-radix-collection-item], input, label")) return;
                            setProfileUser(user);
                          }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleUser(user.id)}
                              disabled={isCurrentUser}
                              aria-label={`Select ${user.email}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm">
                            <span className="truncate max-w-[120px] sm:max-w-none block">{user.email}</span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-1 text-[10px] sm:text-xs">You</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={`flex items-center gap-1 w-fit text-[10px] sm:text-xs ${roleColors[user.role]}`}
                            >
                              {roleIcons[user.role]}
                              {roleLabels[user.role]}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {user.email_confirmed_at ? (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs sm:text-sm">{formatDate(user.created_at)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-xs sm:text-sm">
                            {user.last_activity_at ? (
                              <span title={format(new Date(user.last_activity_at), "PPpp")}>
                                {formatDate(user.last_activity_at)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                value={pendingRoles[user.id] || user.role}
                                onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                                disabled={isCurrentUser || isPending}
                              >
                                <SelectTrigger className="w-[100px] sm:w-[130px] h-8 sm:h-10 text-xs sm:text-sm">
                                  {isPending ? (
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                  ) : (
                                    <SelectValue />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user" className="text-xs sm:text-sm">Patient</SelectItem>
                                  <SelectItem value="doctor" className="text-xs sm:text-sm">Doctor</SelectItem>
                                  <SelectItem value="hospital_admin" className="text-xs sm:text-sm">Hospital Admin</SelectItem>
                                  <SelectItem value="pathologist" className="text-xs sm:text-sm">Pathologist</SelectItem>
                                  <SelectItem value="researcher" className="text-xs sm:text-sm">Researcher</SelectItem>
                                  <SelectItem value="admin" className="text-xs sm:text-sm">Administrator</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-destructive"
                                onClick={() => setUserToDelete(user)}
                                disabled={isCurrentUser}
                                title={isCurrentUser ? "You cannot delete your own account" : "Delete user"}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                        {searchQuery ? "No users match your search" : "No users found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
              
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                hasNextPage={hasNextPage}
                hasPrevPage={hasPrevPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Single user delete dialog */}
      <DeleteUserDialog
        user={userToDelete}
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteUserMutation.isPending}
      />

      {/* Bulk actions toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedUserIds.size}
        selectedUsers={selectedUsers}
        onBulkDelete={() => setShowBulkDeleteDialog(true)}
        onBulkRoleChange={() => setShowBulkRoleDialog(true)}
        onExport={handleExportCSV}
        onClearSelection={clearSelection}
        isDeleting={bulkDeleteMutation.isPending}
        isChangingRole={bulkSetRoleMutation.isPending}
      />

      {/* Bulk delete dialog */}
      <BulkDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        users={selectedUsers}
        onConfirm={handleBulkDelete}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* Bulk role change dialog */}
      <BulkRoleChangeDialog
        open={showBulkRoleDialog}
        onOpenChange={setShowBulkRoleDialog}
        users={selectedUsers}
        onConfirm={handleBulkRoleChange}
        isChanging={bulkSetRoleMutation.isPending}
      />

      {/* User profile detail sheet */}
      <UserProfileSheet
        user={profileUser}
        open={!!profileUser}
        onOpenChange={(open) => !open && setProfileUser(null)}
      />
    </div>
  );
}
