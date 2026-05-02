import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getRoleBasedRedirectPath } from "@/hooks/useRoleBasedRedirect";
import { useToast } from "@/hooks/use-toast";

type VerificationStatus = "verifying" | "success" | "error" | "pending";

const VerifyEmailPage = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  // Pre-fill resend email from navigation state (passed from PortalAuthPage)
  const locationState = window.history.state?.usr;
  useEffect(() => {
    if (locationState?.email && !resendEmail) {
      setResendEmail(locationState.email);
    }
  }, [locationState]);

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      // Accept both "email" and "signup" OTP types
      if (token_hash && (type === "email" || type === "signup")) {
        setStatus("verifying");
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as "email" | "signup",
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message || "Failed to verify email. The link may have expired.");
        } else {
          setStatus("success");
          setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const path = await getRoleBasedRedirectPath(user.id);
              navigate(`${path}?firstLogin=true`);
            } else {
              navigate("/dashboard?firstLogin=true");
            }
          }, 2000);
        }
      }
    };
    handleEmailConfirmation();
  }, [searchParams, navigate]);

  useEffect(() => {
    const redirectVerifiedUser = async () => {
      if (!loading && user?.email_confirmed_at) {
        const path = await getRoleBasedRedirectPath(user.id);
        navigate(path);
      }
    };
    redirectVerifiedUser();
  }, [user, loading, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (!resendEmail.trim()) {
      toast({ title: t("verifyEmail.emailRequired"), description: t("verifyEmail.emailRequiredDesc"), variant: "destructive" });
      return;
    }

    setIsResending(true);
    
    // Try custom Resend edge function first
    const redirectTo = `${window.location.origin}/verify-email`;
    const { error: fnError } = await supabase.functions.invoke("send-verification-email", {
      body: { email: resendEmail, redirectTo },
    });

    if (fnError) {
      console.warn("Custom verification email failed, falling back to default:", fnError);
      // Fallback to built-in
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: resendEmail,
        options: { emailRedirectTo: redirectTo },
      });
      setIsResending(false);
      if (error) {
        toast({ title: t("verifyEmail.failedToResend"), description: error.message, variant: "destructive" });
        return;
      }
    } else {
      setIsResending(false);
    }

    setResendCooldown(60);
    toast({ title: t("verifyEmail.emailSent"), description: t("verifyEmail.emailSentDesc") });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={patientBioLogo} alt="Patient Bio" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-bold">Patient Bio</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-8 shadow-xl text-center">
          {status === "verifying" && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("verifyEmail.verifyingEmail")}</h2>
              <p className="text-muted-foreground">{t("verifyEmail.pleaseWait")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("verifyEmail.emailVerified")}</h2>
              <p className="text-muted-foreground mb-6">{t("verifyEmail.emailVerifiedDesc")}</p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("verifyEmail.verificationFailed")}</h2>
              <p className="text-muted-foreground mb-6">{errorMessage}</p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/auth">{t("verifyEmail.backToSignIn")}</Link>
                </Button>
              </div>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("verifyEmail.checkYourEmail")}</h2>
              <p className="text-muted-foreground mb-6">{t("verifyEmail.checkYourEmailDesc")}</p>

              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium mb-3">{t("verifyEmail.didntReceive")}</p>
                <div className="flex gap-2">
                  <Input type="email" placeholder={t("verifyEmail.enterYourEmail")} value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} className="flex-1" />
                  <Button onClick={handleResendEmail} disabled={isResending || resendCooldown > 0} size="sm" className="shrink-0">
                    {isResending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : resendCooldown > 0 ? (
                      `${resendCooldown}s`
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-1" />{t("verifyEmail.resend")}</>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t("verifyEmail.checkSpam")}</p>
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">{t("verifyEmail.backToSignIn")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
