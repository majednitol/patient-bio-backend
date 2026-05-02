import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { OfflineUnavailable } from "@/components/pwa/OfflineUnavailable";
import { usePatientFeatureEligibility } from "@/hooks/usePatientFeatureEligibility";
import { FeatureGateBlocker } from "@/components/shared/FeatureGateBlocker";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton, CardSkeleton } from "@/components/ui/page-skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkline } from "@/components/ui/Sparkline";
import { Share2, Copy, Check, ExternalLink, Link2, Clock, Trash2, XCircle, Plus, Loader2, UserPlus, Eye, BarChart3, Activity, Globe, MessageCircle, Smartphone, Server, Search, Stethoscope, Building2, Microscope, Shield, Pill, Landmark, UserCog, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { useAccessTokens, AccessToken } from "@/hooks/useAccessTokens";
import { useDoctorConnections } from "@/hooks/useDoctorConnections";
import ShareWithDoctorDialog from "@/components/dashboard/ShareWithDoctorDialog";
import ShareWithResearcherDialog from "@/components/dashboard/ShareWithResearcherDialog";
import ShareWithPathologistDialog from "@/components/dashboard/ShareWithPathologistDialog";
import ShareWithHospitalDialog from "@/components/dashboard/ShareWithHospitalDialog";
import ShareWithInsuranceDialog from "@/components/dashboard/ShareWithInsuranceDialog";
import ShareWithPharmacyDialog from "@/components/dashboard/ShareWithPharmacyDialog";
import ShareWithGovernmentDialog from "@/components/dashboard/ShareWithGovernmentDialog";
import ShareWithAdminDialog from "@/components/dashboard/ShareWithAdminDialog";
import ProviderSharingGrid from "@/components/dashboard/ProviderSharingGrid";
import { CrossBorderShareDialog } from "@/components/dashboard/CrossBorderShareDialog";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { format, formatDistanceToNow, differenceInHours, subDays } from "date-fns";
import DataScopeSelector, { SharedScopes, DEFAULT_SCOPES } from "@/components/dashboard/DataScopeSelector";
import QuickShareTemplates, { ShareTemplate } from "@/components/dashboard/QuickShareTemplates";

import BulkTokenActions from "@/components/dashboard/BulkTokenActions";
import { useSecurityPin } from "@/components/dashboard/SecurityPinDialog";

// Expiry options use translation keys - resolved via getExpiryOptions(t)
const EXPIRY_OPTION_KEYS = [
  { value: "1", labelKey: "shareDataPage.expiry1h" },
  { value: "24", labelKey: "shareDataPage.expiry24h" },
  { value: "168", labelKey: "shareDataPage.expiry7d" },
  { value: "720", labelKey: "shareDataPage.expiry30d" },
];

type TokenFilter = "all" | "active" | "expired" | "revoked";

/** Calculate visual expiry percentage */
const getExpiryPercent = (token: AccessToken) => {
  const created = new Date(token.created_at).getTime();
  const expires = new Date(token.expires_at).getTime();
  const now = Date.now();
  if (now >= expires) return 0;
  const total = expires - created;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, ((expires - now) / total) * 100));
};

const ShareDataPage = () => {
  const { t } = useTranslation();
  const eligibility = usePatientFeatureEligibility();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const { tokens, isLoading, createToken, isCreating, revokeToken, deleteToken, isTokenActive, isTokenExpired, bulkRevoke, isBulkRevoking, bulkDelete, isBulkDeleting } = useAccessTokens();
  const { doctors, isLoading: doctorsLoading } = useDoctorConnections();
  const { activePatientShares, revokeShare, isLoading: researchSharesLoading } = usePatientResearcherShares();

  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expiryHours, setExpiryHours] = useState("24");
  const [linkLabel, setLinkLabel] = useState("");
  const [crossBorderOpen, setCrossBorderOpen] = useState(false);
  const [sharedScopes, setSharedScopes] = useState<SharedScopes>({ ...DEFAULT_SCOPES });
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>("all");
  const [tokenSearch, setTokenSearch] = useState("");
  const [mobileTab, setMobileTab] = useState("quick-share");
  const { requestPin, PinDialog } = useSecurityPin();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const passportId = profile?.patient_passport_id || null;
  const legacyId = user?.id?.substring(0, 8).toUpperCase() || "N/A";
  const displayId = passportId || legacyId;
  const qrValue = passportId
    ? `patientbio:passport:${passportId}`
    : `patientbio:${legacyId}`;

  // --- Derived data ---
  const activeTokens = tokens.filter(isTokenActive);
  const totalViews = tokens.reduce((sum, t) => sum + (t.access_count || 0), 0);
  const viewedTokens = tokens.filter(t => t.access_count > 0);
  const recentlyAccessed = tokens
    .filter(t => t.accessed_at)
    .sort((a, b) => new Date(b.accessed_at!).getTime() - new Date(a.accessed_at!).getTime())
    .slice(0, 3);

  const mostViewedToken = useMemo(() => {
    if (!tokens.length) return null;
    return tokens.reduce((best, t) => (t.access_count > (best?.access_count || 0) ? t : best), tokens[0]);
  }, [tokens]);

  const lastActivity = recentlyAccessed[0]?.accessed_at ?? null;

  // Simple 7-day sparkline from token access data
  const sparklineData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStr = format(day, "yyyy-MM-dd");
      return tokens.filter(t => t.accessed_at && format(new Date(t.accessed_at), "yyyy-MM-dd") === dayStr)
        .reduce((sum, t) => sum + (t.access_count || 0), 0);
    });
    // If all zeros, show at least some baseline
    return days.some(d => d > 0) ? days : [0, 0, 0, 0, 0, 0, 0];
  }, [tokens]);

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    let result = tokens;
    if (tokenFilter === "active") result = result.filter(isTokenActive);
    else if (tokenFilter === "expired") result = result.filter(t => !t.is_revoked && isTokenExpired(t));
    else if (tokenFilter === "revoked") result = result.filter(t => t.is_revoked);
    if (tokenSearch.trim()) {
      const q = tokenSearch.toLowerCase();
      result = result.filter(t => (t.label || "").toLowerCase().includes(q));
    }
    return result;
  }, [tokens, tokenFilter, tokenSearch, isTokenActive, isTokenExpired]);

  const hasActiveSelected = Array.from(selectedTokenIds).some(id => {
    const t = tokens.find(tok => tok.id === id);
    return t && isTokenActive(t);
  });

  // --- Handlers ---
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      toast({ title: t("common.copied"), description: t("profilePage.healthPassportCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleWebShareId = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Health Passport ID", text: `My Health Passport ID: ${displayId}` });
      } catch { /* user cancelled */ }
    } else {
      handleCopyId();
    }
  };

  const handleCopyLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(token);
      toast({ title: t("common.copied") });
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    const text = encodeURIComponent(`I'm sharing my health records with you via Patient Bio:\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShareSMS = (token: string) => {
    const shareUrl = `${window.location.origin}/share/${token}`;
    const body = encodeURIComponent(`I'm sharing my health records with you via Patient Bio: ${shareUrl}`);
    window.open(`sms:?body=${body}`, "_blank");
  };

  const doCreateLink = useCallback(() => {
    createToken({
      expiresInHours: parseInt(expiryHours),
      label: linkLabel.trim() || undefined,
      sharedScopes,
    });
    setLinkLabel("");
    setSharedScopes({ ...DEFAULT_SCOPES });
  }, [createToken, expiryHours, linkLabel, sharedScopes]);

  const handleCreateLink = () => {
    requestPin(doCreateLink, {
      title: t("shareDataPage.confirmShareLink"),
      description: t("shareDataPage.confirmShareDesc"),
    });
  };

  const createLinkRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleFab = () => {
      createLinkRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => handleCreateLink(), 400);
    };
    window.addEventListener("fab-create-share-link", handleFab);
    return () => window.removeEventListener("fab-create-share-link", handleFab);
  }, [handleCreateLink]);

  const handleTemplateSelect = (template: ShareTemplate) => {
    setSharedScopes(template.scopes);
    setExpiryHours(template.expiryHours);
    setLinkLabel(template.name);
  };

  const toggleTokenSelection = (tokenId: string) => {
    setSelectedTokenIds(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  };

  const handleBulkRevoke = () => { bulkRevoke(Array.from(selectedTokenIds)); setSelectedTokenIds(new Set()); };
  const handleBulkDelete = () => { bulkDelete(Array.from(selectedTokenIds)); setSelectedTokenIds(new Set()); };

  const getTokenStatus = (token: AccessToken) => {
    if (token.is_revoked) return { label: t("sharing.revoked"), variant: "destructive" as const };
    if (isTokenExpired(token)) return { label: t("sharing.expired"), variant: "secondary" as const };
    return { label: t("common.active"), variant: "default" as const };
  };

  if (eligibility.isLoading) return <PageSkeleton />;
  if (!eligibility.isEligible) return <FeatureGateBlocker eligibility={eligibility} feature="share-data" />;
  if (!isOnline) return <OfflineUnavailable isOnline={false}><div /></OfflineUnavailable>;
  // ==================== SHARED RENDERABLE SECTIONS ====================

  /** Health Passport ID + QR card */
  const PatientIdSection = (
    <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent rounded-xl p-4 md:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-lg flex items-center justify-center p-1.5 sm:p-2 shadow-sm shrink-0 hover:scale-105 transition-transform">
          <QRCodeSVG value={qrValue} size={80} level="H" bgColor="#ffffff" fgColor="#1f2937" className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{t("dashboard.healthPassportId")}</p>
          <span className="text-base sm:text-2xl font-mono font-bold tracking-wider block truncate">{displayId}</span>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
             <Button variant="outline" size="sm" onClick={handleCopyId} className="h-7 text-xs gap-1.5 shrink-0">
              {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              {t("shareDataPage.copy")}
            </Button>
            <Button variant="link" size="sm" asChild className="h-7 text-xs shrink-0 gap-1 inline-flex items-center">
              <Link to="/dashboard/qr-code" className="inline-flex items-center gap-1"><ExternalLink className="h-3 w-3 shrink-0" /><span>{t("shareDataPage.fullQR")}</span></Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  /** Link creation form */
  const LinkCreationForm = (
    <div ref={createLinkRef} className="space-y-4">
      <QuickShareTemplates onSelect={handleTemplateSelect} />
      <div className="bg-muted/50 rounded-lg sm:rounded-xl p-2 sm:p-4 space-y-2 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label htmlFor="link-label" className="text-sm">{t("shareDataPage.labelOptional")}</Label>
            <Input id="link-label" placeholder={t("shareDataPage.labelPlaceholder")} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="touch-target" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry" className="text-sm">{t("shareDataPage.expiresIn")}</Label>
            <Select value={expiryHours} onValueChange={setExpiryHours}>
              <SelectTrigger className="touch-target"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTION_KEYS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataScopeSelector scopes={sharedScopes} onChange={setSharedScopes} />
        <Button onClick={handleCreateLink} disabled={isCreating} className="w-full bg-gradient-to-r from-primary to-secondary border-0 touch-target">
          {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("shareDataPage.creating")}</> : <><Plus className="mr-2 h-4 w-4" /> {t("shareDataPage.createAccessLink")}</>}
        </Button>
      </div>

      {/* Recent links preview – top 3 */}
      {tokens.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("shareDataPage.recentLinks", "Recent Links")}</p>
          <div className="space-y-1.5">
            {tokens.slice(0, 3).map((token) => {
              const active = isTokenActive(token);
              const status = getTokenStatus(token);
              return (
                <div key={token.id} className={`flex items-center gap-2 p-2 rounded-lg border ${active ? "border-border bg-card" : "border-border/50 bg-muted/30 opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{token.label || t("shareDataPage.accessLink")}</span>
                      <Badge variant={status.variant} className="text-[9px] px-1 py-0 shrink-0">{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{active ? `${formatDistanceToNow(new Date(token.expires_at), { addSuffix: true })}` : format(new Date(token.expires_at), "MMM d")}</span>
                      {token.access_count > 0 && <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{token.access_count}x</span>}
                    </div>
                  </div>
                  {active && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleCopyLink(token.token)}>
                      {copiedToken === token.token ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /** Token list with filter + search */
  const TokenListSection = (
    <div className="space-y-3">
      {/* Filter controls */}
      <div className="space-y-2">
        <Tabs value={tokenFilter} onValueChange={(v) => setTokenFilter(v as TokenFilter)}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="all" className="text-xs flex-1">{t("shareDataPage.filterAll")} <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{tokens.length}</Badge></TabsTrigger>
            <TabsTrigger value="active" className="text-xs flex-1">{t("shareDataPage.filterActive")} <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{activeTokens.length}</Badge></TabsTrigger>
            <TabsTrigger value="expired" className="text-xs flex-1">{t("shareDataPage.filterExpired")}</TabsTrigger>
            <TabsTrigger value="revoked" className="text-xs flex-1">{t("shareDataPage.filterRevoked")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("shareDataPage.searchByLabel")}
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
      ) : filteredTokens.length === 0 ? (
        <InlineEmptyState
          icon={Link2}
          title={tokenFilter === "all" && !tokenSearch ? t("shareDataPage.noLinksYet") : t("shareDataPage.noMatchingLinks")}
          description={tokenFilter === "all" && !tokenSearch ? t("shareDataPage.createLinkDesc") : t("shareDataPage.tryChangingFilter")}
          action={tokenFilter === "all" && !tokenSearch ? { label: t("shareDataPage.createAccessLink"), onClick: handleCreateLink, icon: Plus } : undefined}
        />
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredTokens.map((token) => {
            const status = getTokenStatus(token);
            const active = isTokenActive(token);
            const isSelected = selectedTokenIds.has(token.id);
            const expiryPct = getExpiryPercent(token);
            return (
              <div key={token.id} className={`border rounded-lg press-feedback ${active ? "p-2.5 sm:p-4 border-border" : "p-2 sm:p-4 border-border/50 opacity-60"} ${isSelected ? "ring-2 ring-primary/50" : ""}`}>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleTokenSelection(token.id)} className="mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="font-medium text-sm truncate">{token.label || t("shareDataPage.accessLink")}</span>
                      <Badge variant={status.variant} className="text-[10px] shrink-0">{status.label}</Badge>
                      {token.shared_scopes && !token.shared_scopes.all && (
                        <Badge variant="outline" className="text-[10px]">{t("common.filter")}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {active
                          ? `Expires ${formatDistanceToNow(new Date(token.expires_at), { addSuffix: true })}`
                          : `Expired ${format(new Date(token.expires_at), "MMM d")}`}
                      </span>
                      {token.access_count > 0 && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{token.access_count}x</span>}
                      {token.accessed_at && (
                        <span className="flex items-center gap-1 text-primary/70">
                          <Activity className="h-3 w-3" />
                          {formatDistanceToNow(new Date(token.accessed_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {/* Expiry progress bar */}
                    {active && (
                      <Progress value={expiryPct} className="h-1 mt-1.5" />
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-1 mt-2">
                      {active && (
                        <>
                          <Button variant="outline" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => handleCopyLink(token.token)}>
                            {copiedToken === token.token ? <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-primary" /> : <Copy className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => handleShareWhatsApp(token.token)}>
                            <MessageCircle className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-green-600" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 sm:h-7 sm:w-7" onClick={() => handleShareSMS(token.token)}>
                            <Smartphone className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="h-9 w-9 sm:h-7 sm:w-7"><XCircle className="h-3.5 w-3.5 sm:h-3 sm:w-3" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("shareDataPage.revokeAccessLink")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("shareDataPage.revokeDesc")}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row">
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeToken(token.id)}>{t("sharing.revoke")}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9 sm:h-7 sm:w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                            <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("common.delete")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("shareDataPage.deleteDesc")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex-col sm:flex-row">
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteToken(token.id)}>{t("common.delete")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /** Provider sharing grid */
  const ProviderSection = (
    <div className="space-y-5">
      <ProviderSharingGrid doctors={doctors} doctorsLoading={doctorsLoading} />
      <Button variant="outline" className="w-full justify-start gap-2 border-primary/20 hover:bg-primary/5 overflow-hidden h-auto py-2 sm:py-2.5" onClick={() => setCrossBorderOpen(true)}>
        <Globe className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate text-xs sm:text-sm">{t("shareDataPage.internationalTransfer")}</span>
        <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">GDPR</Badge>
      </Button>
      <CrossBorderShareDialog open={crossBorderOpen} onOpenChange={setCrossBorderOpen} />
      <Link to="/dashboard/subscriptions">
        <Button variant="outline" className="w-full justify-start gap-2 border-primary/20 hover:bg-primary/5 overflow-hidden h-auto py-2 sm:py-2.5">
          <Server className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate text-xs sm:text-sm">{t("shareDataPage.connectedSystems")}</span>
          <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">EHR</Badge>
        </Button>
      </Link>
    </div>
  );

  /** Analytics section */
  const AnalyticsSection = (
    <Card>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{t("shareDataPage.analytics")}</span>
          </CardTitle>
          <Button variant="default" size="sm" asChild className="text-xs shrink-0 h-7 sm:h-9">
            <Link to="/dashboard/access-analytics">{t("shareDataPage.viewDetails")}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-6">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
          <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 text-center">
            <div className="flex items-center justify-center gap-1 font-bold text-primary">
              <Eye className="h-3.5 w-3.5" /><span className="text-sm sm:text-lg">{totalViews}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{t("shareDataPage.views")}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 text-center">
            <div className="text-sm sm:text-lg font-bold text-primary">{activeTokens.length}</div>
            <p className="text-[10px] text-muted-foreground">{t("common.active")}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-1.5 sm:p-2 text-center">
            <div className="text-sm sm:text-lg font-bold text-primary">{viewedTokens.length}</div>
            <p className="text-[10px] text-muted-foreground">{t("shareDataPage.viewed")}</p>
          </div>
        </div>

        {/* Sparkline */}
        {sparklineData.some(d => d > 0) && (
          <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-2">
            <Sparkline data={sparklineData} width={100} height={28} className="shrink-0" />
            <span className="text-[10px] text-muted-foreground">{t("shareDataPage.last7Days")}</span>
          </div>
        )}

        {/* Most viewed */}
        {mostViewedToken && mostViewedToken.access_count > 0 && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3 w-3 text-primary" />
              <span className="font-medium">{t("shareDataPage.mostViewed")}</span>
              <span className="truncate text-muted-foreground">{mostViewedToken.label || t("shareDataPage.accessLink")}</span>
              <Badge variant="secondary" className="text-[10px] ml-auto shrink-0">{mostViewedToken.access_count}x</Badge>
            </div>
          </div>
        )}

        {/* Last activity */}
        {lastActivity && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {t("shareDataPage.lastActivity")} {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
          </p>
        )}

        {recentlyAccessed.length > 0 && (
          <div className="space-y-1.5">
             <h4 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />{t("shareDataPage.recentActivity")}
            </h4>
            <div className="space-y-1.5">
              {recentlyAccessed.map((token) => (
                <div key={token.id} className="flex items-center justify-between bg-muted/30 rounded-md p-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Eye className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium truncate">{token.label || t("shareDataPage.accessLink")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground shrink-0">
                    <span className="hidden sm:inline">{format(new Date(token.accessed_at!), "MMM d, h:mm a")}</span>
                    <span className="sm:hidden">{formatDistanceToNow(new Date(token.accessed_at!), { addSuffix: true })}</span>
                    <Badge variant="secondary" className="text-[10px]">{token.access_count}x</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalViews === 0 && (
          <p className="text-xs text-muted-foreground text-center py-1">{t("shareDataPage.noViewsYet")}</p>
        )}
      </CardContent>
    </Card>
  );

  /** Research section */
  const ResearchSection = activePatientShares.length > 0 ? (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base">{t("shareDataPage.activeResearchShares", { count: activePatientShares.length })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 sm:px-6">
        {activePatientShares.map((share) => (
          <div key={share.id} className="flex items-center justify-between bg-muted/30 rounded-md p-2 sm:p-3 text-xs sm:text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-xs sm:text-sm">{share.disease_category ? share.disease_category.replace("_", " ").toUpperCase() : t("shareDataPage.allData")}</span>
                <Badge variant={share.is_anonymized ? "secondary" : "outline"} className="text-[10px]">{share.is_anonymized ? t("shareDataPage.anon") : t("shareDataPage.full")}</Badge>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(share.shared_at), { addSuffix: true })}
                {share.expires_at && <span className="hidden sm:inline"> • Expires {format(new Date(share.expires_at), "MMM d")}</span>}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"><XCircle className="h-3.5 w-3.5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                   <AlertDialogTitle>{t("shareDataPage.revokeResearchAccess")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("shareDataPage.revokeResearchDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row">
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => revokeShare(share.id)}>{t("sharing.revoke")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </CardContent>
    </Card>
  ) : (
      <InlineEmptyState
        icon={FlaskConical}
        title={t("shareDataPage.noResearchShares")}
        description={t("shareDataPage.noResearchSharesDesc")}
    />
  );

  // ==================== LAYOUT ====================

  return (
    <div className="space-y-4">


      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent rounded-xl p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div>
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {t("shareDataPage.title")}
            </h1>
            <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5">{t("shareDataPage.subtitle")}</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[10px] sm:text-xs sm:px-2.5 sm:py-1">
              <Link2 className="h-3 w-3" /> {activeTokens.length} {t("shareDataPage.filterActive")}
            </Badge>
            <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[10px] sm:text-xs sm:px-2.5 sm:py-1">
              <Eye className="h-3 w-3" /> {totalViews} {t("shareDataPage.views")}
            </Badge>
            <Badge variant="outline" className="gap-1 px-2 py-0.5 text-[10px] sm:text-xs sm:px-2.5 sm:py-1">
              <UserPlus className="h-3 w-3" /> {doctors?.length ?? 0} {t("shareDataPage.providers")}
            </Badge>
          </div>
        </div>
      </div>

      {/* MOBILE: Tabbed layout (below lg) */}
      <div className="lg:hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="w-full h-9">
            <TabsTrigger value="quick-share" className="flex-1 text-xs">{t("shareDataPage.quickShare")}</TabsTrigger>
            <TabsTrigger value="providers" className="flex-1 text-xs">{t("shareDataPage.providers")}</TabsTrigger>
            <TabsTrigger value="links" className="flex-1 text-xs">{t("shareDataPage.links")} <Badge variant="secondary" className="ml-1 text-[10px] px-1">{tokens.length}</Badge></TabsTrigger>
            <TabsTrigger value="research" className="flex-1 text-xs">{t("shareDataPage.research")}</TabsTrigger>
          </TabsList>

          <TabsContent value="quick-share" className="space-y-4 mt-4">
            {PatientIdSection}
            {LinkCreationForm}
          </TabsContent>

          <TabsContent value="providers" className="mt-4">
            {ProviderSection}
          </TabsContent>

          <TabsContent value="links" className="space-y-4 mt-4">
            {tokens.length > 0 && AnalyticsSection}
            <Card>
              <CardHeader className="px-3 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-primary" /> {t("shareDataPage.accessLinks")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3">
                {TokenListSection}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="research" className="mt-4">
            {ResearchSection}
          </TabsContent>
        </Tabs>
      </div>

      {/* DESKTOP: Two-column layout (lg+) */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {PatientIdSection}
            </CardContent>
          </Card>

          <Card ref={createLinkRef}>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Link2 className="h-5 w-5 text-primary" />
                {t("shareDataPage.timeLimitedLinks")}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t("shareDataPage.secureLinks")}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-4">
              {LinkCreationForm}
              {TokenListSection}
              <p className="text-xs text-center text-muted-foreground">
                {t("shareDataPage.linksDisclaimer")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {tokens.length > 0 && AnalyticsSection}

          <Card>
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">{t("shareDataPage.shareWithProviders")}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">{t("shareDataPage.directSharing")}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {ProviderSection}
            </CardContent>
          </Card>

          {ResearchSection}
        </div>
      </div>

      <BulkTokenActions
        selectedCount={selectedTokenIds.size}
        hasActiveSelected={hasActiveSelected}
        onRevokeSelected={handleBulkRevoke}
        onDeleteSelected={handleBulkDelete}
        onClearSelection={() => setSelectedTokenIds(new Set())}
        isRevoking={isBulkRevoking}
        isDeleting={isBulkDeleting}
      />
      {PinDialog}
    </div>
  );
};

export default ShareDataPage;
