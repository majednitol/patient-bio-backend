import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CheckCircle, XCircle, Clock, Loader2, AlertTriangle } from "lucide-react";
import { useInvitationByToken, useAcceptInvitation } from "@/hooks/useAddHospitalStaff";
import { useAuth } from "@/contexts/AuthContext";
import { STAFF_ROLES } from "@/types/hospital";

export default function StaffInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { data: invitation, isLoading, error } = useInvitationByToken(token);
  const acceptInvitation = useAcceptInvitation();
  const [accepted, setAccepted] = useState(false);

  const isExpired = invitation && new Date(invitation.expires_at) < new Date();
  const hospitalName = (invitation?.hospitals as { name: string; logo_url: string | null })?.name || "Hospital";
  const roleName = STAFF_ROLES.find(r => r.value === invitation?.role)?.label || invitation?.role;

  const handleAccept = async () => {
    if (!token) return;
    const result = await acceptInvitation.mutateAsync(token);
    if (result) {
      setAccepted(true);
      setTimeout(() => { navigate(`/hospital/${result.hospitalId}`); }, 2000);
    }
  };

  useEffect(() => {
    if (!authLoading && !user && invitation) {
      sessionStorage.setItem("pendingInvitation", token || "");
      navigate(`/hospitals/login?redirect=/staff-invitation/${token}`);
    }
  }, [authLoading, user, invitation, token, navigate]);

  useEffect(() => {
    const pendingToken = sessionStorage.getItem("pendingInvitation");
    if (pendingToken && user) sessionStorage.removeItem("pendingInvitation");
  }, [user]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>{t("staffInvitation.invalidInvitation")}</CardTitle>
            <CardDescription>{t("staffInvitation.invalidInvitationDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild><Link to="/hospitals">{t("staffInvitation.browseHospitals")}</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <CardTitle>{t("staffInvitation.invitationExpired")}</CardTitle>
            <CardDescription>{t("staffInvitation.invitationExpiredDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline"><Link to="/hospitals">{t("staffInvitation.browseHospitals")}</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle>{t("staffInvitation.welcomeTo", { hospital: hospitalName })}</CardTitle>
            <CardDescription>{t("staffInvitation.addedAsRole", { role: roleName })}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailMismatch = user?.email?.toLowerCase() !== invitation.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{t("staffInvitation.staffInvitation")}</CardTitle>
          <CardDescription>{t("staffInvitation.invitedToJoin", { hospital: hospitalName })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("staffInvitation.hospital")}</span>
              <span className="font-medium">{hospitalName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("staffInvitation.role")}</span>
              <Badge variant="secondary" className="capitalize">{roleName}</Badge>
            </div>
            {invitation.department && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t("staffInvitation.department")}</span>
                <span className="font-medium">{invitation.department}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t("staffInvitation.invitedEmail")}</span>
              <span className="font-medium text-sm">{invitation.email}</span>
            </div>
          </div>

          {emailMismatch && (
            <div className="rounded-lg bg-destructive/10 p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{t("staffInvitation.emailMismatch")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("staffInvitation.emailMismatchDesc", { currentEmail: user?.email, invitedEmail: invitation.email })}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate("/hospitals")}>{t("staffInvitation.decline")}</Button>
            <Button className="flex-1" onClick={handleAccept} disabled={acceptInvitation.isPending || emailMismatch}>
              {acceptInvitation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("staffInvitation.accepting")}</>
              ) : (
                t("staffInvitation.acceptInvitation")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
