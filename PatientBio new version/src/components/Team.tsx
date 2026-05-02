import { useState } from "react";
import { Plus, Loader2, Users, UserPlus, Pencil, Trash2, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useTeamMembers, useCreateTeamMember, useUpdateTeamMember, useDeleteTeamMember, uploadProfileImage, TeamMember, TeamMemberInsert } from "@/hooks/useTeamMembers";
import TeamMemberCard from "@/components/TeamMemberCard";
import TeamMemberForm from "@/components/TeamMemberForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

const TeamCardSkeleton = () => (
  <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border/50 dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-center space-y-4">
    <Skeleton className="w-20 h-20 sm:w-28 sm:h-28 rounded-full mx-auto" />
    <Skeleton className="h-5 w-32 mx-auto" />
    <Skeleton className="h-3 w-24 mx-auto" />
    <Skeleton className="h-12 w-full" />
    <div className="flex justify-center gap-2">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
  </div>
);

const Team = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { data: teamMembers, isLoading } = useTeamMembers(false, true);
  const { data: advisors } = useTeamMembers(true, true);

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

  const handleOpenForm = () => {
    setEditingMember(null);
    setFormOpen(true);
  };

  return (
    <section id="team" className="py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-5">
            <Users className="h-4 w-4" />
            {t("team.ourTeam")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            {t("team.title1")}{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t("team.title2")}
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("team.subtitle")}
          </p>

          {isAdmin && (
            <Button onClick={handleOpenForm} className="mt-6 gap-2" size="lg">
              <UserPlus className="h-4 w-4" />
              {t("team.addMember")}
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {[...Array(6)].map((_, i) => <TeamCardSkeleton key={i} />)}
          </div>
        ) : teamMembers && teamMembers.length > 0 ? (
          <>
            {/* Leadership Team */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-12 sm:mb-16">
              {teamMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  isEditable={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {/* Advisors */}
            {advisors && advisors.length > 0 && (
              <div className="bg-muted/30 dark:bg-muted/10 rounded-2xl p-6 sm:p-8">
                <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-foreground">{t("team.advisoryBoard")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {advisors.map((advisor) => (
                    <div key={advisor.id} className="group relative text-center p-4 rounded-xl bg-card dark:bg-card border border-border/30 dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-md dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300">
                      {isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(advisor)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(advisor.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                      {advisor.profile_image_url ? (
                        <img
                          src={advisor.profile_image_url}
                          alt={advisor.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover mx-auto mb-3 ring-2 ring-border group-hover:ring-primary/30 transition-all duration-300"
                        />
                      ) : (
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-muted-foreground/20 to-muted-foreground/10 flex items-center justify-center text-muted-foreground text-sm sm:text-lg font-bold mx-auto mb-3">
                          {advisor.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                      )}
                      <h4 className="font-semibold text-sm sm:text-base text-foreground">{advisor.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">{advisor.role}</p>
                      {(advisor.linkedin_url || advisor.twitter_url) && (
                        <div className="flex justify-center gap-2">
                          {advisor.linkedin_url && (
                            <a href={advisor.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200">
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {advisor.twitter_url && (
                            <a href={advisor.twitter_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md bg-muted/60 dark:bg-muted/40 hover:bg-primary/10 hover:text-primary transition-all duration-200">
                              <Twitter className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">{t("team.noMembers")}</h3>
            <p className="text-sm text-muted-foreground/70">{t("team.noMembersDesc")}</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TeamMemberForm open={formOpen} onOpenChange={setFormOpen} member={editingMember} onSubmit={handleSubmit} isLoading={isSubmitting} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("team.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Team;
