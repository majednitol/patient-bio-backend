import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, ExternalLink, Shield } from "lucide-react";
import { useSmartLaunch } from "@/hooks/useSmartLaunch";
import { useAuth } from "@/contexts/AuthContext";

const SmartLaunchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { initiateLaunch, session, isLoading } = useSmartLaunch();
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth_required">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const launchToken = searchParams.get("launch");
  const issuer = searchParams.get("iss");
  const scope = searchParams.get("scope");
  const redirectUri = searchParams.get("redirect_uri");
  const clientId = searchParams.get("client_id");

  useEffect(() => {
    const handleLaunch = async () => {
      if (authLoading) return;
      if (!user) { setStatus("auth_required"); return; }
      if (!issuer) { setStatus("error"); setErrorMessage("Missing required SMART launch parameter (iss)"); return; }

      try {
        await initiateLaunch({
          iss: issuer,
          launch: launchToken || undefined,
          clientId: clientId || "patient-bio-app",
          scope: scope || undefined,
          redirectUri: redirectUri || undefined,
        });
        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message || "Failed to complete SMART launch");
      }
    };
    handleLaunch();
  }, [authLoading, user, launchToken, issuer, scope, redirectUri, clientId, initiateLaunch]);

  const handleLogin = () => {
    if (issuer) {
      sessionStorage.setItem("smart_launch_params", JSON.stringify({ launchToken, issuer, scope, redirectUri, clientId }));
    }
    navigate("/auth");
  };

  if (authLoading || status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">{t("smartLaunch.connectingToEHR")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("smartLaunch.establishingConnection")}</p>
              </div>
              {issuer && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span className="font-mono">{issuer}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "auth_required") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-amber-500" />
            </div>
            <CardTitle>{t("smartLaunch.authRequired")}</CardTitle>
            <CardDescription>{t("smartLaunch.authRequiredDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <ExternalLink className="h-4 w-4" />
              <AlertTitle>{t("smartLaunch.ehrIntegration")}</AlertTitle>
              <AlertDescription>{t("smartLaunch.ehrIntegrationDesc")}</AlertDescription>
            </Alert>
            <Button onClick={handleLogin} className="w-full">{t("smartLaunch.signInToContinue")}</Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">{t("smartLaunch.returnHome")}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>{t("smartLaunch.launchFailed")}</CardTitle>
            <CardDescription>{t("smartLaunch.launchFailedDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>{t("smartLaunch.errorDetails")}</AlertTitle>
              <AlertDescription>{errorMessage || "Unknown error occurred"}</AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>{t("smartLaunch.issuer")}:</strong> {issuer || t("smartLaunch.notProvided")}</p>
              <p><strong>{t("smartLaunch.launchToken")}:</strong> {launchToken ? t("smartLaunch.provided") : t("smartLaunch.missing")}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/")} className="flex-1">{t("smartLaunch.returnHome")}</Button>
              <Button onClick={() => window.location.reload()} className="flex-1">{t("smartLaunch.retry")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t("smartLaunch.connectedSuccessfully")}</CardTitle>
          <CardDescription>{t("smartLaunch.connectedSuccessfullyDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>{t("smartLaunch.sessionActive")}</AlertTitle>
            <AlertDescription>{t("smartLaunch.sessionActiveDesc")}</AlertDescription>
          </Alert>

          {session && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("smartLaunch.ehrSystem")}</span>
                <span className="font-medium font-mono text-xs">
                  {session.ehr_url ? new URL(session.ehr_url).hostname : t("smartLaunch.unknown")}
                </span>
              </div>
              {session.patient_context && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("smartLaunch.patientContext")}</span>
                  <span className="font-medium">{t("smartLaunch.linked")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("smartLaunch.sessionExpires")}</span>
                <span className="font-medium">
                  {session.expires_at ? new Date(session.expires_at).toLocaleTimeString() : t("smartLaunch.unknown")}
                </span>
              </div>
            </div>
          )}

          <Button onClick={() => navigate("/dashboard")} className="w-full">{t("smartLaunch.continueToDashboard")}</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartLaunchPage;
