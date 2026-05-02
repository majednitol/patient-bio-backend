import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileSignature,
  Lock,
  Stethoscope,
  Building2,
  FlaskConical,
  Microscope,
  AlertCircle,
  Info
} from "lucide-react";
import { useConsentRecords, ConsentType, GrantedToType, ConsentRecord } from "@/hooks/useConsentRecords";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

import { QuickConsentPresets } from "@/components/dashboard/QuickConsentPresets";

const consentTypeConfig: Record<ConsentType, { label: string; description: string; icon: React.ElementType }> = {
  data_sharing: {
    label: "Data Sharing",
    description: "Allow sharing of health data with specific providers",
    icon: Shield,
  },
  research_participation: {
    label: "Research Participation",
    description: "Consent to participate in medical research studies",
    icon: Microscope,
  },
  emergency_access: {
    label: "Emergency Access",
    description: "Allow emergency access to critical health information",
    icon: AlertCircle,
  },
  third_party_access: {
    label: "Third Party Access",
    description: "Allow access by insurance or other third parties",
    icon: Building2,
  },
  marketing: {
    label: "Marketing Communications",
    description: "Receive health-related marketing communications",
    icon: Info,
  },
};

const grantedToTypeConfig: Record<GrantedToType, { label: string; icon: React.ElementType }> = {
  doctor: { label: "Doctor", icon: Stethoscope },
  hospital: { label: "Hospital", icon: Building2 },
  pathologist: { label: "Pathologist", icon: FlaskConical },
  researcher: { label: "Researcher", icon: Microscope },
  system: { label: "System", icon: Lock },
  emergency_services: { label: "Emergency Services", icon: AlertCircle },
};

const scopeOptions = [
  { id: "profile", label: "Basic Profile" },
  { id: "health_data", label: "Health Data (allergies, medications)" },
  { id: "health_records", label: "Health Records (documents, prescriptions)" },
  { id: "access_logs", label: "Access History" },
  { id: "lab_results", label: "Lab Results" },
];

const ConsentCard = ({ 
  consent, 
  onRevoke 
}: { 
  consent: ConsentRecord; 
  onRevoke: (id: string, reason: string) => void;
}) => {
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  
  const config = consentTypeConfig[consent.consent_type];
  const Icon = config?.icon || Shield;
  const grantedConfig = consent.granted_to_type ? grantedToTypeConfig[consent.granted_to_type] : null;

  const handleRevoke = () => {
    onRevoke(consent.id, revokeReason);
    setShowRevokeDialog(false);
    setRevokeReason("");
  };

  return (
    <>
      <Card className={cn(
        "transition-all overflow-hidden",
        consent.is_active ? "border-primary/20" : "border-muted opacity-70"
      )}>
        <CardContent className="p-3 sm:p-4">
          {/* Top row: Icon + Title + Status + Revoke */}
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              consent.is_active ? "bg-primary/10" : "bg-muted"
            )}>
              <Icon className={cn(
                "h-4 w-4 sm:h-5 sm:w-5",
                consent.is_active ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title row with status and revoke */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm sm:text-base">{config?.label || consent.consent_type}</h3>
                    {consent.is_active ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] sm:text-xs shrink-0">
                        <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] sm:text-xs shrink-0">
                        <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        Revoked
                      </Badge>
                    )}
                  </div>
                </div>
                {consent.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 shrink-0 h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                    onClick={() => setShowRevokeDialog(true)}
                  >
                    Revoke
                  </Button>
                )}
              </div>

              {/* Purpose */}
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{consent.purpose}</p>
              
              {/* Granted To */}
              {grantedConfig && (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-foreground/80">
                  <grantedConfig.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
                  <span>Granted to: <span className="font-medium">{grantedConfig.label}</span></span>
                </div>
              )}

              {/* Scope */}
              {consent.scope && consent.scope.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {consent.scope.map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-[10px] sm:text-xs capitalize px-1.5 sm:px-2 py-0 sm:py-0.5">
                      {s.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Digital Signature */}
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                <FileSignature className="h-3 w-3 shrink-0" />
                <span className="font-mono truncate">
                  {consent.digital_signature?.slice(0, 20)}...
                </span>
              </div>

              {/* Timestamps */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground">
                <span>
                  Granted: {format(new Date(consent.granted_at), "MMM d, yyyy")}
                </span>
                {consent.expires_at && (
                  <span>
                    Expires: {format(new Date(consent.expires_at), "MMM d, yyyy")}
                  </span>
                )}
                {consent.revoked_at && (
                  <span className="text-destructive">
                    Revoked: {formatDistanceToNow(new Date(consent.revoked_at), { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Revocation Reason */}
              {consent.revocation_reason && (
                <p className="text-xs text-destructive">
                  Reason: {consent.revocation_reason}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Consent</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The provider will no longer have access based on this consent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Revocation</Label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Please provide a reason for revoking this consent..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              Revoke Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ConsentManagementPage = () => {
  const { t } = useTranslation();
  const { 
    activeConsents, 
    revokedConsents, 
    isLoading, 
    createConsent, 
    revokeConsent,
    isCreating 
  } = useConsentRecords();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newConsent, setNewConsent] = useState({
    consent_type: "data_sharing" as ConsentType,
    granted_to_type: null as GrantedToType | null,
    purpose: "",
    scope: [] as string[],
    expires_at: "",
  });

  const handleCreateConsent = () => {
    createConsent({
      consent_type: newConsent.consent_type,
      granted_to_type: newConsent.granted_to_type,
      purpose: newConsent.purpose,
      scope: newConsent.scope,
      expires_at: newConsent.expires_at || null,
    });
    setShowCreateDialog(false);
    setNewConsent({
      consent_type: "data_sharing",
      granted_to_type: null,
      purpose: "",
      scope: [],
      expires_at: "",
    });
  };

  const handleRevokeConsent = (id: string, reason: string) => {
    revokeConsent({ id, reason });
  };

  const toggleScope = (scopeId: string) => {
    setNewConsent(prev => ({
      ...prev,
      scope: prev.scope.includes(scopeId)
        ? prev.scope.filter(s => s !== scopeId)
        : [...prev.scope, scopeId],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">{t("consentPage.consentManagement")}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("consentPage.manageConsentsDesc")}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          {t("consentPage.newConsent")}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-2.5 sm:p-4 flex items-start gap-2 sm:gap-3">
          <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h3 className="font-medium text-sm sm:text-base">{t("consentPage.digitallySignedConsents")}</h3>
            <p className="text-[11px] sm:text-sm text-muted-foreground">
              {t("consentPage.digitallySignedDesc")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Consent Presets */}
      <QuickConsentPresets />

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-3 sm:space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="relative text-xs sm:text-sm px-2.5 sm:px-3">
            {t("consentPage.activeConsents")}
            {activeConsents.length > 0 && (
              <span className="ml-1.5 sm:ml-2 inline-flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-green-500 text-white text-[10px] sm:text-xs">
                {activeConsents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="revoked" className="text-xs sm:text-sm px-2.5 sm:px-3">
            {t("consentPage.revokedTab")} ({revokedConsents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 sm:space-y-4">
          {activeConsents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <Shield className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3 sm:mb-4" />
                <h3 className="font-semibold text-base sm:text-lg">{t("consentPage.noActiveConsents")}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1 text-center max-w-sm">
                  {t("consentPage.noActiveConsentsDesc")}
                </p>
                <Button className="mt-3 sm:mt-4" size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("consentPage.createConsent")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeConsents.map(consent => (
              <ConsentCard 
                key={consent.id} 
                consent={consent} 
                onRevoke={handleRevokeConsent}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="revoked" className="space-y-3 sm:space-y-4">
          {revokedConsents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <XCircle className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3 sm:mb-4" />
                <h3 className="font-semibold text-base sm:text-lg">{t("consentPage.noRevokedConsents")}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                  {t("consentPage.noRevokedConsentsDesc")}
                </p>
              </CardContent>
            </Card>
          ) : (
            revokedConsents.map(consent => (
              <ConsentCard 
                key={consent.id} 
                consent={consent} 
                onRevoke={handleRevokeConsent}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create Consent Dialog */}
      <ResponsiveDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <ResponsiveDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-base sm:text-lg">{t("consentPage.createNewConsent")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-xs sm:text-sm">
              {t("consentPage.createNewConsentDesc")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("consentPage.consentType")}</Label>
              <Select
                value={newConsent.consent_type}
                onValueChange={(v) => setNewConsent(prev => ({ ...prev, consent_type: v as ConsentType }))}
              >
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(consentTypeConfig).map(([key, { label, icon: Icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("consentPage.grantTo")}</Label>
              <Select
                value={newConsent.granted_to_type || "none"}
                onValueChange={(v) => setNewConsent(prev => ({ 
                  ...prev, 
                  granted_to_type: v === "none" ? null : v as GrantedToType 
                }))}
              >
                <SelectTrigger className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder={t("consentPage.generalConsent")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("consentPage.generalConsent")}</SelectItem>
                  {Object.entries(grantedToTypeConfig).map(([key, { label, icon: Icon }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("consentPage.purpose")} *</Label>
              <Textarea
                value={newConsent.purpose}
                onChange={(e) => setNewConsent(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder={t("consentPage.purposePlaceholder")}
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("consentPage.dataScope")}</Label>
              <div className="space-y-1.5 sm:space-y-2">
                {scopeOptions.map(option => {
                  const isChecked = newConsent.scope.includes(option.id);
                  return (
                    <div 
                      key={option.id} 
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => toggleScope(option.id)}
                    >
                      <Checkbox
                        id={`scope-${option.id}`}
                        checked={isChecked}
                        onCheckedChange={() => toggleScope(option.id)}
                      />
                      <label htmlFor={`scope-${option.id}`} className="text-xs sm:text-sm cursor-pointer select-none">
                        {option.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("consentPage.expirationDate")}</Label>
              <Input
                type="date"
                value={newConsent.expires_at}
                onChange={(e) => setNewConsent(prev => ({ ...prev, expires_at: e.target.value }))}
                className="h-9 sm:h-10 text-sm"
              />
            </div>
          </div>

          <ResponsiveDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="w-full sm:w-auto text-sm">
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={handleCreateConsent}
              disabled={!newConsent.purpose || isCreating}
              className="w-full sm:w-auto text-sm"
            >
              <FileSignature className="h-4 w-4 mr-2" />
              {t("common.submit")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
};

export default ConsentManagementPage;
