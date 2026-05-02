import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  uploadProfileImage,
  TeamMember,
  TeamMemberInsert,
} from "@/hooks/useTeamMembers";
import TeamMemberCard from "@/components/TeamMemberCard";
import TeamMemberForm from "@/components/TeamMemberForm";
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

export default function TeamAdminPage() {
  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers(false);
  const { data: advisors, isLoading: loadingAdvisors } = useTeamMembers(true);

  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setMemberToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (memberToDelete) {
      await deleteMember.mutateAsync(memberToDelete);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleSubmit = async (data: TeamMemberInsert, imageFile?: File) => {
    setIsSubmitting(true);
    try {
      let profileImageUrl = data.profile_image_url;

      if (imageFile) {
        const tempId = editingMember?.id || crypto.randomUUID();
        profileImageUrl = await uploadProfileImage(imageFile, tempId);
      }

      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          updates: { ...data, profile_image_url: profileImageUrl },
        });
      } else {
        await createMember.mutateAsync({ ...data, profile_image_url: profileImageUrl });
      }

      setEditingMember(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenForm = (isAdvisor: boolean = false) => {
    setEditingMember(null);
    setFormOpen(true);
  };

  const handleToggleVisibility = async (member: TeamMember) => {
    await updateMember.mutateAsync({
      id: member.id,
      updates: { is_visible: !member.is_visible },
    });
  };

  const isLoading = loadingTeam || loadingAdvisors;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">Add, edit, or remove team members and advisors</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="team" className="space-y-4">
          <TabsList>
            <TabsTrigger value="team">Team ({teamMembers?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="advisors">Advisors ({advisors?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-4">
            {teamMembers && teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    isEditable
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No team members yet. Click "Add Member" to create one.
              </p>
            )}
          </TabsContent>

          <TabsContent value="advisors" className="space-y-4">
            {advisors && advisors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {advisors.map((advisor) => (
                  <TeamMemberCard
                    key={advisor.id}
                    member={advisor}
                    isEditable
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No advisors yet. Click "Add Member" and check "Is Advisor" to create one.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Team Member Form Dialog */}
      <TeamMemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        member={editingMember}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
