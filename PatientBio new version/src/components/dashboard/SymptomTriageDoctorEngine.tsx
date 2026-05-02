import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useSymptomTriageRecommend, type TriageRecommendResponse } from "@/hooks/useSymptomTriageRecommend";
import { useNextAvailableSlots } from "@/hooks/useNextAvailableSlots";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { TriageResultCard } from "./TriageResultCard";
import { RecommendedDoctorCard } from "./RecommendedDoctorCard";
import { cn } from "@/lib/utils";
import {
  Stethoscope, Loader2, Sparkles, ArrowLeft, Mic, MicOff,
} from "lucide-react";

const BODY_AREAS = [
  { id: "head", label: "🧠 Head" },
  { id: "chest", label: "🫁 Chest" },
  { id: "stomach", label: "🤢 Stomach" },
  { id: "back", label: "🦴 Back" },
  { id: "arms_legs", label: "💪 Arms/Legs" },
  { id: "skin", label: "🩹 Skin" },
];

export function SymptomTriageDoctorEngine() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [result, setResult] = useState<TriageRecommendResponse | null>(null);

  const mutation = useSymptomTriageRecommend();

  const [voiceLang, setVoiceLang] = useState<'en-US' | 'bn-BD'>(
    i18n.language === 'bn' ? 'bn-BD' : 'en-US'
  );
  const voice = useVoiceTranscription((text) => {
    setSymptoms(prev => (prev ? prev + " " + text : text));
  }, voiceLang);

  const doctorIds = result?.doctors?.map(d => d.doctor_id) || [];
  const { data: slotsMap } = useNextAvailableSlots(doctorIds);

  const handleSubmit = async () => {
    if (!symptoms.trim()) {
      toast.error(t("symptomChecker.describeSymptoms"));
      return;
    }
    try {
      const data = await mutation.mutateAsync({
        symptoms: symptoms.trim(),
        duration: duration || undefined,
        severity: severity || undefined,
        affected_areas: selectedAreas.length > 0 ? selectedAreas : undefined,
        response_language: (voiceLang === 'bn-BD' || i18n.language === 'bn' || /[\u0980-\u09FF]/.test(symptoms)) ? 'bn' : undefined,
      });
      setResult(data);
    } catch (err: any) {
      console.error("Triage error:", err);
      toast.error(t("symptomChecker.failedAnalysis", "Failed to analyze symptoms. Please try again."));
    }
  };

  const handleReset = () => {
    setResult(null);
    setSymptoms("");
    setDuration("");
    setSeverity("");
    setSelectedAreas([]);
  };

  const handleBook = (doctorId: string) => {
    navigate("/dashboard/appointments", {
      state: { symptoms, doctorId },
    });
  };

  const toggleArea = (id: string) => {
    setSelectedAreas(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {t("triageEngine.title", "Find Best Doctor")}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("triageEngine.subtitle", "Describe your symptoms → Get urgency assessment → See best-matched doctors")}
          </p>
        </div>
      </div>

      {!result ? (
        /* Stage 1: Symptom Input */
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-sm sm:text-lg">
              {t("triageEngine.describeSymptoms", "Describe Your Symptoms")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("triageEngine.describeDesc", "Tell us what you're experiencing and we'll find the right specialist for you")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
            {/* Symptoms textarea */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("symptomChecker.whatSymptoms")}</Label>
              <div className="relative">
                <Textarea
                  placeholder={t("symptomChecker.symptomsPlaceholder")}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="min-h-[100px] resize-none pr-20 text-sm"
                  disabled={mutation.isPending}
                />
                {voice.isSupported && (
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVoiceLang(voiceLang === 'en-US' ? 'bn-BD' : 'en-US')}
                      disabled={mutation.isPending || voice.isListening}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors border disabled:opacity-50",
                        voiceLang === 'bn-BD'
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {voiceLang === 'bn-BD' ? 'BN' : 'EN'}
                    </button>
                    <button
                      type="button"
                      onClick={voice.isListening ? voice.stopListening : voice.startListening}
                      disabled={mutation.isPending}
                      className={cn(
                        "p-2 rounded-md transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center",
                        "hover:bg-muted disabled:opacity-50",
                        voice.isListening && "bg-destructive/10 text-destructive"
                      )}
                    >
                      {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Body areas */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">{t("symptomChecker.affectedAreas")}</Label>
              <div className="flex gap-1.5 flex-wrap">
                {BODY_AREAS.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleArea(area.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-full text-xs border transition-colors",
                      selectedAreas.includes(area.id)
                        ? "bg-primary/10 border-primary/40 text-primary font-medium"
                        : "bg-background border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration + Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t("symptomChecker.howLong")}</Label>
                <Input
                  placeholder={t("symptomChecker.durationPlaceholder")}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="text-sm"
                  disabled={mutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">{t("symptomChecker.severity")}</Label>
                <Select value={severity} onValueChange={setSeverity} disabled={mutation.isPending}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t("symptomChecker.selectSeverity")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">{t("symptomChecker.mild")}</SelectItem>
                    <SelectItem value="moderate">{t("symptomChecker.moderate")}</SelectItem>
                    <SelectItem value="severe">{t("symptomChecker.severe")}</SelectItem>
                    <SelectItem value="critical">{t("symptomChecker.critical")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending || !symptoms.trim()}
              className="w-full"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("triageEngine.analyzing", "Analyzing & Finding Doctors...")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("triageEngine.findDoctors", "Find Best Doctors for Me")}
                </>
              )}
            </Button>

            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
              {t("symptomChecker.disclaimer")}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Stage 2: Results */
        <div className="space-y-4">
          <TriageResultCard triage={result.triage} />

          {/* Doctor Recommendations */}
          {result.doctors.length > 0 && (
            <div>
              <h3 className="text-sm sm:text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("triageEngine.bestDoctors", "Best Doctors For You")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.doctors.map((doc, i) => (
                  <RecommendedDoctorCard
                    key={doc.doctor_id}
                    doctor={doc}
                    rank={i + 1}
                    nextSlot={slotsMap?.[doc.doctor_id]}
                    onBook={handleBook}
                  />
                ))}
              </div>
            </div>
          )}

          {result.doctors.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("triageEngine.noDoctors", "No matching doctors found. Try browsing all doctors.")}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => navigate("/dashboard/find-doctor")}>
                  {t("triageEngine.browseAll", "Browse All Doctors")}
                </Button>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" onClick={handleReset} className="w-full">
            {t("symptomChecker.checkAgain")}
          </Button>
        </div>
      )}
    </div>
  );
}
