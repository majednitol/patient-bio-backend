import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Check, X } from "lucide-react";
import { useSmartInstallEligible } from "@/hooks/useSmartInstallTrigger";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return true;
    }
    return false;
  };

  return { isInstallable, isInstalled, promptInstall };
};

export const InstallPromptBanner = () => {
  const { t } = useTranslation();
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const eligible = useSmartInstallEligible();

  useEffect(() => {
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (isInstalled || dismissed || !isInstallable || !eligible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:bottom-6 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-bottom-4">
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-sm">{t("installPage.bannerTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("installPage.bannerDesc")}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={promptInstall} className="h-8">
                  <Download className="mr-1.5 h-3.5 w-3.5" />{t("installPage.install")}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8">{t("installPage.notNow")}</Button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const InstallPage = () => {
  const { t } = useTranslation();
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-2xl overflow-hidden w-20 h-20 shadow-lg">
            <img src="/pwa-192x192.png" alt="Patient Bio" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl">{t("installPage.installApp")}</CardTitle>
          <CardDescription>{t("installPage.quickAccess")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium text-lg">{t("installPage.alreadyInstalled")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("installPage.alreadyInstalledDesc")}</p>
              </div>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">{t("installPage.iosInstructions")}</p>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">1</span>
                  <span dangerouslySetInnerHTML={{ __html: t("installPage.iosStep1") }} />
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">2</span>
                  <span dangerouslySetInnerHTML={{ __html: t("installPage.iosStep2") }} />
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">3</span>
                  <span dangerouslySetInnerHTML={{ __html: t("installPage.iosStep3") }} />
                </li>
              </ol>
            </div>
          ) : isInstallable ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">{t("installPage.benefits")}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{t("installPage.benefit1")}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{t("installPage.benefit2")}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{t("installPage.benefit3")}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{t("installPage.benefit4")}</li>
                </ul>
              </div>
              <Button onClick={promptInstall} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />{t("installPage.installNow")}
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">{t("installPage.openInBrowser")}</p>
              <p className="text-xs text-muted-foreground">{t("installPage.browserHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPage;
