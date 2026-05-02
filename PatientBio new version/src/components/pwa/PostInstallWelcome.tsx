import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WifiOff, Bell, Smartphone, CheckCircle } from "lucide-react";

const INSTALL_WELCOME_KEY = "pb_post_install_shown";

export function PostInstallWelcome() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const wasShown = localStorage.getItem(INSTALL_WELCOME_KEY);
    if (isStandalone && !wasShown) {
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(INSTALL_WELCOME_KEY, "true");
  };

  const features = [
    {
      icon: WifiOff,
      titleKey: "pwa.featureOffline",
      descKey: "pwa.featureOfflineDesc",
    },
    {
      icon: Bell,
      titleKey: "pwa.featurePush",
      descKey: "pwa.featurePushDesc",
    },
    {
      icon: Smartphone,
      titleKey: "pwa.featureQuick",
      descKey: "pwa.featureQuickDesc",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-6 w-6 text-primary" />
            <DialogTitle className="text-lg">{t("pwa.welcomeTitle")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("pwa.welcomeDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {features.map((f) => (
            <div key={f.titleKey} className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{t(f.titleKey)}</p>
                <p className="text-xs text-muted-foreground">{t(f.descKey)}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleClose} className="w-full">
          {t("pwa.getStarted")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
