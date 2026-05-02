import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Fingerprint, Smartphone, Trash2, Plus, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

export const BiometricSettings = () => {
  const { t } = useTranslation();
  const {
    credentials, loading, registering, isSupported, isPlatformAvailable,
    hasBiometricEnabled, registerCredential, removeCredential,
  } = useBiometricAuth();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRegister = async () => { await registerCredential(); };
  const handleRemove = async (id: string) => { setDeletingId(id); await removeCredential(id); setDeletingId(null); };

  if (loading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 mt-2" /></CardHeader>
        <CardContent className="space-y-4"><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5 text-muted-foreground" />{t("biometric.title")}</CardTitle>
          <CardDescription>{t("biometric.desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">{t("biometric.notSupported")}</p>
              <p className="text-muted-foreground">{t("biometric.notSupportedDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-start gap-2 text-base sm:text-lg">
          <Fingerprint className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <span>{t("biometric.title")}</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">{t("biometric.descFull")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-base">{t("biometric.biometricLogin")}</Label>
            <p className="text-sm text-muted-foreground">
              {hasBiometricEnabled ? t("biometric.signInQuickly") : t("biometric.enableForFaster")}
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasBiometricEnabled && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <ShieldCheck className="h-3 w-3 mr-1" />{t("biometric.active")}
              </Badge>
            )}
            <Switch className="shrink-0" checked={hasBiometricEnabled}
              onCheckedChange={(checked) => { if (checked && !hasBiometricEnabled) handleRegister(); }}
              disabled={registering || !isPlatformAvailable} />
          </div>
        </div>

        {!isPlatformAvailable && (
          <div className="flex items-center gap-3 p-3 bg-muted border border-border rounded-lg">
            <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">{t("biometric.noPlatformAuth")}</p>
          </div>
        )}

        {credentials.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">{t("biometric.registeredDevices")}</Label>
            <div className="space-y-2">
              {credentials.map((credential) => (
                <div key={credential.id} className="flex items-center justify-between gap-2 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{credential.device_name || t("biometric.unknownDevice")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("biometric.added")} {formatDistanceToNow(new Date(credential.created_at), { addSuffix: true })}
                        {credential.last_used_at && (
                          <><br className="sm:hidden" /><span className="hidden sm:inline"> · </span>
                          {t("biometric.lastUsed")} {formatDistanceToNow(new Date(credential.last_used_at), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" disabled={deletingId === credential.id}>
                        {deletingId === credential.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("biometric.removeCredential")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("biometric.removeCredentialDesc", { name: credential.device_name })}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemove(credential.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t("biometric.remove")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBiometricEnabled && isPlatformAvailable && (
          <Button variant="outline" className="w-full" onClick={handleRegister} disabled={registering}>
            {registering ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("biometric.registering")}</>) : (<><Plus className="mr-2 h-4 w-4" />{t("biometric.addAnotherDevice")}</>)}
          </Button>
        )}

        {!hasBiometricEnabled && isPlatformAvailable && (
          <Button className="w-full bg-gradient-to-r from-primary to-secondary border-0" onClick={handleRegister} disabled={registering}>
            {registering ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("biometric.settingUp")}</>) : (<><Fingerprint className="mr-2 h-4 w-4" />{t("biometric.enableBiometric")}</>)}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">{t("biometric.securityNote")}</p>
      </CardContent>
    </Card>
  );
};