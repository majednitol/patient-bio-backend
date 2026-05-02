import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Share } from "lucide-react";
import { useSmartInstallEligible } from "@/hooks/useSmartInstallTrigger";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "patient-pwa-install-dismissed";

function getIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export const PatientPWAInstallBanner = React.memo(function PatientPWAInstallBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const eligible = useSmartInstallEligible();
  const isIOS = getIsIOS();

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    if (localStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }
    if (!isIOS) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, [isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions((v) => !v);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "true");
  };

  // Show banner on iOS (no deferredPrompt needed) or when deferredPrompt is available
  const canShow = isIOS || !!deferredPrompt;

  if (isInstalled || dismissed || !canShow || !eligible) return null;

  return (
    <Card className="border-primary/20 bg-primary/5 sm:hidden animate-fade-in">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t("pwa.installTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("pwa.installDesc")}</p>
          </div>
          <Button size="sm" onClick={handleInstall} className="shrink-0 h-8 text-xs">
            {t("pwa.install")}
          </Button>
          <button onClick={handleDismiss} className="p-1.5 text-muted-foreground hover:text-foreground touch-target">
            <X className="h-4 w-4" />
          </button>
        </div>
        {isIOS && showIOSInstructions && (
          <div className="mt-2 p-2.5 rounded-lg bg-muted/60 text-xs text-muted-foreground space-y-1.5 animate-fade-in">
            <p className="font-medium text-foreground">{t("installPage.iosInstructions", "To install this app:")}</p>
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Tap <Share className="inline h-3.5 w-3.5 align-text-bottom" /> <strong>Share</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Scroll down &amp; tap <strong>"Add to Home Screen"</strong></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
