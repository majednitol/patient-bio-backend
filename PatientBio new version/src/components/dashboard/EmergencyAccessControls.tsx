import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Shield, Clock, Lock, Unlock, QrCode, Loader2,
} from "lucide-react";
import { useEmergencyAccess } from "@/hooks/useEmergencyAccess";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

interface EmergencyAccessControlsProps {
  showQRCode?: boolean;
}

export const EmergencyAccessControls = ({ showQRCode = true }: EmergencyAccessControlsProps) => {
  const { t } = useTranslation();
  const {
    activeToken, hasActiveEmergencyAccess, isLoading, isCreating,
    createToken, revokeToken, getRemainingTime,
  } = useEmergencyAccess();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [duration, setDuration] = useState("30");
  const [accessLevel, setAccessLevel] = useState<"critical_only" | "full">("critical_only");
  const [usePIN, setUsePIN] = useState(false);
  const [pin, setPIN] = useState("");

  const handleEnableEmergencyAccess = () => {
    createToken(
      { duration_minutes: parseInt(duration), access_level: accessLevel, pin: usePIN && pin.length >= 4 ? pin : undefined },
      { onSuccess: () => { setDialogOpen(false); setPIN(""); } }
    );
  };

  const handleDisableEmergencyAccess = () => {
    if (activeToken) revokeToken(activeToken.id);
  };

  const emergencyQRValue = activeToken ? `patientbio:emergency:${activeToken.emergency_token}` : null;

  if (isLoading) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={hasActiveEmergencyAccess ? "border-destructive/50 bg-destructive/5" : "border-warning/50"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${hasActiveEmergencyAccess ? "text-destructive" : "text-warning"}`} />
            <CardTitle className="text-base">{t("emergencyAccess.title")}</CardTitle>
          </div>
          {hasActiveEmergencyAccess && activeToken && (
            <Badge variant="destructive" className="animate-pulse">
              <Clock className="h-3 w-3 mr-1" />
              {getRemainingTime(activeToken)}
            </Badge>
          )}
        </div>
        <CardDescription>
          {hasActiveEmergencyAccess ? t("emergencyAccess.activeDesc") : t("emergencyAccess.inactiveDesc")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasActiveEmergencyAccess && activeToken ? (
          <>
            {showQRCode && emergencyQRValue && (
              <div className="flex flex-col items-center py-4">
                <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-destructive/30">
                  <QRCodeSVG value={emergencyQRValue} size={180} level="H" bgColor="#ffffff" fgColor="#dc2626" />
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center">{t("emergencyAccess.scanCode")}</p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("emergencyAccess.accessLevel")}</span>
                <Badge variant={activeToken.access_level === "full" ? "destructive" : "secondary"}>
                  {activeToken.access_level === "full" ? t("emergencyAccess.fullAccess") : t("emergencyAccess.criticalOnly")}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("emergencyAccess.pinProtected")}</span>
                {activeToken.emergency_pin_hash ? <Lock className="h-4 w-4 text-primary" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
              </div>
              {activeToken.access_count > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("emergencyAccess.timesAccessed")}</span>
                  <span className="font-medium">{activeToken.access_count}</span>
                </div>
              )}
            </div>

            <Button variant="destructive" className="w-full" onClick={handleDisableEmergencyAccess}>
              <Shield className="h-4 w-4 mr-2" />
              {t("emergencyAccess.disableAccess")}
            </Button>
          </>
        ) : (
          <>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-warning text-warning hover:bg-warning hover:text-warning-foreground">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t("emergencyAccess.enableAccess")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    {t("emergencyAccess.enableTitle")}
                  </DialogTitle>
                  <DialogDescription>{t("emergencyAccess.enableDesc")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t("emergencyAccess.accessDuration")}</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">{t("emergencyAccess.minutes15")}</SelectItem>
                        <SelectItem value="30">{t("emergencyAccess.minutes30")}</SelectItem>
                        <SelectItem value="60">{t("emergencyAccess.hour1")}</SelectItem>
                        <SelectItem value="240">{t("emergencyAccess.hours4")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("emergencyAccess.informationShared")}</Label>
                    <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as "critical_only" | "full")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical_only">{t("emergencyAccess.criticalOnlyDesc")}</SelectItem>
                        <SelectItem value="full">{t("emergencyAccess.fullAccessDesc")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>{t("emergencyAccess.pinProtection")}</Label>
                        <p className="text-xs text-muted-foreground">{t("emergencyAccess.requirePin")}</p>
                      </div>
                      <Switch checked={usePIN} onCheckedChange={setUsePIN} />
                    </div>
                    {usePIN && (
                      <Input type="password" placeholder={t("emergencyAccess.enterPin")} maxLength={6} value={pin}
                        onChange={(e) => setPIN(e.target.value.replace(/\D/g, ""))} className="font-mono text-center tracking-widest" />
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button onClick={handleEnableEmergencyAccess} disabled={isCreating || (usePIN && pin.length < 4)}
                    className="bg-warning text-warning-foreground hover:bg-warning/90">
                    {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                    {t("emergencyAccess.enableAccess")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium">{t("emergencyAccess.whatRespondersWillSee")}</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>{t("emergencyAccess.bloodTypeAllergies")}</li>
                <li>{t("emergencyAccess.currentMedications")}</li>
                <li>{t("emergencyAccess.emergencyContactInfo")}</li>
                <li>{t("emergencyAccess.chronicConditions")}</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};