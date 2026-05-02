import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, User, Droplets, Upload, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface WelcomeWizardProps {
  open: boolean;
  onClose: () => void;
}

export const WelcomeWizard = ({ open, onClose }: WelcomeWizardProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const steps = [
    { icon: User, title: t("welcomeWizard.stepNameTitle"), description: t("welcomeWizard.stepNameDesc") },
    { icon: Droplets, title: t("welcomeWizard.stepBloodTitle"), description: t("welcomeWizard.stepBloodDesc") },
    { icon: Upload, title: t("welcomeWizard.stepUploadTitle"), description: t("welcomeWizard.stepUploadDesc") },
  ];

  const handleNext = async () => {
    if (step === 0 && displayName.trim()) {
      setSaving(true);
      try {
        await supabase
          .from("user_profiles")
          .update({ display_name: displayName.trim() })
          .eq("id", user?.id);
      } catch (error) {
        toast({ title: t("welcomeWizard.failedSaveName"), description: t("welcomeWizard.tryAgain"), variant: "destructive" });
      }
      setSaving(false);
    }

    if (step === 1 && bloodGroup) {
      setSaving(true);
      try {
        const { data } = await supabase
          .from("health_data")
          .select("id")
          .eq("user_id", user?.id ?? "")
          .maybeSingle();

        if (data) {
          await supabase.from("health_data").update({ blood_group: bloodGroup }).eq("user_id", user?.id);
        } else {
          await supabase.from("health_data").insert({ user_id: user?.id!, blood_group: bloodGroup });
        }
      } catch (error) {
        toast({ title: t("welcomeWizard.failedSaveBlood"), description: t("welcomeWizard.tryAgain"), variant: "destructive" });
      }
      setSaving(false);
    }

    if (step === 2) {
      onClose();
      navigate("/dashboard/upload");
      return;
    }

    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const StepIcon = steps[step].icon;

  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-6 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">{t("welcomeWizard.welcome")}</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <StepIcon className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">{steps[step].title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{steps[step].description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 py-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {step === 0 && (
            <div className="space-y-2">
              <Label htmlFor="wizard-name">{t("welcomeWizard.displayName")}</Label>
              <Input
                id="wizard-name"
                placeholder={t("welcomeWizard.namePlaceholder")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <Label>{t("welcomeWizard.bloodGroup")}</Label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger>
                  <SelectValue placeholder={t("welcomeWizard.selectBloodGroup")} />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {step === 2 && (
            <p className="text-sm text-muted-foreground text-center">
              {t("welcomeWizard.uploadPrompt")}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="ghost" className="flex-1" onClick={handleSkip}>
              {t("welcomeWizard.skip")}
            </Button>
            <Button className="flex-1" onClick={handleNext} disabled={saving}>
              {step === 2 ? (
                <>{t("welcomeWizard.uploadRecord")} <ArrowRight className="ml-1 h-4 w-4" /></>
              ) : (
                <>{t("common.next")} <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};