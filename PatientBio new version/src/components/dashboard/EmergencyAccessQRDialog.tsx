import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  AlertTriangle,
  Shield,
  Clock,
  Lock,
  Unlock,
  QrCode,
  Loader2,
} from "lucide-react";
import { useEmergencyAccess } from "@/hooks/useEmergencyAccess";
import { LazyQRCode } from "@/components/shared/LazyQRCode";

interface EmergencyAccessQRDialogProps {
  trigger?: React.ReactNode;
}

export const EmergencyAccessQRDialog = ({ trigger }: EmergencyAccessQRDialogProps) => {
  const {
    activeToken,
    hasActiveEmergencyAccess,
    isLoading,
    isCreating,
    createToken,
    revokeToken,
    getRemainingTime,
  } = useEmergencyAccess();

  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState("30");
  const [accessLevel, setAccessLevel] = useState<"critical_only" | "full">("critical_only");
  const [usePIN, setUsePIN] = useState(false);
  const [pin, setPIN] = useState("");

  const handleEnable = () => {
    createToken(
      {
        duration_minutes: parseInt(duration),
        access_level: accessLevel,
        pin: usePIN && pin.length >= 4 ? pin : undefined,
      },
      { onSuccess: () => setPIN("") }
    );
  };

  const emergencyQRValue = activeToken
    ? `patientbio:emergency:${activeToken.emergency_token}`
    : null;

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
    >
      <QrCode className="h-3.5 w-3.5" />
      Emergency QR
    </Button>
  );

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger || defaultTrigger}</span>
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Emergency Access QR
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Generate a time-limited QR code for first responders to access your critical health data.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : hasActiveEmergencyAccess && activeToken ? (
          <div className="space-y-4">
            {/* Active QR */}
            {emergencyQRValue && (
              <div className="flex flex-col items-center py-2">
                <div className="bg-white p-4 rounded-xl shadow-lg border-4 border-destructive/30">
                  <LazyQRCode
                    value={emergencyQRValue}
                    size={180}
                    level="H"
                    fgColor="#dc2626"
                  />
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-center">
              <Badge variant="destructive" className="animate-pulse">
                <Clock className="h-3 w-3 mr-1" />
                {getRemainingTime(activeToken)}
              </Badge>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Access Level:</span>
                <Badge variant={activeToken.access_level === "full" ? "destructive" : "secondary"}>
                  {activeToken.access_level === "full" ? "Full Access" : "Critical Only"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PIN Protected:</span>
                {activeToken.emergency_pin_hash ? (
                  <Lock className="h-4 w-4 text-primary" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {activeToken.access_count > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Times Accessed:</span>
                  <span className="font-medium">{activeToken.access_count}</span>
                </div>
              )}
            </div>

            <ResponsiveDialogFooter>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => revokeToken(activeToken.id)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Disable Emergency Access
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Duration */}
            <div className="space-y-2">
              <Label>Access Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Access Level */}
            <div className="space-y-2">
              <Label>Information Shared</Label>
              <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as "critical_only" | "full")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical_only">
                    Critical Only (Blood type, allergies, meds)
                  </SelectItem>
                  <SelectItem value="full">
                    Full Access (Includes conditions & history)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PIN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>PIN Protection</Label>
                  <p className="text-xs text-muted-foreground">Require a 4-digit PIN</p>
                </div>
                <Switch checked={usePIN} onCheckedChange={setUsePIN} />
              </div>
              {usePIN && (
                <Input
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPIN(e.target.value.replace(/\D/g, ""))}
                  className="font-mono text-center tracking-widest"
                />
              )}
            </div>

            <ResponsiveDialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleEnable}
                disabled={isCreating || (usePIN && pin.length < 4)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Generate QR Code
              </Button>
            </ResponsiveDialogFooter>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
    </>
  );
};
