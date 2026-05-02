import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useHealthData } from "@/hooks/useHealthData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSymptomScreenings } from "@/hooks/useSymptomScreenings";
import { toast } from "@/hooks/use-toast";
import {
  Stethoscope, AlertTriangle, Clock, CalendarPlus, Home, ShieldAlert,
  Lightbulb, ChevronDown, ChevronUp, Loader2, Sparkles, Heart, History,
  Mic, MicOff, MessageCircleQuestion, Check, X, Pill, ChevronRight,
} from "lucide-react";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";

interface ScreenerResult {
  urgency: "emergency" | "see_doctor_soon" | "schedule_appointment" | "self_care";
  urgency_label: string;
  summary: string;
  reasoning: string;
  recommendations: string[];
  home_remedies: string[];
  warning_signs: string[];
  estimated_savings: string;
  follow_up_questions?: string[];
  is_refined?: boolean;
  otc_suggestions?: { name: string; usage: string; note: string }[];
}

const BODY_AREAS = [
  { id: "head", labelKey: "symptomChecker.bodyHead", emoji: "🧠" },
  { id: "chest", labelKey: "symptomChecker.bodyChest", emoji: "🫁" },
  { id: "stomach", labelKey: "symptomChecker.bodyStomach", emoji: "🤢" },
  { id: "back", labelKey: "symptomChecker.bodyBack", emoji: "🦴" },
  { id: "arms_legs", labelKey: "symptomChecker.bodyArmsLegs", emoji: "💪" },
  { id: "skin", labelKey: "symptomChecker.bodySkin", emoji: "🩹" },
];

const URGENCY_CONFIG = {
  emergency: {
    icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
    badge: "bg-destructive text-destructive-foreground",
    label: "Seek Emergency Care",
  },
  see_doctor_soon: {
    icon: AlertTriangle,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    badge: "bg-orange-500 text-white",
    label: "See a Doctor Soon",
  },
  schedule_appointment: {
    icon: CalendarPlus,
    color: "text-primary",
    bg: "bg-primary/5 border-primary/20",
    badge: "bg-primary text-primary-foreground",
    label: "Schedule an Appointment",
  },
  self_care: {
    icon: Home,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    badge: "bg-green-600 text-white",
    label: "Home Management",
  },
};

export function SymptomPreScreener() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [savedScreeningId, setSavedScreeningId] = useState<string | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, boolean>>({});
  const [isRefining, setIsRefining] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const { healthData } = useHealthData();
  const { profile } = useUserProfile();
  const { screenings, saveScreening, markAsBooked } = useSymptomScreenings();

  const [voiceLang, setVoiceLang] = useState<'en-US' | 'bn-BD'>(
    i18n.language === 'bn' ? 'bn-BD' : 'en-US'
  );

  const voice = useVoiceTranscription((text) => {
    setSymptoms((prev) => (prev ? prev + " " + text : text));
  }, voiceLang);
  const SEVERITY_OPTIONS = [
    { value: "mild", label: t("symptomChecker.mild"), desc: t("symptomChecker.mildDesc") },
    { value: "moderate", label: t("symptomChecker.moderate"), desc: t("symptomChecker.moderateDesc") },
    { value: "severe", label: t("symptomChecker.severe"), desc: t("symptomChecker.severeDesc") },
    { value: "critical", label: t("symptomChecker.critical"), desc: t("symptomChecker.criticalDesc") },
  ];

  const handleSubmit = async () => {
    if (!symptoms.trim()) {
      toast.error(t("symptomChecker.describeSymptoms"));
      return;
    }

    setIsLoading(true);
    setResult(null);
    setSavedScreeningId(null);

    try {
      const { data, error } = await supabase.functions.invoke("symptom-prescreener", {
        body: {
          symptoms: symptoms.trim(),
          duration: duration || undefined,
          severity: severity || undefined,
          response_language: (voiceLang === 'bn-BD' || i18n.language === 'bn' || /[\u0980-\u09FF]/.test(symptoms)) ? 'bn' : undefined,
          affected_areas: selectedAreas.length > 0 ? selectedAreas : undefined,
        },
      });

      if (error) throw error;
      setResult(data);

      try {
        const saved = await saveScreening.mutateAsync({
          symptoms: symptoms.trim(),
          duration: duration || undefined,
          severity: severity || undefined,
          urgency: data.urgency,
          urgency_label: data.urgency_label,
          summary: data.summary,
          reasoning: data.reasoning,
          recommendations: data.recommendations,
          home_remedies: data.home_remedies,
          warning_signs: data.warning_signs,
          estimated_savings: data.estimated_savings,
        });
        setSavedScreeningId((saved as any)?.id || null);
      } catch {
        console.warn("Failed to save screening history");
      }
    } catch (err: any) {
      console.error("Symptom screener error:", err);
      toast.error(t("symptomChecker.failedAnalysis", "Failed to analyze symptoms. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSymptoms("");
    setDuration("");
    setSeverity("");
    setSavedScreeningId(null);
    setFollowUpAnswers({});
    setIsRefining(false);
    setSelectedAreas([]);
  };

  const handleFollowUpAnswer = (question: string, answer: boolean) => {
    setFollowUpAnswers((prev) => ({ ...prev, [question]: answer }));
  };

  const handleSubmitFollowUps = async () => {
    if (!result) return;
    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("symptom-prescreener", {
        body: {
          symptoms: symptoms.trim(),
          duration: duration || undefined,
          severity: severity || undefined,
          response_language: (voiceLang === 'bn-BD' || i18n.language === 'bn' || /[\u0980-\u09FF]/.test(symptoms)) ? 'bn' : undefined,
          affected_areas: selectedAreas.length > 0 ? selectedAreas : undefined,
          follow_up_answers: followUpAnswers,
          previous_result: {
            urgency: result.urgency,
            summary: result.summary,
            reasoning: result.reasoning,
            follow_up_questions: result.follow_up_questions,
          },
        },
      });
      if (error) throw error;
      setResult(data);
      setFollowUpAnswers({});
    } catch (err: any) {
      console.error("Follow-up refinement error:", err);
      toast.error("Failed to refine assessment. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleBookAppointment = () => {
    if (savedScreeningId) {
      markAsBooked.mutate(savedScreeningId);
    }
    navigate("/dashboard/find-best-doctor");
  };

  const handleReplayScreening = (screening: typeof screenings[0]) => {
    setShowHistory(false);
    setSymptoms(screening.symptoms);
    setDuration(screening.duration || "");
    setSeverity(screening.severity || "");
    setResult({
      urgency: screening.urgency as ScreenerResult["urgency"],
      urgency_label: screening.urgency_label || "",
      summary: screening.summary || "",
      reasoning: screening.reasoning || "",
      recommendations: screening.recommendations || [],
      home_remedies: screening.home_remedies || [],
      warning_signs: screening.warning_signs || [],
      estimated_savings: screening.estimated_savings || "",
    });
  };

  const urgencyInfo = result ? URGENCY_CONFIG[result.urgency] : null;

  const isMobile = useIsMobile();
  const [healthContextOpen, setHealthContextOpen] = useState(false);

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-muted/30 transition-colors p-3 sm:p-6 min-h-[44px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-lg flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                {t("symptomChecker.title")}
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-normal px-1.5 sm:px-1.5 py-0 shrink-0">
                  <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                  AI
                </Badge>
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-sm truncate">
                {t("symptomChecker.subtitle")}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ChevronDown className={cn(
              "h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </div>
        </div>
        {/* Past screenings badge below title on mobile */}
        {screenings.length > 0 && !isOpen && (
          <div className="mt-1.5 sm:hidden">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              <History className="h-2.5 w-2.5 mr-1" />
              {screenings.length} {t("symptomChecker.pastScreenings")}
            </Badge>
          </div>
        )}
        {/* Desktop inline badge */}
        {screenings.length > 0 && !isOpen && (
          <Badge variant="outline" className="hidden sm:inline-flex absolute right-14 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0 whitespace-nowrap">
            {screenings.length} {t("symptomChecker.pastScreenings")}
          </Badge>
        )}
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-3 sm:space-y-4 px-2.5 sm:px-6 pb-3 sm:pb-6 animate-in fade-in-0 slide-in-from-top-2 duration-200" style={{ overscrollBehavior: 'contain' }}>
          {screenings.length > 0 && !result && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full justify-start gap-2 text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              <History className="h-3.5 w-3.5" />
              {showHistory ? t("symptomChecker.hideHistory") : t("symptomChecker.viewHistory")} ({screenings.length})
            </Button>
          )}

          {showHistory && !result && (
            <div className="space-y-1.5 max-h-[200px] sm:max-h-[240px] overflow-y-auto rounded-lg border p-1.5 sm:p-2 bg-muted/20 -mx-0.5 sm:mx-0">
              {screenings.map((s) => {
                const config = URGENCY_CONFIG[s.urgency as keyof typeof URGENCY_CONFIG];
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleReplayScreening(s)}
                    className="w-full text-left p-2 sm:p-2.5 rounded-md border bg-background hover:bg-muted/50 transition-all press-feedback"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{s.symptoms}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {config && (
                            <Badge className={cn("text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0", config.badge)}>
                              {s.urgency_label || s.urgency.replace(/_/g, " ")}
                            </Badge>
                          )}
                          {s.booked_appointment && (
                            <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0">
                              <CalendarPlus className="h-2.5 w-2.5 mr-0.5" />
                              {t("symptomChecker.booked", "Booked")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground shrink-0">
                        {format(parseISO(s.created_at), "MMM d")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!result ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="symptoms" className="text-xs sm:text-sm">{t("symptomChecker.whatSymptoms")}</Label>
                <div className="relative">
                   <Textarea
                    id="symptoms"
                    placeholder={t("symptomChecker.symptomsPlaceholder")}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="min-h-[88px] sm:min-h-[80px] resize-none pr-20 text-sm"
                    disabled={isLoading}
                  />
                  {voice.isSupported && (
                    <div className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setVoiceLang(voiceLang === 'en-US' ? 'bn-BD' : 'en-US')}
                        disabled={isLoading || voice.isListening}
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors border",
                          "disabled:opacity-50",
                          voiceLang === 'bn-BD'
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                        aria-label={`Voice language: ${voiceLang === 'bn-BD' ? 'Bengali' : 'English'}`}
                      >
                        {voiceLang === 'bn-BD' ? 'BN' : 'EN'}
                      </button>
                      <button
                        type="button"
                        onClick={voice.isListening ? voice.stopListening : voice.startListening}
                        disabled={isLoading}
                        className={cn(
                          "p-2 sm:p-1.5 rounded-md transition-colors min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
                          "hover:bg-muted disabled:opacity-50",
                          voice.isListening && "bg-destructive/10 text-destructive"
                        )}
                        aria-label={voice.isListening ? "Stop recording" : "Start voice input"}
                      >
                        {voice.isListening ? (
                          <span className="relative flex h-4 w-4 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/40" />
                            <MicOff className="h-4 w-4 relative" />
                          </span>
                        ) : (
                          <Mic className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                {voice.isListening && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                    {t("symptomChecker.listeningPrompt")}
                  </p>
                )}
              </div>

              {/* Body Area Selector — horizontal scroll on mobile with fade */}
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t("symptomChecker.affectedAreas")}</Label>
                <div className="relative scroll-fade-right sm:after:hidden">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 sm:flex-wrap sm:overflow-visible hide-scrollbar">
                    {BODY_AREAS.map((area) => {
                      const isSelected = selectedAreas.includes(area.id);
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() =>
                            setSelectedAreas((prev) =>
                              isSelected ? prev.filter((a) => a !== area.id) : [...prev, area.id]
                            )
                          }
                          disabled={isLoading}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 min-h-[44px] sm:min-h-0 sm:py-1",
                            "disabled:opacity-50 press-feedback",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                          )}
                        >
                          <span>{area.emoji}</span>
                          {t(area.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <Label htmlFor="duration" className="text-xs sm:text-sm">
                    {t("symptomChecker.howLong")}
                  </Label>
                  <Input
                    id="duration"
                    placeholder={t("symptomChecker.durationPlaceholder")}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    disabled={isLoading}
                    className="h-10 sm:h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="severity" className="text-xs sm:text-sm">
                    {t("symptomChecker.severity")}
                  </Label>
                  <Select value={severity} onValueChange={setSeverity} disabled={isLoading}>
                    <SelectTrigger id="severity" className="h-10 sm:h-9 text-sm">
                      <SelectValue placeholder={t("symptomChecker.selectSeverity")} />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Health Context Panel — collapsible on mobile */}
              {(() => {
                const parse = (val: string | null | undefined) =>
                  (val || "")
                    .split(/[,;]/)
                    .map((s) => s.trim())
                    .filter((s) => s && s.toLowerCase() !== "none");
                const allergies = parse(healthData?.health_allergies);
                const medications = parse(healthData?.current_medications);
                const chronic = parse(healthData?.chronic_diseases);
                const hasData = allergies.length > 0 || medications.length > 0 || chronic.length > 0;
                const itemCount = allergies.length + medications.length + chronic.length;

                const contextContent = hasData ? (
                  <>
                    {allergies.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground w-16 sm:w-20 shrink-0">{t("symptomChecker.allergiesLabel", "Allergies")}</span>
                        {allergies.map((a) => (
                          <Badge key={a} variant="destructive" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">{a}</Badge>
                        ))}
                      </div>
                    )}
                    {medications.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground w-16 sm:w-20 shrink-0">{t("symptomChecker.medicationsLabel", "Medications")}</span>
                        {medications.map((m) => (
                          <Badge key={m} variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">{m}</Badge>
                        ))}
                      </div>
                    )}
                    {chronic.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground w-16 sm:w-20 shrink-0">{t("symptomChecker.chronicLabel", "Chronic")}</span>
                        {chronic.map((c) => (
                          <Badge key={c} variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">{c}</Badge>
                        ))}
                      </div>
                    )}
                  </>
                ) : null;

                return (
                  <div className="bg-muted/30 rounded-lg border border-dashed p-2 sm:p-3">
                    {hasData ? (
                      isMobile ? (
                        /* Mobile: collapsible summary */
                        <Collapsible open={healthContextOpen} onOpenChange={setHealthContextOpen}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full min-h-[44px] -m-2 p-2">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Heart className="h-3.5 w-3.5 text-primary" />
                              {t("symptomChecker.healthContext", "Your Health Context")}
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
                                {itemCount} {t("symptomChecker.itemsOnFile", "items on file")}
                              </Badge>
                            </div>
                            <ChevronRight className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                              healthContextOpen && "rotate-90"
                            )} />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1.5 pt-2">
                            {contextContent}
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        /* Desktop: always expanded */
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Heart className="h-3.5 w-3.5 text-primary" />
                            {t("symptomChecker.healthContext", "Your Health Context")}
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1 bg-primary/5 border-primary/20">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5 text-primary" />
                              {t("symptomChecker.fullProfileUsed", "Full profile analyzed")}
                            </Badge>
                          </div>
                          {contextContent}
                        </div>
                      )
                    ) : (
                      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                        {t("symptomChecker.noHealthData", "No health data on file")}{" — "}
                        <button
                          type="button"
                          onClick={() => navigate("/dashboard/profile")}
                          className="underline text-primary hover:text-primary/80"
                        >
                          {t("symptomChecker.updateProfile", "update your profile")}
                        </button>
                      </p>
                    )}
                  </div>
                );
              })()}

              <Button
                onClick={handleSubmit}
                disabled={isLoading || !symptoms.trim()}
                className="w-full gap-2 h-11 sm:h-10 text-sm sm:text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("symptomChecker.analyzing")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("symptomChecker.checkSymptoms")}
                  </>
                )}
              </Button>

              <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-tight">
                {t("symptomChecker.disclaimer")}
              </p>
            </>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* Urgency Result — prominent on mobile */}
              {urgencyInfo && (
                <div
                  className={cn(
                    "rounded-lg border p-3.5 sm:p-4 flex items-start gap-3",
                    urgencyInfo.bg
                  )}
                >
                  <urgencyInfo.icon className={cn("h-6 w-6 sm:h-6 sm:w-6 mt-0.5 flex-shrink-0", urgencyInfo.color)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                      <span className={cn("font-semibold text-sm sm:text-sm", urgencyInfo.color)}>
                        {result.urgency_label || urgencyInfo.label}
                      </span>
                      <Badge className={cn("text-[9px] sm:text-[10px]", urgencyInfo.badge)}>
                        {result.urgency.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">{result.summary}</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">{result.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Follow-up Questions — mobile-optimized layout */}
              {result.follow_up_questions && result.follow_up_questions.length > 0 && !result.is_refined && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 sm:p-3 space-y-2 sm:space-y-3">
                  <h4 className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                    <MessageCircleQuestion className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    {t("symptomChecker.followUpTitle")}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {t("symptomChecker.followUpDesc")}
                  </p>
                  <div className="space-y-1.5 sm:space-y-2">
                    {result.follow_up_questions.map((q, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-md border bg-background p-2.5 sm:p-2.5"
                      >
                        <span className="text-xs sm:text-sm text-foreground/90 flex-1">{q}</span>
                        <div className="flex gap-1.5 shrink-0 sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleFollowUpAnswer(q, true)}
                            className={cn(
                              "flex-1 sm:flex-none px-3 sm:px-2.5 py-2 sm:py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 press-feedback min-h-[44px] sm:min-h-0",
                              followUpAnswers[q] === true
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            <Check className="h-3 w-3" /> Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFollowUpAnswer(q, false)}
                            className={cn(
                              "flex-1 sm:flex-none px-3 sm:px-2.5 py-2 sm:py-1 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 press-feedback min-h-[44px] sm:min-h-0",
                              followUpAnswers[q] === false
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            <X className="h-3 w-3" /> No
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {Object.keys(followUpAnswers).length === result.follow_up_questions.length && (
                    <Button
                      onClick={handleSubmitFollowUps}
                      disabled={isRefining}
                      size="sm"
                      className="w-full gap-2"
                    >
                      {isRefining ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t("symptomChecker.refiningAssessment")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("symptomChecker.refineAssessment")}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {result.is_refined && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <Check className="h-3.5 w-3.5" />
                  {t("symptomChecker.refinedNote")}
                </div>
              )}

              {result.recommendations?.length > 0 && (
                <div className="rounded-lg bg-muted/20 p-3 sm:p-0 sm:bg-transparent sm:rounded-none">
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    {t("symptomChecker.recommendations")}
                  </h4>
                  <ul className="space-y-1 sm:space-y-1.5">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-1.5 sm:gap-2">
                        <span className="text-primary font-medium mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.home_remedies?.length > 0 && (
                <div className="rounded-lg bg-muted/20 p-3 sm:p-0 sm:bg-transparent sm:rounded-none">
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
                    {t("symptomChecker.homeRemedies")}
                  </h4>
                  <ul className="space-y-1 sm:space-y-1.5">
                    {result.home_remedies.map((r, i) => (
                      <li key={i} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-1.5 sm:gap-2">
                        <span className="text-green-600 font-medium mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* OTC Medication Suggestions — compact cards on mobile */}
              {result.otc_suggestions && result.otc_suggestions.length > 0 && (
                <div className="rounded-lg bg-muted/20 p-3 sm:p-0 sm:bg-transparent sm:rounded-none">
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    {t("symptomChecker.otcTitle")}
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    {result.otc_suggestions.map((otc, i) => (
                      <div key={i} className="rounded-md border bg-background/80 p-2.5 sm:p-2.5">
                        <p className="text-xs sm:text-sm font-medium">{otc.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{otc.usage}</p>
                        {otc.note && (
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 italic">{otc.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1.5 sm:mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {t("symptomChecker.otcDisclaimer")}
                  </p>
                </div>
              )}

              {result.warning_signs?.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-2.5 sm:p-3">
                  <h4 className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t("symptomChecker.warningTitle")}
                  </h4>
                  <ul className="space-y-1">
                    {result.warning_signs.map((w, i) => (
                      <li key={i} className="text-[11px] sm:text-xs text-destructive/80 flex items-start gap-1.5 sm:gap-2">
                        <span className="font-medium mt-0.5">⚠</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.estimated_savings && (
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 sm:p-2.5">
                  <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary flex-shrink-0" />
                  {result.estimated_savings}
                </div>
              )}

              {savedScreeningId && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                  <History className="h-3 w-3" />
                  {t("symptomChecker.savedHistory")}
                </div>
              )}

              {/* Action buttons — sticky on mobile with safe-area padding */}
              <div className="flex gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur-sm -mx-0.5 px-0.5 safe-area-bottom sm:static sm:bg-transparent sm:backdrop-blur-none sm:mx-0 sm:px-0 sm:pb-0">
                <Button variant="outline" onClick={handleReset} className="flex-1 h-11 sm:h-9 text-sm sm:text-sm min-h-[44px] sm:min-h-0" size="sm">
                  {t("symptomChecker.checkAgain")}
                </Button>
                {result.urgency !== "self_care" && (
                  <Button className="w-full flex-1 gap-1.5 h-11 sm:h-9 text-sm sm:text-sm min-h-[44px] sm:min-h-0" size="sm" onClick={handleBookAppointment}>
                    <CalendarPlus className="h-4 w-4 sm:h-4 sm:w-4" />
                    {t("symptomChecker.bookAppointment")}
                  </Button>
                )}
              </div>

              <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-tight">
                {t("symptomChecker.disclaimer")}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
