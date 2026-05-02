import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { updatePassword, session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      toast({ title: t("resetPassword.invalidLink"), description: t("resetPassword.invalidLinkDesc"), variant: "destructive" });
      navigate("/auth");
    }
  }, [session, loading, navigate, toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const passwordResult = passwordSchema.safeParse(formData.password);
    if (!passwordResult.success) {
      toast({ title: t("resetPassword.invalidPassword"), description: passwordResult.error.errors[0].message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: t("resetPassword.passwordsDontMatch"), description: t("resetPassword.passwordsDontMatchDesc"), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await updatePassword(formData.password);
      if (error) {
        toast({ title: t("resetPassword.updateFailed"), description: error.message || t("resetPassword.updateFailedDesc"), variant: "destructive" });
      } else {
        setIsSuccess(true);
        toast({ title: t("resetPassword.passwordUpdated"), description: t("resetPassword.passwordUpdatedDesc") });
      }
    } catch (err) {
      toast({ title: t("common.error"), description: t("resetPassword.unexpectedError"), variant: "destructive" });
    }

    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 justify-center mb-6 sm:mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={patientBioLogo} alt="Patient Bio" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-bold">Patient Bio</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-6 sm:p-8 shadow-xl">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">{t("resetPassword.passwordUpdated")}</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">{t("resetPassword.successMessage")}</p>
              <Button onClick={() => navigate("/")} className="w-full bg-gradient-to-r from-primary to-secondary border-0">
                {t("resetPassword.continueToDashboard")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">{t("resetPassword.setNewPassword")}</h2>
                <p className="text-sm sm:text-base text-muted-foreground">{t("resetPassword.enterNewPassword")}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">{t("resetPassword.newPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="password" name="password" type="password" placeholder="••••••••" className="pl-10 h-11" value={formData.password} onChange={handleChange} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm">{t("resetPassword.confirmNewPassword")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" className="pl-10 h-11" value={formData.confirmPassword} onChange={handleChange} required />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-primary to-secondary border-0" disabled={isLoading}>
                  {isLoading ? t("resetPassword.updating") : t("resetPassword.updatePassword")}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6">
          {t("resetPassword.rememberPassword")}{" "}
          <Link to="/auth" className="text-primary hover:underline">{t("resetPassword.signIn")}</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
