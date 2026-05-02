import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFamilyMembers, useRemoveFamilyMember, RELATIONSHIP_OPTIONS } from "@/hooks/useFamilyMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AddFamilyMemberDialog } from "@/components/dashboard/AddFamilyMemberDialog";
import ShareWithDoctorDialog from "@/components/dashboard/ShareWithDoctorDialog";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Share2,
  FileText,
  Heart,
  Baby,
  User,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDoctorConnections } from "@/hooks/useDoctorConnections";
import { PendingLinkRequests } from "@/components/dashboard/PendingLinkRequests";
import { OutgoingLinkRequests } from "@/components/dashboard/OutgoingLinkRequests";
import { toast } from "@/hooks/use-toast";

const FamilyMembersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: familyMembers, isLoading } = useFamilyMembers();
  const { doctors: doctorConnections, isLoading: doctorsLoading } = useDoctorConnections();
  const removeMember = useRemoveFamilyMember();

  const { data: memberProfiles } = useQuery({
    queryKey: ["family-member-profiles", familyMembers?.map((m) => m.patient_id)],
    queryFn: async () => {
      if (!familyMembers || familyMembers.length === 0) return {};

      const patientIds = familyMembers.map((m) => m.patient_id);
      const holderIds = familyMembers.map((m) => m.account_holder_id);
      const allIds = [...new Set([...patientIds, ...holderIds])];

      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, phone, date_of_birth, gender, patient_passport_id")
        .in("user_id", allIds);

      if (error) throw error;

      const profileMap: Record<string, any> = {};
      data?.forEach((p) => {
        profileMap[p.user_id] = p;
      });
      return profileMap;
    },
    enabled: !!familyMembers && familyMembers.length > 0,
  });

  const getRelationshipLabel = (value: string) => {
    return RELATIONSHIP_OPTIONS.find((r) => r.value === value)?.label || value;
  };

  const getRelationshipIcon = (relationship: string) => {
    switch (relationship) {
      case "child":
        return Baby;
      case "parent":
      case "guardian":
        return ShieldCheck;
      case "spouse":
        return Heart;
      default:
        return User;
    }
  };

  const handleRemove = (memberId: string, name: string) => {
    removeMember.mutate(memberId, {
      onSuccess: () => toast.success(`${name} has been removed.`),
      onError: () => toast.error("Failed to remove family member."),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const membersIManage = familyMembers?.filter(
    (m) => m.account_holder_id === user?.id
  ) || [];
  const managingMe = familyMembers?.filter(
    (m) => m.patient_id === user?.id
  ) || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-1.5 sm:p-2 rounded-lg">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("familyPage.familyMembers")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("familyPage.manageHealthRecords")}
            </p>
          </div>
        </div>
        <AddFamilyMemberDialog />
      </div>

      {/* Pending Link Requests */}
      <PendingLinkRequests />

      {/* Outgoing Link Requests */}
      <OutgoingLinkRequests />

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">{t("familyPage.familyHealthManagement")}</p>
              <p className="text-muted-foreground mt-1">
                {t("familyPage.familyHealthManagementDesc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className="space-y-4 sm:space-y-6 lg:space-y-0 desktop-two-col">
      {/* Members I Manage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t("familyPage.membersIManage")}
          </CardTitle>
          <CardDescription>
            {t("familyPage.membersIManageDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membersIManage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">{t("familyPage.noFamilyMembers")}</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {t("familyPage.noFamilyMembersDesc")}
              </p>
              <AddFamilyMemberDialog
                trigger={
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t("familyPage.addFamilyMember")}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {membersIManage.map((member) => {
                const profile = memberProfiles?.[member.patient_id];
                const RelIcon = getRelationshipIcon(member.relationship);

                return (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <Avatar className="h-9 w-9 sm:h-12 sm:w-12 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <RelIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <h4 className="font-semibold text-sm sm:text-base truncate">
                              {profile?.display_name || "Unknown"}
                            </h4>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                              {getRelationshipLabel(member.relationship)}
                            </Badge>
                          </div>
                          {profile?.patient_passport_id && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">
                              {profile.patient_passport_id}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                            {member.can_manage_records && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs gap-1">
                                <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {t("familyPage.records")}
                              </Badge>
                            )}
                            {member.can_share_data && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs gap-1">
                                <Share2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {t("familyPage.sharing")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 sm:mt-4 flex gap-1.5 sm:gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 sm:h-8 text-xs sm:text-sm"
                          onClick={() => navigate(`/dashboard/family/${member.patient_id}`)}
                        >
                          {t("familyPage.viewProfile")}
                        </Button>
                        <ShareWithDoctorDialog
                          doctors={doctorConnections || []}
                          doctorsLoading={doctorsLoading}
                          patientId={member.patient_id}
                          patientName={profile?.display_name || "Family Member"}
                          trigger={
                            <Button variant="outline" size="sm" className="flex-1 h-7 sm:h-8 text-xs sm:text-sm">
                              {t("familyPage.shareData")}
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 w-7 sm:h-8 sm:w-8 p-0 shrink-0">
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("familyPage.removeFamilyMember")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("familyPage.removeDesc", { name: profile?.display_name || "this member" })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleRemove(member.id, profile?.display_name || "Member")}
                              >
                                {t("familyPage.remove")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Managing Me */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-secondary" />
            {t("familyPage.managingMyRecords")}
          </CardTitle>
          <CardDescription>
            {t("familyPage.managingMyRecordsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managingMe.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">{t("familyPage.noOneManaging")}</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t("familyPage.noOneManagingDesc")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {managingMe.map((member) => {
                const profile = memberProfiles?.[member.account_holder_id];
                const RelIcon = getRelationshipIcon(member.relationship);
                const displayName = profile?.display_name || "Unknown";
                const initials = displayName !== "Unknown"
                  ? displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  : "?";
                const maskedPhone = profile?.phone
                  ? profile.phone.replace(/(\+?\d{2,4}\s?\d{3})\d{2,4}(\d{2})/, "$1XX-XXX$2")
                  : null;
                const maskedPassportId = profile?.patient_passport_id
                  ? profile.patient_passport_id.replace(/^(PB-\d{4})\d{2}(-\d{4})\d{2}(-\d)$/, "$1XX$2XX$3")
                  : null;

                return (
                  <Card key={member.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <Avatar className="h-9 w-9 sm:h-12 sm:w-12 shrink-0">
                          <AvatarFallback className="bg-secondary/10 text-secondary font-semibold text-xs sm:text-sm">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <h4 className="font-semibold text-sm sm:text-base truncate">
                              {displayName}
                            </h4>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                              {getRelationshipLabel(member.relationship)}
                            </Badge>
                          </div>
                          {maskedPassportId && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">
                              {maskedPassportId}
                            </p>
                          )}
                          {maskedPhone && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {maskedPhone}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                            {member.can_manage_records && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs gap-1">
                                <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {t("familyPage.records")}
                              </Badge>
                            )}
                            {member.can_share_data && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs gap-1">
                                <Share2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {t("familyPage.sharing")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 sm:mt-4 flex justify-end">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7 sm:h-8 text-xs sm:text-sm">
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                              {t("familyPage.revokeAccess")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("familyPage.revokeAccess")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("familyPage.revokeAccessDesc", { name: displayName })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleRemove(member.id, displayName)}
                              >
                                {t("familyPage.revokeAccess")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default FamilyMembersPage;
