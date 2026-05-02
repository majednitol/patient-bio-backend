import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResearchSharingPreferences } from "@/hooks/useResearchSharingPreferences";
import { usePatientWallet } from "@/hooks/usePatientWallet";
import { 
  Settings2, Activity, Pill, FlaskConical, Stethoscope, Users, AlertTriangle,
  Bell, BellRing, Coins, TrendingUp, Shield, ArrowLeft, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const DATA_CATEGORIES = [
  { key: "share_vitals" as const, label: "Vitals & Metrics", description: "Heart rate, blood pressure, weight, temperature", icon: Activity, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
  { key: "share_prescriptions" as const, label: "Prescriptions", description: "Medication history and current prescriptions", icon: Pill, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { key: "share_lab_results" as const, label: "Lab Results", description: "Pathology reports and test results", icon: FlaskConical, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "share_diagnoses" as const, label: "Diagnoses", description: "Medical conditions and diagnosis history", icon: Stethoscope, color: "text-teal-500", bg: "bg-teal-100 dark:bg-teal-900/30" },
  { key: "share_demographics" as const, label: "Demographics", description: "Age, gender, location (anonymized)", icon: Users, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  { key: "share_allergies" as const, label: "Allergies", description: "Known allergies and sensitivities", icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
];

// Simulated valuation data — maps category to relative token value
const CATEGORY_VALUES: Record<string, { rank: number; multiplier: number; demand: string }> = {
  share_vitals: { rank: 1, multiplier: 1.8, demand: "Very High" },
  share_lab_results: { rank: 2, multiplier: 1.5, demand: "High" },
  share_diagnoses: { rank: 3, multiplier: 1.4, demand: "High" },
  share_prescriptions: { rank: 4, multiplier: 1.2, demand: "Medium" },
  share_allergies: { rank: 5, multiplier: 1.0, demand: "Medium" },
  share_demographics: { rank: 6, multiplier: 0.8, demand: "Low" },
};

const ResearchPreferencesPage = () => {
  const { t } = useTranslation();
  const { preferences, isLoading, upsert } = useResearchSharingPreferences();
  const { pricing } = usePatientWallet();
  const navigate = useNavigate();

  const avgBasePrice = pricing.length > 0
    ? pricing.reduce((s, p) => s + Number(p.base_price_tokens), 0) / pricing.length
    : 10;

  const enabledCount = DATA_CATEGORIES.filter(c => preferences[c.key]).length;

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="px-0">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/wallet")} className="mb-2 -ml-2 h-8 text-xs sm:text-sm">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> {t("researchPage.backToWallet")}
        </Button>
        <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
          <Settings2 className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
          {t("researchPage.researchPreferences")}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-xs sm:text-base">
          {t("researchPage.controlWhatYouShare")}
        </p>
      </div>

      {/* 1. Granular Category Toggles */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            {t("researchPage.dataSharingCategories")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {t("researchPage.chooseDataTypes")}{" "}
            <Badge variant="secondary" className="text-[10px] sm:text-xs ml-1">{enabledCount}/{DATA_CATEGORIES.length}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0.5 px-3 sm:px-6">
          {DATA_CATEGORIES.map(({ key, label, description, icon: Icon, color, bg }) => (
            <div
              key={key}
              className="flex items-center justify-between py-2.5 sm:py-3 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 sm:h-5 sm:w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <Label className="text-xs sm:text-sm font-medium cursor-pointer">{label}</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{description}</p>
                </div>
              </div>
              <Switch
                className="shrink-0"
                checked={!!preferences[key]}
                onCheckedChange={(checked) => upsert.mutate({ [key]: checked })}
                disabled={upsert.isPending}
              />
            </div>
          ))}

          {/* Anonymization master toggle */}
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between py-2 px-2 -mx-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium">{t("researchPage.requireAnonymization")}</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{t("researchPage.onlyShareAnonymized")}</p>
                </div>
              </div>
              <Switch
                checked={!!preferences.require_anonymization}
                onCheckedChange={(checked) => upsert.mutate({ require_anonymization: checked })}
                disabled={upsert.isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Notification Controls */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            {t("researchPage.notifications")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {t("researchPage.whenToNotify")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
          {[
            { key: "notify_new_requests" as const, label: "New Requests", desc: "When a researcher requests access", icon: BellRing },
            { key: "notify_auto_approved" as const, label: "Auto-Approved", desc: "When auto-approve rules grant access", icon: Shield },
            { key: "notify_earnings" as const, label: "Token Earnings", desc: "When you earn tokens", icon: Coins },
          ].map(({ key, label, desc, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between py-1.5 sm:py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <Label className="text-xs sm:text-sm font-medium">{label}</Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{desc}</p>
                </div>
              </div>
              <Switch
                className="shrink-0"
                checked={!!preferences[key]}
                onCheckedChange={(checked) => upsert.mutate({ [key]: checked })}
                disabled={upsert.isPending}
              />
            </div>
          ))}

          <div className="border-t pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-xs sm:text-sm font-medium">{t("researchPage.frequency")}</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{t("researchPage.batchNotifications")}</p>
              </div>
              <Select
                value={preferences.notification_frequency || "immediate"}
                onValueChange={(val) => upsert.mutate({ notification_frequency: val as "immediate" | "daily" | "weekly" })}
                disabled={upsert.isPending}
              >
                <SelectTrigger className="w-28 sm:w-32 h-8 text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">{t("researchPage.immediate")}</SelectItem>
                  <SelectItem value="daily">{t("researchPage.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("researchPage.weekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Data Valuation Insights */}
      <Card>
        <CardHeader className="px-3 sm:px-6 pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            {t("researchPage.dataValuation")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {t("researchPage.categoryValueByDemand")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-2 sm:space-y-3">
            {DATA_CATEGORIES
              .sort((a, b) => CATEGORY_VALUES[a.key].rank - CATEGORY_VALUES[b.key].rank)
              .map(({ key, label, icon: Icon, color, bg }) => {
                const val = CATEGORY_VALUES[key];
                const estimatedTokens = Math.round(avgBasePrice * val.multiplier);
                const isEnabled = !!preferences[key];
                const barWidth = Math.round((val.multiplier / 1.8) * 100);
                const demandColor = val.demand === "Very High" ? "text-green-600 dark:text-green-400" 
                  : val.demand === "High" ? "text-blue-600 dark:text-blue-400" 
                  : "text-muted-foreground";

                return (
                  <div key={key} className={`p-2 sm:p-3 rounded-lg border transition-opacity ${!isEnabled ? "opacity-50" : ""}`}>
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${color}`} />
                        </div>
                        <span className="text-xs sm:text-sm font-medium truncate">{label}</span>
                        {!isEnabled && (
                          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">Off</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <span className={`text-[10px] sm:text-xs font-medium ${demandColor}`}>{val.demand}</span>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs font-semibold">
                          ~{estimatedTokens}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="mt-3 p-2 sm:p-3 rounded-lg bg-muted/50 border">
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-start gap-1.5">
              <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
              {t("researchPage.valuationDisclaimer")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResearchPreferencesPage;
