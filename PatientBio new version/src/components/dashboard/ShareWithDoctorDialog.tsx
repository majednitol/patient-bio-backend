import { formatDoctorName } from "@/utils/formatDoctorName";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Copy, Mail, Check, Loader2, ExternalLink, Building2, User, Stethoscope, MessageCircle, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DoctorConnection } from "@/hooks/useDoctorConnections";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { useDoctorShareHistory } from "@/hooks/useDoctorShareHistory";
import { useHospitalDoctors, HospitalDoctor } from "@/hooks/useHospitalDoctors";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import DataScopeSelector, { SharedScopes, DEFAULT_SCOPES } from "./DataScopeSelector";

interface ShareWithDoctorDialogProps {
  doctors: DoctorConnection[];
  doctorsLoading: boolean;
  patientId?: string;
  patientName?: string;
  trigger?: React.ReactNode;
}

type DoctorType = "saved" | "hospital";

interface SelectedDoctor {
  type: DoctorType;
  id: string;
  userId?: string;
  name: string;
  email?: string | null;
  specialty?: string | null;
  hospitalName?: string;
}

const ShareWithDoctorDialog = ({ doctors, doctorsLoading, patientId, patientName, trigger }: ShareWithDoctorDialogProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createToken, isCreating } = useAccessTokens();
  const { createShareHistory } = useDoctorShareHistory();
  const { data: hospitalDoctors, isLoading: hospitalDoctorsLoading } = useHospitalDoctors();

  const EXPIRY_OPTIONS = [
    { value: "24", label: t("shareDialogs.24hours") },
    { value: "168", label: t("shareDialogs.7days") },
    { value: "720", label: t("shareDialogs.30days") },
  ];
  
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DoctorType>("saved");
  const [selectedDoctor, setSelectedDoctor] = useState<SelectedDoctor | null>(null);
  const [expiryHours, setExpiryHours] = useState("168");
  const [customMessage, setCustomMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sharedScopes, setSharedScopes] = useState<SharedScopes>({ ...DEFAULT_SCOPES });

  const resetDialog = () => {
    setSelectedDoctor(null);
    setExpiryHours("168");
    setCustomMessage("");
    setGeneratedLink(null);
    setCopied(false);
    setActiveTab("saved");
    setSharedScopes({ ...DEFAULT_SCOPES });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetDialog();
  };

  const handleSelectSavedDoctor = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    if (doctor) {
      setSelectedDoctor({
        type: "saved",
        id: doctor.id,
        name: doctor.doctor_name,
        email: doctor.email,
        specialty: doctor.specialty,
      });
    }
  };

  const handleSelectHospitalDoctor = (staffId: string) => {
    const doctor = hospitalDoctors?.find((d) => d.id === staffId);
    if (doctor) {
      setSelectedDoctor({
        type: "hospital",
        id: doctor.id,
        userId: doctor.user_id,
        name: doctor.full_name,
        specialty: doctor.specialty,
        hospitalName: doctor.hospital_name,
      });
    }
  };

  const generateShareLink = async () => {
    if (!selectedDoctor || !user?.id) return;

    setIsGenerating(true);
    
    const label = selectedDoctor.type === "hospital" 
      ? `For Dr. ${selectedDoctor.name} (${selectedDoctor.hospitalName})`
      : `For ${selectedDoctor.name}`;
    
    createToken(
      {
        expiresInHours: parseInt(expiryHours),
        label,
        sharedScopes,
        forUserId: patientId,
      },
      {
        onSuccess: async (token) => {
          const shareUrl = `${window.location.origin}/share/${token.token}`;
          setGeneratedLink(shareUrl);
          
          if (selectedDoctor.type === "saved") {
            await createShareHistory({
              doctor_id: selectedDoctor.id,
              token_id: token.id,
              notes: customMessage || undefined,
            });
          }
          
          if (selectedDoctor.type === "hospital" && selectedDoctor.userId) {
            try {
              const { error } = await supabase
                .from("doctor_patient_access")
                .upsert({
                  doctor_id: selectedDoctor.userId,
                  patient_id: user.id,
                  access_token_id: token.id,
                  is_active: true,
                }, { onConflict: "doctor_id,patient_id" });
              
              if (!error) {
                toast({
                  title: t("shareDialogs.accessGranted"),
                  description: t("shareDialogs.accessGrantedDesc", { name: selectedDoctor.name }),
                });
              }
            } catch (err) {
              console.error("Error granting access:", err);
            }
          }
          
          setIsGenerating(false);
        },
        onError: () => {
          setIsGenerating(false);
        },
      }
    );
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({ title: t("shareDialogs.linkCopied"), description: t("shareDialogs.linkCopiedDesc") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: t("shareDialogs.failedToCopy"), variant: "destructive" });
    }
  };

  const buildMessage = () => {
    if (!selectedDoctor || !generatedLink) return "";
    const expiryLabel = EXPIRY_OPTIONS.find((o) => o.value === expiryHours)?.label || "7 days";
    let message = `Dear Dr. ${selectedDoctor.name},\n\nI'm sharing my health records with you through Patient Bio.\n\n`;
    if (customMessage) message += `${customMessage}\n\n`;
    message += `You can access my records using this secure link:\n${generatedLink}\n\nThis link will expire in ${expiryLabel}.\n\nBest regards`;
    return message;
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(buildMessage());
      toast({ title: t("shareDialogs.messageCopied") });
    } catch {
      toast({ title: t("shareDialogs.failedToCopy"), variant: "destructive" });
    }
  };

  const handleSendEmail = () => {
    if (!selectedDoctor?.email || !generatedLink) return;
    const subject = encodeURIComponent("Shared Health Records - Patient Bio");
    const body = encodeURIComponent(buildMessage());
    window.open(`mailto:${selectedDoctor.email}?subject=${subject}&body=${body}`, "_blank");
  };

  const handleShareWhatsApp = () => {
    if (!generatedLink) return;
    const text = encodeURIComponent(buildMessage());
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShareSMS = () => {
    if (!generatedLink) return;
    const body = encodeURIComponent(buildMessage());
    window.open(`sms:?body=${body}`, "_blank");
  };

  const hasSavedDoctors = doctors.length > 0;
  const hasHospitalDoctors = (hospitalDoctors?.length || 0) > 0;
  const isLoading = doctorsLoading || hospitalDoctorsLoading;

  return (
    <>
      <span onClick={() => handleOpenChange(true)}>
        {trigger || (
          <Button variant="outline" className="w-full h-auto py-3 justify-start gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{t("shareDialogs.shareWithDoctor")}</span>
          </Button>
        )}
      </span>
      <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("shareDialogs.shareWithProvider")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {patientName
                ? t("shareDialogs.createSecureLinkFor", { name: patientName })
                : t("shareDialogs.createSecureLink")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasSavedDoctors && !hasHospitalDoctors ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground">{t("shareDialogs.noProvidersYet")}</p>
            <Button variant="outline" asChild>
              <Link to="/dashboard/doctors">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("shareDialogs.addDoctor")}
              </Link>
            </Button>
          </div>
        ) : !generatedLink ? (
          <div className="space-y-4 py-2">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as DoctorType); setSelectedDoctor(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="saved" className="gap-2">
                  <User className="h-4 w-4" />
                  {t("shareDialogs.myDoctors")}
                </TabsTrigger>
                <TabsTrigger value="hospital" className="gap-2" disabled={!hasHospitalDoctors}>
                  <Building2 className="h-4 w-4" />
                  {t("shareDialogs.hospital")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="saved" className="mt-4 space-y-4">
                {hasSavedDoctors ? (
                  <div className="space-y-2">
                    <Label>{t("shareDialogs.selectProvider")}</Label>
                    <Select value={selectedDoctor?.type === "saved" ? selectedDoctor.id : ""} onValueChange={handleSelectSavedDoctor}>
                      <SelectTrigger><SelectValue placeholder={t("shareDialogs.chooseDoctor")} /></SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.doctor_name}{doctor.specialty && ` • ${doctor.specialty}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <p>{t("shareDialogs.noSavedDoctors")}</p>
                    <Button variant="link" size="sm" asChild><Link to="/dashboard/doctors">{t("shareDialogs.addADoctor")}</Link></Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="hospital" className="mt-4 space-y-4">
                {hasHospitalDoctors ? (
                  <div className="space-y-2">
                    <Label>{t("shareDialogs.selectHospitalDoctor")}</Label>
                    <Select value={selectedDoctor?.type === "hospital" ? selectedDoctor.id : ""} onValueChange={handleSelectHospitalDoctor}>
                      <SelectTrigger><SelectValue placeholder={t("shareDialogs.chooseDoctor")} /></SelectTrigger>
                      <SelectContent>
                        {hospitalDoctors?.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={doctor.avatar_url || undefined} />
                                <AvatarFallback><Stethoscope className="h-3 w-3" /></AvatarFallback>
                              </Avatar>
                              <span>{formatDoctorName(doctor.full_name)}</span>
                              <span className="text-muted-foreground text-xs">{doctor.hospital_name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("shareDialogs.hospitalDoctorPortalNote")}</p>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground"><p>{t("shareDialogs.noHospitalDoctors")}</p></div>
                )}
              </TabsContent>
            </Tabs>

            {selectedDoctor && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedDoctor.type === "hospital" ? "Dr. " : ""}{selectedDoctor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedDoctor.specialty || t("shareDialogs.healthcareProvider")}
                      {selectedDoctor.hospitalName && ` • ${selectedDoctor.hospitalName}`}
                    </p>
                  </div>
                </div>

                <DataScopeSelector scopes={sharedScopes} onChange={setSharedScopes} compact />

                <div className="space-y-2">
                  <Label htmlFor="expiry">{t("shareDialogs.linkExpiresIn")}</Label>
                  <Select value={expiryHours} onValueChange={setExpiryHours}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">{t("shareDialogs.messageOptional")}</Label>
                  <Textarea id="message" placeholder={t("shareDialogs.addPersonalNote")} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} rows={2} />
                </div>
              </>
            )}

            <ResponsiveDialogFooter>
              <Button onClick={generateShareLink} disabled={!selectedDoctor || isCreating || isGenerating} className="w-full bg-gradient-to-r from-primary to-secondary border-0">
                {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("shareDialogs.generating")}</> : t("shareDialogs.generateShareLink")}
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-1">{t("shareDialogs.linkCreated")}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {selectedDoctor?.type === "hospital" ? "Dr. " : ""}{selectedDoctor?.name}
              </p>
              {selectedDoctor?.type === "hospital" && (
                <p className="text-xs text-primary mb-3">✓ {t("shareDialogs.doctorPortalAccess")}</p>
              )}
              <div className="bg-background border rounded-md p-2 text-xs font-mono break-all">{generatedLink}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <><Check className="mr-1 h-3 w-3 text-primary" /> {t("common.copied")}</> : <><Copy className="mr-1 h-3 w-3" /> {t("shareDialogs.copyLink")}</>}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyMessage}>
                <Copy className="mr-1 h-3 w-3" /> {t("shareDialogs.copyMessage")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="text-green-600 hover:text-green-700">
                <MessageCircle className="mr-1 h-3 w-3" /> {t("shareDialogs.whatsApp")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareSMS}>
                <Smartphone className="mr-1 h-3 w-3" /> {t("shareDialogs.sms")}
              </Button>
            </div>

            {selectedDoctor?.email && (
              <Button onClick={handleSendEmail} className="w-full" size="sm">
                <Mail className="mr-2 h-4 w-4" />
                {t("shareDialogs.sendEmailTo", { name: selectedDoctor.name })}
              </Button>
            )}

            <Button variant="ghost" className="w-full" onClick={resetDialog}>
              {t("shareDialogs.shareWithAnother")}
            </Button>
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
    </>
  );
};

export default ShareWithDoctorDialog;
