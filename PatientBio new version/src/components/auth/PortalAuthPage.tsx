import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle2,
  AlertCircle, Eye, EyeOff, Loader2,
} from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useResendVerification } from "@/hooks/useResendVerification";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { lovable } from "@/integrations/lovable";

import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { BiometricLoginButton } from "@/components/auth/BiometricLoginButton";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { PortalAuthConfig } from "./portalAuthConfig";

const emailSchema = z.string().trim().email("Please enter a valid email address").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(128);

type AuthView = "login" | "signup" | "forgot-password";

interface Props {
  config: PortalAuthConfig;
}

export default function PortalAuthPage({ config }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, resetPassword, loading } = useAuth();
  const { signIn, signUp, validatePortalAccess, assignPortalRole } = usePortalAuth(config.portalType);
  const { resendVerificationEmail, isResending, canResend } = useResendVerification();

  const [view, setView] = useState<AuthView>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [showInvalidCredentialsHelp, setShowInvalidCredentialsHelp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Handle authenticated user redirect (including OAuth callback)
  useEffect(() => {
    if (!loading && user) {
      // Check if user needs role assignment (OAuth callback)
      const handleOAuthCallback = async () => {
        const { valid } = await validatePortalAccess(user.id);
        if (!valid) {
          // New OAuth user — assign portal role
          const { error } = await assignPortalRole(user.id);
          if (error) {
            toast({ title: "Role Assignment Failed", description: error.message, variant: "destructive" });
            return;
          }
        }
        config.onLoginRedirect(user.id, navigate);
      };
      handleOAuthCallback();
    }
  }, [user, loading, navigate, config]);

  const handleResendVerification = async () => {
    const { error } = await resendVerificationEmail(unverifiedEmail);
    if (error) {
      toast({ title: t("authPage.failedToResend", "Failed to Resend"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("authPage.verificationEmailSent", "Verification Email Sent"), description: t("authPage.checkInboxForLink", "Please check your inbox for the verification link.") });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowInvalidCredentialsHelp(false);

    const emailResult = emailSchema.safeParse(formData.email);
    if (!emailResult.success) {
      toast({ title: t("authPage.invalidEmail", "Invalid Email"), description: emailResult.error.errors[0].message, variant: "destructive" });
      setIsLoading(false);
      return;
    }
    const email = emailResult.data;

    // Forgot password
    if (view === "forgot-password") {
      try {
        const { error } = await resetPassword(email);
        if (error) {
          toast({ title: t("authPage.resetFailed", "Reset Failed"), description: error.message, variant: "destructive" });
        } else {
          setResetEmailSent(true);
          toast({ title: t("authPage.checkYourEmail", "Check your email"), description: t("authPage.weSentResetLink", "We've sent you a password reset link.") });
        }
      } catch {
        toast({ title: t("common.error", "Error"), description: t("authPage.unexpectedError", "An unexpected error occurred."), variant: "destructive" });
      }
      setIsLoading(false);
      return;
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(formData.password);
    if (!passwordResult.success) {
      toast({ title: t("authPage.invalidPassword", "Invalid Password"), description: passwordResult.error.errors[0].message, variant: "destructive" });
      setIsLoading(false);
      return;
    }

    if (view === "signup" && formData.password !== formData.confirmPassword) {
      toast({ title: t("common.error", "Error"), description: t("authPage.passwordsDoNotMatch", "Passwords do not match."), variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      if (view === "login") {
        const { error } = await signIn(email, formData.password);
        if (error) {
          let message = t("authPage.signInError", "An error occurred during sign in.");
          if (error.message.includes("Invalid login credentials")) {
            message = t("authPage.invalidCredentials", "Invalid email or password. Please try again.");
            setShowInvalidCredentialsHelp(true);
          } else if (error.message.includes("Email not confirmed")) {
            message = t("authPage.emailNotConfirmed", "Please verify your email address before signing in.");
            setUnverifiedEmail(email);
            setShowResendVerification(true);
          } else if (error.message.toLowerCase().includes("too many requests") || error.message.toLowerCase().includes("rate limit")) {
            message = t("authPage.rateLimited", "Too many attempts. Please wait a moment and try again.");
          } else if (error.message.includes("registered for the")) {
            message = error.message;
          } else {
            setShowResendVerification(false);
          }
          toast({ title: t("authPage.signInFailed", "Sign In Failed"), description: message, variant: "destructive" });
        } else {
          setShowResendVerification(false);
          if (navigator.vibrate) navigator.vibrate(50);
          toast({ title: t("authPage.welcomeBackToast", "Welcome back!"), description: t("authPage.successfullySignedIn", "You have successfully signed in.") });
        }
      } else {
      const { error } = await signUp(email, formData.password, formData.name || undefined);
        if (error) {
          let message = t("authPage.signUpError", "An error occurred during sign up.");
          if (error.message.includes("User already registered")) {
            message = t("authPage.emailAlreadyRegistered", "This email is already registered. Please sign in instead.");
          } else if (error.message.includes("Password")) {
            message = error.message;
          }
          toast({ title: t("authPage.signUpFailed", "Sign Up Failed"), description: message, variant: "destructive" });
        } else {
          if (navigator.vibrate) navigator.vibrate(50);
          toast({ title: t("authPage.welcome", "Welcome!"), description: t("authPage.accountCreated", "Your account has been created successfully.") });
          // Auto-confirmed: the onAuthStateChange listener will trigger redirect
        }
      }
    } catch {
      toast({ title: t("common.error", "Error"), description: t("authPage.unexpectedError", "An unexpected error occurred."), variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === "email") {
      setShowResendVerification(false);
      setShowInvalidCredentialsHelp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-muted-foreground">{t("authPage.redirecting", "Redirecting to your dashboard...")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Left Panel - Branding */}
      <div className={`hidden lg:flex lg:w-1/2 ${config.gradient} p-12 flex-col justify-between relative overflow-hidden`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("authPage.backToHome", "Back to home")}
          </Link>
          <div className="flex items-center gap-3 mt-8">
            <img src={patientBioLogo} alt="Patient Bio" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-bold text-white">{config.portalName}</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            {config.headline.map((line, i) => (
              <span key={i}>
                {line}
                {i < config.headline.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="text-white/80 text-lg max-w-md">{config.description}</p>
        </div>

        <div className="relative z-10 flex gap-8 text-white/80 text-sm">
          {config.stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden mb-4 sm:mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm mb-4">
              <ArrowLeft className="h-4 w-4" />
              {t("authPage.backToHome", "Back to home")}
            </Link>
            <div className="flex items-center gap-2.5 justify-center">
              <img src={patientBioLogo} alt="Patient Bio" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover" />
              <span className="text-lg sm:text-xl font-bold">{config.portalName}</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5 sm:p-8 shadow-xl">
            {/* Forgot Password */}
            {view === "forgot-password" ? (
              <ForgotPasswordView
                resetEmailSent={resetEmailSent}
                email={formData.email}
                isLoading={isLoading}
                onBack={() => { setView("login"); setResetEmailSent(false); }}
                onRetry={() => setResetEmailSent(false)}
                onSubmit={handleSubmit}
                onChange={handleChange}
                placeholder={config.emailPlaceholder}
              />
            ) : (
              <>
                {/* Title */}
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">
                    {view === "login" ? config.loginTitle : config.signupTitle}
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {view === "login" ? config.loginSubtitle : config.signupSubtitle}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name field (signup only, patient only) */}
                  {view === "signup" && config.portalType === "patient" && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">{t("authPage.fullName", "Full Name")}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="name" name="name" placeholder="John Doe" className="pl-10 h-11" value={formData.name} onChange={handleChange} />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">{t("authPage.email", "Email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="email" name="email" type="email" placeholder={config.emailPlaceholder} className="pl-10 h-11" value={formData.email} onChange={handleChange} required autoFocus autoComplete="email" />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm">{t("authPage.password", "Password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11" value={formData.password} onChange={handleChange} required autoComplete={view === "login" ? "current-password" : "new-password"} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Meter */}
                  {view === "signup" && <PasswordStrengthMeter password={formData.password} />}

                  {/* Confirm Password */}
                  {view === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm">{t("authPage.confirmPassword", "Confirm Password")}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className="pl-10 pr-10 h-11" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Remember Me + Forgot Password */}
                  {view === "login" && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} />
                        <span className="text-sm text-muted-foreground">{t("authPage.rememberMe", "Remember me")}</span>
                      </label>
                      <button type="button" onClick={() => { setView("forgot-password"); setResetEmailSent(false); }} className="text-sm text-primary hover:underline">
                        {t("authPage.forgotPassword", "Forgot password?")}
                      </button>
                    </div>
                  )}

                  {/* Submit */}
                  <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-primary to-secondary border-0" disabled={isLoading}>
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("authPage.pleaseWait", "Please wait...")}</>
                    ) : (
                      <>
                        {view === "login" ? t("authPage.signIn", "Sign In") : t("authPage.createAccount", "Create Account")}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  {/* Biometric Login */}
                  {view === "login" && (
                    <div className="mt-3">
                      <BiometricLoginButton
                        onAuthenticate={async () => {
                          toast({ title: "Biometric verified", description: "Please sign in with your credentials." });
                          return true;
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </form>

                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t("authPage.orContinueWith", "or continue with")}</span>
                  </div>
                </div>

                {/* Google Sign-In */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || isGoogleLoading}
                  onClick={async () => {
                    setIsGoogleLoading(true);
                    try {
                      const { error } = await lovable.auth.signInWithOAuth("google", {
                        redirect_uri: window.location.origin + config.authPath,
                      });
                      if (error) {
                        toast({ title: t("authPage.googleSignInFailed", "Google Sign-In Failed"), description: error.message, variant: "destructive" });
                      }
                    } catch {
                      toast({ title: t("common.error", "Error"), description: t("authPage.unexpectedError", "An unexpected error occurred."), variant: "destructive" });
                    }
                    setIsGoogleLoading(false);
                  }}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {t("authPage.continueWithGoogle", "Continue with Google")}
                </Button>

                {/* Resend Verification */}
                {view === "login" && showResendVerification && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="mb-2 text-sm text-foreground">{t("authPage.emailNotVerified", "Your email hasn't been verified yet.")}</p>
                        <Button type="button" variant="outline" size="sm" onClick={handleResendVerification} disabled={isResending || !canResend}>
                          {isResending ? t("authPage.sending", "Sending...") : t("authPage.resendVerification", "Resend Verification Email")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invalid Credentials Help */}
                {view === "login" && showInvalidCredentialsHelp && (
                  <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                    <p className="text-sm font-medium text-foreground">{t("authPage.cantSignIn", "Can't sign in?")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("authPage.cantSignInDesc", "Try creating an account or resetting your password.")}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {config.allowSignup && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setView("signup")}>
                          {t("authPage.goToSignUp", "Go to Sign Up")}
                        </Button>
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => { setView("forgot-password"); setResetEmailSent(false); }}>
                        {t("authPage.resetPasswordBtn", "Reset Password")}
                      </Button>
                    </div>
                  </div>
                )}


                {/* Toggle login/signup */}
                {config.allowSignup ? (
                  <div className="mt-6 text-center text-sm">
                    <span className="text-muted-foreground">
                      {view === "login" ? t("authPage.dontHaveAccount", "Don't have an account? ") : t("authPage.alreadyHaveAccount", "Already have an account? ")}
                    </span>
                    <button type="button" onClick={() => setView(view === "login" ? "signup" : "login")} className="text-primary font-medium hover:underline">
                      {view === "login" ? t("authPage.signUp", "Sign up") : t("authPage.signInLink", "Sign in")}
                    </button>
                  </div>
                ) : config.noAccountMessage ? (
                  <p className="mt-6 text-center text-xs text-muted-foreground">{config.noAccountMessage}</p>
                ) : null}
              </>
            )}
          </div>

          {/* Other Portals */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-muted/30 px-2 text-muted-foreground">{t("authPage.otherPortals", "Other Portals")}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
              {config.otherPortals.map((portal, i) => (
                <span key={portal.path} className="flex items-center gap-2">
                  {i > 0 && <span className="text-muted-foreground">•</span>}
                  <Link to={portal.path} className="text-muted-foreground hover:text-primary transition-colors">{portal.label}</Link>
                </span>
              ))}
            </div>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            {t("authPage.byContining", "By continuing, you agree to our")}{" "}
            <Link to="/terms" className="text-primary hover:underline">{t("authPage.termsOfService", "Terms of Service")}</Link>{" "}
            {t("authPage.and", "and")}
            <Link to="/privacy" className="text-primary hover:underline">{t("authPage.privacyPolicy", "Privacy Policy")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Forgot Password Sub-View ─── */
function ForgotPasswordView({
  resetEmailSent, email, isLoading, onBack, onRetry, onSubmit, onChange, placeholder,
}: {
  resetEmailSent: boolean;
  email: string;
  isLoading: boolean;
  onBack: () => void;
  onRetry: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  const { t } = useTranslation();

  if (resetEmailSent) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-2">{t("authPage.checkYourEmail", "Check your email")}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {t("authPage.resetLinkSent", "We've sent a password reset link to")} <strong>{email}</strong>
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          {t("authPage.didntReceive", "Didn't receive the email?")}{" "}
          <button type="button" onClick={onRetry} className="text-primary hover:underline">{t("authPage.tryAgain", "Try again")}</button>
        </p>
        <Button variant="outline" onClick={onBack} className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("authPage.backToSignIn", "Back to Sign In")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 sm:mb-6">
        <ArrowLeft className="h-4 w-4" />
        {t("authPage.backToSignIn", "Back to Sign In")}
      </button>
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2">{t("authPage.forgotYourPassword", "Forgot your password?")}</h2>
        <p className="text-sm text-muted-foreground">{t("authPage.enterEmailForReset", "Enter your email and we'll send you a reset link")}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm">{t("authPage.email", "Email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input id="email" name="email" type="email" placeholder={placeholder} className="pl-10 h-11" value={email} onChange={onChange} required />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-primary to-secondary border-0" disabled={isLoading}>
          {isLoading ? t("authPage.sending", "Sending...") : t("authPage.sendResetLink", "Send Reset Link")}
        </Button>
      </form>
    </>
  );
}

