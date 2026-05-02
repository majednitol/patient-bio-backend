import { formatDoctorName } from "@/utils/formatDoctorName";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Stethoscope, QrCode, CheckCircle2, AlertCircle } from "lucide-react";
import { useConnectToDoctor } from "@/hooks/useConnectToDoctor";

interface ConnectToDoctorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConnectToDoctorDialog = ({ open, onOpenChange }: ConnectToDoctorDialogProps) => {
  const { t } = useTranslation();
  const [doctorCode, setDoctorCode] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const { lookupDoctor, previewDoctor, previewError, resetPreview, isConnecting } = useConnectToDoctor();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDoctorCode("");
      resetPreview();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, resetPreview]);

  const handleInputChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    setDoctorCode(cleaned);
    resetPreview();
  };

  const handleLookup = async () => {
    if (doctorCode.length !== 8) return;
    setIsLookingUp(true);
    await lookupDoctor(doctorCode);
    setIsLookingUp(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && doctorCode.length === 8 && !isLookingUp) handleLookup();
  };

  const handleClose = () => {
    setDoctorCode("");
    resetPreview();
    onOpenChange(false);
  };

  const isAlreadyConnected = previewError?.includes("already connected");

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            {t("shareDialogs.connectWithDoctor")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{t("shareDialogs.connectDesc")}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="doctor-code">{t("shareDialogs.doctorId")}</Label>
            <div className="flex gap-2">
              <Input ref={inputRef} id="doctor-code" placeholder={t("shareDialogs.doctorIdPlaceholder")} value={doctorCode} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={handleKeyDown} className="font-mono text-lg tracking-widest uppercase" maxLength={8} />
              <Button type="button" onClick={handleLookup} disabled={doctorCode.length !== 8 || isLookingUp || isConnecting}>
                {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : t("shareDialogs.connect")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("shareDialogs.askDoctorForId")}</p>
          </div>

          {previewError && !previewDoctor && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {previewDoctor && (
            <div className={`p-4 rounded-lg border ${isAlreadyConnected ? 'bg-muted border-muted-foreground/20' : 'bg-primary/5 border-primary/20'}`}>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={previewDoctor.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10"><Stethoscope className="h-6 w-6 text-primary" /></AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{formatDoctorName(previewDoctor.full_name)}</p>
                  {previewDoctor.specialty && <p className="text-sm text-muted-foreground">{previewDoctor.specialty}</p>}
                </div>
                {isAlreadyConnected && <CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
              </div>
              {isAlreadyConnected && <p className="text-xs text-muted-foreground mt-2">{t("shareDialogs.alreadyConnected")}</p>}
            </div>
          )}
        </div>

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={handleClose}>{t("common.close")}</Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
