import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Heart, AlertCircle, Clock, FileText, Phone, MapPin,
  Calendar, Pill, Droplet, AlertTriangle, XCircle, Home, Eye, Loader2, EyeOff, ClipboardList,
  ShieldCheck, Lock, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { DocumentPreviewDialog } from "@/components/dashboard/DocumentPreviewDialog";
import ComplianceBadges from "@/components/dashboard/ComplianceBadges";
import RecipientVerificationGate from "@/components/dashboard/RecipientVerificationGate";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";

interface PatientProfile {
  display_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  location: string | null;
  phone: string | null;
}

interface HealthData {
  blood_group: string | null;
  health_allergies: string | null;
  current_medications: string | null;
  chronic_diseases: string | null;
  previous_diseases: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  height: string | null;
}

interface HealthRecord {
  id: string;
  title: string;
  category: string | null;
  record_date: string | null;
  provider_name: string | null;
  file_url?: string;
  file_type?: string | null;
}

interface SharedScopes {
  all?: boolean;
  profile?: boolean;
  health_summary?: boolean;
  allergies?: boolean;
  medications?: boolean;
  records?: boolean;
  emergency_contact?: boolean;
  clinical_records?: boolean;
  [key: string]: any;
}

type PageState = "loading" | "valid" | "expired" | "revoked" | "invalid";

const NotSharedBanner = ({ section }: { section: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/30 text-muted-foreground">
      <EyeOff className="h-4 w-4" />
      <span className="text-sm">{t("shareView.notShared", { section })}</span>
    </div>
  );
};

const ShareViewPage = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [scopes, setScopes] = useState<SharedScopes>({ all: true });
  const [requireVerification, setRequireVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [recipientJurisdiction, setRecipientJurisdiction] = useState<string | null>(null);

  useEffect(() => {
    const validateAndFetch = async () => {
      if (!token) { setPageState("invalid"); return; }
      try {
        const { data, error } = await supabase.functions.invoke("get-shared-patient-data", { body: { token } });
        if (error) { setPageState("invalid"); return; }
        if (data.error) {
          if (data.error === "revoked") setPageState("revoked");
          else if (data.error === "expired") { setPageState("expired"); setExpiresAt(data.expires_at); }
          else setPageState("invalid");
          return;
        }
        setExpiresAt(data.expires_at);
        setProfile(data.profile);
        setHealthData(data.healthData);
        setRecords(data.records || []);
        setScopes(data.shared_scopes || { all: true });
        setRequireVerification(data.require_verification || false);
        setRecipientJurisdiction(data.recipient_jurisdiction || null);
        setPageState("valid");
      } catch { setPageState("invalid"); }
    };
    validateAndFetch();
  }, [token]);

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (pageState === "invalid") return <ErrorPage icon={<XCircle className="h-16 w-16 text-destructive" />} title={t("shareView.invalidLink")} description={t("shareView.invalidLinkDesc")} />;
  if (pageState === "revoked") return <ErrorPage icon={<AlertCircle className="h-16 w-16 text-destructive" />} title={t("shareView.accessRevoked")} description={t("shareView.accessRevokedDesc")} />;
  if (pageState === "expired") return <ErrorPage icon={<Clock className="h-16 w-16 text-muted-foreground" />} title={t("shareView.linkExpired")} description={t("shareView.linkExpiredDesc", { date: expiresAt ? format(new Date(expiresAt), "PPP 'at' p") : "" })} />;

  if (requireVerification && !isVerified) {
    return (
      <RecipientVerificationGate
        onVerified={(name, org, role) => {
          setIsVerified(true);
          supabase.functions.invoke("get-shared-patient-data", { body: { token, verifiedName: name, verifiedOrg: org } });
        }}
      />
    );
  }

  const shareAll = scopes.all === true;
  const patientName = profile?.display_name || "Patient";
  const age = profile?.date_of_birth ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  const criticalItems = [
    healthData?.blood_group && { label: "Blood", value: healthData.blood_group },
    healthData?.health_allergies && { label: "Allergies", value: healthData.health_allergies },
    (healthData?.emergency_contact_name || healthData?.emergency_contact_phone) && {
      label: "Emergency",
      value: `${healthData?.emergency_contact_name || ""} ${healthData?.emergency_contact_phone || ""}`.trim(),
    },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src={patientBioLogo} alt="Patient Bio" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-sm" />
            <div>
              <span className="font-bold text-base sm:text-lg block leading-tight">Patient Bio</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground leading-none">{t("shareView.securemedicaldata")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            <Badge variant="outline" className="text-[10px] sm:text-xs bg-primary/5 border-primary/20 text-primary whitespace-nowrap">
              <ShieldCheck className="mr-1 h-3 w-3 shrink-0" />
              {t("shareView.sharedVia")}
            </Badge>
            <ComplianceBadges destinationJurisdiction={recipientJurisdiction || undefined} compact />
            <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap">
              <Clock className="mr-1 h-3 w-3 shrink-0" />
              {t("shareView.expires", { date: expiresAt ? format(new Date(expiresAt), "MMM d, p") : "" })}
            </Badge>
          </div>
        </div>
        <div className="h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
      </header>

      {/* Branded Hero Banner */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">{t("shareView.sharedMedicalData")}</h1>
              {(shareAll || scopes.profile) && profile?.display_name && (
                <p className="text-sm font-medium text-foreground/80 mt-0.5">{profile.display_name}</p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t("shareView.sharedViaPatientBio")}</p>
            </div>
          </div>
        </div>
      </div>

      {criticalItems.length > 0 && (
        <div className="bg-destructive/5 border-b border-destructive/20">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            {criticalItems.map((item, i) => (
              <span key={i} className="text-[11px] sm:text-xs">
                <span className="font-semibold text-destructive">{item.label}:</span>{" "}
                <span className="text-foreground">{item.value}</span>
                {i < criticalItems.length - 1 && <span className="ml-2 sm:ml-3 text-border">|</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {(shareAll || scopes.profile) ? (
          profile && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{patientName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {age && <span>{t("shareView.yearsOld", { age })}</span>}
                      {profile.gender && <span>• {profile.gender}</span>}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {profile.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /><span>{profile.location}</span></div>}
                  {profile.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span>{profile.phone}</span></div>}
                  {profile.date_of_birth && <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>DOB: {format(new Date(profile.date_of_birth), "MMM d, yyyy")}</span></div>}
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <NotSharedBanner section="Profile information" />
        )}

        <Tabs defaultValue="overview">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-3 py-2">{t("shareView.overview")}</TabsTrigger>
            <TabsTrigger value="clinical" className="text-xs sm:text-sm px-1 sm:px-3 py-2">{t("shareView.clinical", "Clinical")}</TabsTrigger>
            <TabsTrigger value="records" className="text-xs sm:text-sm px-1 sm:px-3 py-2">{t("shareView.records")}</TabsTrigger>
            <TabsTrigger value="medications" className="text-xs sm:text-sm px-1 sm:px-3 py-2">{t("shareView.meds")}</TabsTrigger>
            <TabsTrigger value="allergies" className="text-xs sm:text-sm px-1 sm:px-3 py-2">{t("shareView.allergies")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {(shareAll || scopes.health_summary) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Heart className="h-5 w-5 text-primary" />{t("shareView.healthSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <InfoBlock icon={<Droplet className="h-4 w-4" />} label={t("shareView.bloodGroup")} value={healthData?.blood_group} highlight />
                    <InfoBlock icon={<User className="h-4 w-4" />} label={t("shareView.height")} value={healthData?.height} />
                  </div>
                  {healthData?.chronic_diseases && (
                    <><Separator /><div><h4 className="text-sm font-medium mb-2">{t("shareView.chronicConditions")}</h4><p className="text-sm text-muted-foreground">{healthData.chronic_diseases}</p></div></>
                  )}
                  {healthData?.previous_diseases && (
                    <div><h4 className="text-sm font-medium mb-2">{t("shareView.medicalHistory")}</h4><p className="text-sm text-muted-foreground">{healthData.previous_diseases}</p></div>
                  )}
                  {!healthData?.blood_group && !healthData?.chronic_diseases && (
                    <p className="text-sm text-muted-foreground text-center py-4">{t("shareView.noHealthSummary")}</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <NotSharedBanner section="Health summary" />
            )}

            {(shareAll || scopes.emergency_contact) ? (
              (healthData?.emergency_contact_name || healthData?.emergency_contact_phone) && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive"><Phone className="h-4 w-4" />{t("shareView.emergencyContact")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{healthData?.emergency_contact_name}</p>
                    {healthData?.emergency_contact_phone && (
                      <a href={`tel:${healthData.emergency_contact_phone}`} className="text-primary hover:underline text-sm">{healthData.emergency_contact_phone}</a>
                    )}
                  </CardContent>
                </Card>
              )
            ) : null}
          </TabsContent>

          <TabsContent value="clinical" className="mt-4">
            {(shareAll || scopes.clinical_records) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    {t("shareView.clinicalRecords", "Clinical Records")}
                  </CardTitle>
                  <CardDescription>{t("shareView.clinicalRecordsDesc", "Structured clinical data including diagnoses, treatments, and care team")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("shareView.clinicalRecordsAvailable", "Clinical records data is available for this patient. Contact the patient for detailed clinical handover information.")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <NotSharedBanner section="Clinical records" />
            )}
          </TabsContent>

          <TabsContent value="records" className="mt-4">
            {(shareAll || scopes.records) ? (
              records.length > 0 ? (
                <RecordsSection records={records} token={token || ""} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("shareView.noRecordsAvailable")}</p>
              )
            ) : (
              <NotSharedBanner section="Medical records" />
            )}
          </TabsContent>

          <TabsContent value="medications" className="mt-4">
            {(shareAll || scopes.medications) ? (
              healthData?.current_medications ? (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Pill className="h-5 w-5 text-primary" />{t("shareView.currentMedications")}</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">{healthData.current_medications}</p></CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("shareView.noMedicationsRecorded")}</p>
              )
            ) : (
              <NotSharedBanner section="Medications" />
            )}
          </TabsContent>

          <TabsContent value="allergies" className="mt-4">
            {(shareAll || scopes.allergies) ? (
              healthData?.health_allergies ? (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg text-destructive"><AlertTriangle className="h-5 w-5" />{t("shareView.allergies")}</CardTitle></CardHeader>
                  <CardContent><p className="text-sm bg-destructive/10 text-destructive rounded-lg p-3">{healthData.health_allergies}</p></CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("shareView.noAllergiesRecorded")}</p>
              )
            ) : (
              <NotSharedBanner section="Allergies" />
            )}
          </TabsContent>
        </Tabs>

        <footer className="border-t pt-8 pb-12">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2.5">
              <img src={patientBioLogo} alt="Patient Bio" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
              <div>
                <span className="font-bold text-sm block leading-tight">Patient Bio</span>
                <span className="text-[10px] text-muted-foreground">{t("shareView.securemedicaldata")}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-sm">{t("shareView.trustStatement")}</p>
            <p className="text-[10px] text-muted-foreground">{t("shareView.readOnlyView")}</p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://patientbio.lovable.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                {t("shareView.visitWebsite")}
              </a>
            </Button>
            <p className="text-[10px] text-muted-foreground">{t("shareView.poweredBy")}</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

const InfoBlock = ({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string | null | undefined; highlight?: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className={`p-3 rounded-lg ${highlight ? "bg-primary/10" : "bg-muted/50"}`}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">{icon}<span>{label}</span></div>
      <p className={`font-semibold ${highlight ? "text-primary" : ""}`}>{value || t("shareView.notSpecified")}</p>
    </div>
  );
};

const RecordsSection = ({ records, token }: { records: HealthRecord[]; token: string }) => {
  const { t } = useTranslation();
  const [previewRecord, setPreviewRecord] = useState<HealthRecord | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const getSignedUrl = async (): Promise<string | null> => {
    if (!previewRecord) return null;
    try {
      const { data, error } = await supabase.functions.invoke("generate-document-url", {
        body: { token, record_id: previewRecord.id },
      });
      if (error || data?.error) {
        toast({ title: t("shareView.error"), description: t("shareView.failedToLoadDoc"), variant: "destructive" });
        return null;
      }
      return data?.url || null;
    } catch {
      toast({ title: t("shareView.error"), description: t("shareView.failedToLoadDoc"), variant: "destructive" });
      return null;
    }
  };

  const grouped = records.reduce((acc, record) => {
    const cat = record.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(record);
    return acc;
  }, {} as Record<string, HealthRecord[]>);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" />{t("shareView.medicalRecords")}</CardTitle>
          <CardDescription>{t("shareView.documentsOnFile", { count: records.length })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(grouped).map(([category, catRecords]) => (
            <div key={category}>
              <h4 className="text-sm font-medium capitalize mb-2 text-muted-foreground">{category.replace("_", " ")}</h4>
              <div className="space-y-2">
                {catRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{record.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.provider_name && `${record.provider_name} • `}
                          {record.record_date ? format(new Date(record.record_date), "MMM d, yyyy") : "No date"}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setPreviewRecord(record); setPreviewOpen(true); }} className="gap-1">
                      <Eye className="h-3 w-3" /><span className="hidden sm:inline">{t("shareView.viewDocument")}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {previewRecord && (
        <DocumentPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={previewRecord.title}
          category={previewRecord.category}
          date={previewRecord.record_date ? format(new Date(previewRecord.record_date), "MMM d, yyyy") : null}
          fileUrl={null}
          fileType={previewRecord.file_type}
          onGetSignedUrl={getSignedUrl}
        />
      )}
    </>
  );
};

const ErrorPage = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-2.5 mb-8">
        <img src={patientBioLogo} alt="Patient Bio" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
        <div>
          <span className="font-bold text-lg block leading-tight">Patient Bio</span>
          <span className="text-xs text-muted-foreground">{t("shareView.securemedicaldata", "Secure Medical Data")}</span>
        </div>
      </div>
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-10 pb-8">
          <div className="flex justify-center mb-6">{icon}</div>
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground mb-8">{description}</p>
          <Button asChild><Link to="/"><Home className="mr-2 h-4 w-4" />{t("notFoundPage.returnHome")}</Link></Button>
        </CardContent>
      </Card>
      <p className="text-[10px] text-muted-foreground mt-6">{t("shareView.poweredBy", "Powered by Patient Bio")}</p>
    </div>
  );
};

export default ShareViewPage;
