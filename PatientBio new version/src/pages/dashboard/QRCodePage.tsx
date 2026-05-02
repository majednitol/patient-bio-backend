import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useHealthData } from "@/hooks/useHealthData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Shield, Download, Copy, Check, Share2, ScanLine, Keyboard, Loader2,
  Droplets, AlertTriangle, Pill, Phone, MapPin, Calendar, BadgeCheck, User,
  WifiOff,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { QRScanner } from "@/components/qr/QRScanner";
import { useConnectToDoctor } from "@/hooks/useConnectToDoctor";
import { EmergencyAccessControls } from "@/components/dashboard/EmergencyAccessControls";
import { useEmergencyAccess } from "@/hooks/useEmergencyAccess";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { differenceInYears, format } from "date-fns";
import { getCachedUserProfile, getCachedHealthData } from "@/lib/offlineDB";

const QRCodePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { healthData } = useHealthData();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [manualDoctorId, setManualDoctorId] = useState("");
  const { lookupDoctor, isConnecting } = useConnectToDoctor();
  const { activeToken, hasActiveEmergencyAccess } = useEmergencyAccess();
  const isMobile = useIsMobile();
  const isOnline = navigator.onLine;

  // Offline fallback data
  const [offlineProfile, setOfflineProfile] = useState<any>(null);
  const [offlineHealth, setOfflineHealth] = useState<any>(null);

  useEffect(() => {
    if (!isOnline && user?.id && !profile) {
      getCachedUserProfile(user.id).then(p => p && setOfflineProfile(p));
      getCachedHealthData(user.id).then(h => h && setOfflineHealth(h));
    }
  }, [isOnline, user?.id, profile]);

  // Use live data when available, fall back to cached
  const effectiveProfile = profile || (offlineProfile ? {
    patient_passport_id: offlineProfile.patientPassportId,
    display_name: offlineProfile.displayName,
    date_of_birth: offlineProfile.dateOfBirth,
    gender: offlineProfile.gender,
    location: offlineProfile.location,
    avatar_url: offlineProfile.avatarUrl,
    created_at: offlineProfile.updatedAt,
  } : null);

  const effectiveHealth = healthData || (offlineHealth ? {
    blood_group: offlineHealth.bloodGroup,
    health_allergies: offlineHealth.healthAllergies,
    current_medications: offlineHealth.currentMedications,
    emergency_contact_name: offlineHealth.emergencyContactName,
    emergency_contact_phone: offlineHealth.emergencyContactPhone,
  } : null);

  const passportId = effectiveProfile?.patient_passport_id || null;
  const legacyId = user?.id?.substring(0, 8).toUpperCase() || "N/A";
  const displayId = passportId || legacyId;

  // QR links directly to emergency view when active token exists
  const qrValue = hasActiveEmergencyAccess && activeToken
    ? `${window.location.origin}/emergency/${activeToken.emergency_token}`
    : passportId 
      ? `patientbio:passport:${passportId}`
      : `patientbio:${legacyId}`;

  const displayName = effectiveProfile?.display_name || user?.email?.split("@")[0] || "Patient";
  const age = effectiveProfile?.date_of_birth
    ? differenceInYears(new Date(), new Date(effectiveProfile.date_of_birth))
    : null;
  const memberSince = effectiveProfile?.created_at
    ? format(new Date(effectiveProfile.created_at), "MMM yyyy")
    : null;

  // Health summary data
  const bloodGroup = effectiveHealth?.blood_group || null;
  const allergiesCount = effectiveHealth?.health_allergies
    ? effectiveHealth.health_allergies.split(",").filter(Boolean).length
    : 0;
  const medsCount = effectiveHealth?.current_medications
    ? effectiveHealth.current_medications.split(",").filter(Boolean).length
    : 0;
  const hasEmergencyContact = !!(effectiveHealth?.emergency_contact_name && effectiveHealth?.emergency_contact_phone);

  // Profile completeness for verified badge
  const isVerified = !!(
    effectiveProfile?.display_name &&
    effectiveProfile?.date_of_birth &&
    effectiveProfile?.gender &&
    effectiveHealth?.blood_group &&
    effectiveHealth?.emergency_contact_phone
  );

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      toast({
        title: t("profilePage.copied"),
        description: t("profilePage.healthPassportCopied"),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: t("profilePage.failedToCopy"),
        description: t("profilePage.copyManually"),
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("patient-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 512, 512);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `PatientBio-QR-${displayId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        toast({
          title: t("qrCodePage.downloaded"),
          description: t("qrCodePage.qrSavedAsPng"),
        });
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Patient Bio QR Code",
          text: `My Health Passport ID: ${displayId}`,
        });
        toast({
          title: t("qrCodePage.shared"),
          description: t("qrCodePage.patientIdShared"),
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopyId();
        }
      }
    } else {
      handleCopyId();
    }
  };

  const handleScan = async (decodedText: string) => {
    if (decodedText.startsWith("patientbio:doctor:")) {
      const doctorId = decodedText.replace("patientbio:doctor:", "");
      toast({
        title: t("qrCodePage.doctorQRDetected"),
        description: `Connecting to doctor ${doctorId}...`,
      });
      await lookupDoctor(doctorId);
    } else if (decodedText.startsWith("patientbio:")) {
      toast({
        title: t("qrCodePage.patientQRCode"),
        description: t("qrCodePage.patientQRCodeDesc"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("qrCodePage.invalidQRCode"),
        description: t("qrCodePage.invalidQRCodeDesc"),
        variant: "destructive",
      });
    }
  };

  const handleManualConnect = async () => {
    const cleanId = manualDoctorId.trim().toUpperCase();
    if (cleanId.length !== 8) {
      toast({
        title: t("qrCodePage.invalidId"),
        description: t("qrCodePage.invalidIdDesc"),
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: t("common.loading"),
      description: `Looking up doctor ${cleanId}...`,
    });
    await lookupDoctor(cleanId);
    setManualDoctorId("");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          {t("pwa.healthPassportOffline")}
        </div>
      )}
      {/* ── Passport Hero Card ── */}
      <Card className="overflow-hidden border-0 shadow-xl">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-primary to-secondary px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-foreground" />
              <h1 className="text-lg sm:text-xl font-bold text-primary-foreground">
                {t("qrCodePage.healthPassportTitle")}
              </h1>
            </div>
            {isVerified && (
              <Badge className="bg-white/20 text-primary-foreground border-white/30 gap-1">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t("qrCodePage.verified")}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4 sm:p-6">
          {/* Identity + QR row */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Identity info */}
            <div className="flex-1 space-y-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-primary/20">
                  <AvatarImage src={effectiveProfile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">{displayName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm sm:text-base text-muted-foreground font-semibold">{displayId}</span>
                    <Button variant="ghost" size="icon" onClick={handleCopyId} className="h-7 w-7">
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Key vitals row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {age !== null && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("profile.age")}</p>
                      <p className="text-sm font-semibold truncate">{age} {t("profile.yearsOld")}</p>
                    </div>
                  </div>
                )}
                {effectiveProfile?.gender && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("profile.gender")}</p>
                      <p className="text-sm font-semibold truncate capitalize">{effectiveProfile.gender}</p>
                    </div>
                  </div>
                )}
                {bloodGroup && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <Droplets className="h-4 w-4 text-destructive flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("healthData.bloodGroup")}</p>
                      <p className="text-sm font-bold truncate">{bloodGroup}</p>
                    </div>
                  </div>
                )}
                {effectiveProfile?.location && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("profile.location")}</p>
                      <p className="text-sm font-semibold truncate">{effectiveProfile.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Member since */}
              {memberSince && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("qrCodePage.memberSince")} {memberSince}
                </p>
              )}
            </div>

            {/* Right: QR Code */}
            <div className="flex flex-col items-center gap-3 lg:border-l lg:border-border/50 lg:pl-6">
              <div className="w-40 h-40 sm:w-48 sm:h-48 bg-white rounded-2xl shadow-lg flex items-center justify-center p-3">
                <QRCodeSVG
                  id="patient-qr-code"
                  value={qrValue}
                  size={160}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#1f2937"
                  className="w-full h-full"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {t("qrCodePage.scanForId")}
              </p>
              <div className="flex gap-2 w-full">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {t("qrCodePage.download")}
                </Button>
                <Button size="sm" className="flex-1 bg-gradient-to-r from-primary to-secondary border-0" onClick={handleShare}>
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("qrCodePage.share")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Health Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Droplets className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("healthData.bloodGroup")}</p>
              <p className="text-sm font-bold truncate">{bloodGroup || t("common.none")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent/50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("healthData.allergies")}</p>
              <p className="text-sm font-bold">{allergiesCount} {t("qrCodePage.known")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Pill className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("healthData.medications")}</p>
              <p className="text-sm font-bold">{medsCount} {t("common.active")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-secondary/30 flex items-center justify-center flex-shrink-0">
              <Phone className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("healthData.emergencyContact")}</p>
              <p className="text-sm font-bold">{hasEmergencyContact ? t("qrCodePage.contactSet") : t("qrCodePage.contactNotSet")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Emergency Access ── */}
      <EmergencyAccessControls showQRCode={true} />

      {/* ── Connect with Provider ── */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          {t("qrCodePage.connectWithProvider")}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-base flex items-center justify-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" />
                {t("qrCodePage.scanDoctorQR")}
              </CardTitle>
              <CardDescription>{t("qrCodePage.scanDoctorDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <QRScanner onScan={handleScan} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                {t("qrCodePage.enterDoctorIdManually")}
              </CardTitle>
              <CardDescription>{t("qrCodePage.cantScan")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="e.g., 56CE6C09"
                  value={manualDoctorId}
                  onChange={(e) => setManualDoctorId(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="font-mono uppercase touch-target"
                />
                <Button 
                  onClick={handleManualConnect}
                  disabled={manualDoctorId.length !== 8 || isConnecting}
                  className="w-full sm:w-auto touch-target"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("qrCodePage.connect")}
                </Button>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• {t("qrCodePage.askDoctorQR")}</li>
                <li>• {t("qrCodePage.scanOrEnter")}</li>
                <li>• {t("qrCodePage.onceConnected")}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;
