import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Sparkles, Stethoscope, Brain, Loader2, History, X, MessageCircleQuestion, Mic, MicOff, GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BookableDoctor } from "@/hooks/useBookableDoctors";
import { useNextAvailableSlots } from "@/hooks/useNextAvailableSlots";
import { useMatcherSearchHistory } from "@/hooks/useMatcherSearchHistory";
import { useVoiceTranscription } from "@/hooks/useVoiceTranscription";
import { useDoctorRatings, getRatingBonus } from "@/hooks/useDoctorRatings";
import { keywordMatchDoctors, getAllSymptomKeywords, matchDiseasesForDoctors, type MatchResult } from "./smartMatchUtils";
import { MatchResultCard } from "./MatchResultCard";
import { DoctorComparisonDrawer } from "./DoctorComparisonDrawer";

interface SmartDoctorMatcherProps {
  doctors: BookableDoctor[];
  onSelectDoctor: (doctor: BookableDoctor) => void;
  initialSymptoms?: string;
}

interface AISpecialtyMatch {
  specialty: string;
  relevance_score: number;
  reasoning: string;
  matched_concepts: string[];
}

function aiMatchesToResults(
  aiMatches: AISpecialtyMatch[],
  doctors: BookableDoctor[],
  symptoms: string
): MatchResult[] {
  // Run disease matching across all doctors
  const diseaseMap = matchDiseasesForDoctors(symptoms, doctors);

  const results: MatchResult[] = [];
  for (const aiMatch of aiMatches) {
    const specLower = aiMatch.specialty.toLowerCase();
    for (const doctor of doctors) {
      if (!doctor.specialty || !doctor.has_availability) continue;
      if (!doctor.specialty.toLowerCase().includes(specLower)) continue;
      if (results.some((r) => r.doctorId === doctor.id)) continue;

      const connectionBonus = doctor.connection_type === "granted_access" ? 5 : 0;
      const diseaseData = diseaseMap.get(doctor.id);
      const diseaseScore = diseaseData?.score || 0;

      results.push({
        doctorId: doctor.id,
        score: aiMatch.relevance_score + connectionBonus + Math.min(diseaseScore, 10),
        maxScore: 110,
        reason: aiMatch.reasoning + (doctor.connection_type === "granted_access" ? " · Your doctor" : ""),
        matchedKeywords: aiMatch.matched_concepts.slice(0, 3),
        isAI: true,
        matchedDiseases: diseaseData?.matches.slice(0, 4),
        scoreBreakdown: {
          specialtyScore: aiMatch.relevance_score,
          diseaseScore,
          connectionBonus,
        },
      });
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5);
}

export function SmartDoctorMatcher({ doctors, onSelectDoctor, initialSymptoms }: SmartDoctorMatcherProps) {
  const allDoctorIds = useMemo(() => doctors.map(d => d.id), [doctors]);
  const { data: ratingsMap } = useDoctorRatings(allDoctorIds);

  const { user } = useAuth();
  const [symptoms, setSymptoms] = useState(initialSymptoms || "");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [fromPreScreener, setFromPreScreener] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usedAI, setUsedAI] = useState(false);

  // Typeahead state
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const allKeywords = useMemo(() => getAllSymptomKeywords(), []);

  // Compare state
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const compareMode = matches.length >= 2;

  const { searches, addSearch, clearSearches } = useMatcherSearchHistory();

  // Voice transcription
  const handleVoiceResult = useCallback((text: string) => {
    setSymptoms(prev => (prev ? prev + " " + text : text));
  }, []);
  const { isListening, isSupported: voiceSupported, startListening, stopListening } = useVoiceTranscription(handleVoiceResult);

  // Next available slots for matched doctors
  const matchedDoctorIds = matches.map(m => m.doctorId);
  const { data: nextSlots } = useNextAvailableSlots(matchedDoctorIds);

  // Typeahead suggestions
  const typeaheadSuggestions = useMemo(() => {
    const lastWord = symptoms.split(/[\s,;]+/).pop()?.toLowerCase() || "";
    if (lastWord.length < 2) return [];
    return allKeywords.filter(kw => kw.startsWith(lastWord) && kw !== lastWord).slice(0, 6);
  }, [symptoms, allKeywords]);

  const runMatch = useCallback(async (text: string, isFromPreScreener: boolean) => {
    if (!text.trim() || doctors.length === 0) return;

    setIsLoading(true);
    setHasSearched(true);
    setFromPreScreener(isFromPreScreener);
    setFollowUpQuestions([]);
    setCompareIds(new Set());
    setTypeaheadOpen(false);

    const specialties = [...new Set(
      doctors.filter(d => d.specialty && d.has_availability).map(d => d.specialty!)
    )];

    let aiResults: MatchResult[] = [];

    if (specialties.length > 0) {
      try {
        let patientContext: Record<string, unknown> | undefined;
        if (user?.id) {
          const [profileRes, healthRes] = await Promise.all([
            supabase.from("user_profiles").select("date_of_birth, gender").eq("user_id", user.id).maybeSingle(),
            supabase.from("health_data").select("chronic_diseases, health_allergies, current_medications").eq("user_id", user.id).maybeSingle(),
          ]);

          const profile = profileRes.data;
          const health = healthRes.data;
          if (profile || health) {
            patientContext = {};
            if (profile?.date_of_birth) {
              const age = Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000);
              patientContext.age = age;
            }
            if (profile?.gender) patientContext.gender = profile.gender;
            if (health?.chronic_diseases) patientContext.chronicDiseases = health.chronic_diseases;
            if (health?.health_allergies) patientContext.allergies = health.health_allergies;
            if (health?.current_medications) patientContext.currentMedications = health.current_medications;
          }
        }

        const { data, error } = await supabase.functions.invoke("smart-doctor-match", {
          body: { symptoms: text, specialties, patientContext },
        });

        if (!error && data?.matches?.length > 0) {
          aiResults = aiMatchesToResults(data.matches, doctors, text);
        }
        if (data?.follow_up_questions?.length) {
          setFollowUpQuestions(data.follow_up_questions);
        }
      } catch (e) {
        console.error("AI match failed, falling back to keyword:", e);
      }
    }

    let finalMatches: MatchResult[];
    if (aiResults.length > 0) {
      finalMatches = aiResults;
      setUsedAI(true);
    } else {
      finalMatches = keywordMatchDoctors(text, doctors);
      setUsedAI(false);
    }

    // Inject rating bonus
    if (ratingsMap) {
      finalMatches = finalMatches.map(m => {
        const bonus = getRatingBonus(ratingsMap[m.doctorId]);
        if (bonus === 0) return m;
        return {
          ...m,
          score: m.score + bonus,
          maxScore: m.maxScore + 8,
          scoreBreakdown: m.scoreBreakdown ? { ...m.scoreBreakdown, ratingBonus: bonus } : undefined,
        };
      });
      finalMatches.sort((a, b) => b.score - a.score);
    }

    setMatches(finalMatches);
    addSearch(text);
    setIsLoading(false);
  }, [doctors, user?.id, addSearch, ratingsMap]);

  useEffect(() => {
    if (initialSymptoms && doctors.length > 0) {
      setSymptoms(initialSymptoms);
      runMatch(initialSymptoms, true);
    }
  }, [initialSymptoms, doctors, runMatch]);

  const handleMatch = () => {
    if (!symptoms.trim()) return;
    runMatch(symptoms, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setTypeaheadOpen(false); handleMatch(); }
  };

  const handleFollowUp = (question: string) => {
    const updated = symptoms.trim() + " — " + question;
    setSymptoms(updated);
    runMatch(updated, false);
  };

  const handleTypeaheadSelect = (keyword: string) => {
    const words = symptoms.split(/[\s,;]+/);
    words[words.length - 1] = keyword;
    setSymptoms(words.join(" ") + " ");
    setTypeaheadOpen(false);
  };

  const toggleCompare = (doctorId: string) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(doctorId)) next.delete(doctorId);
      else if (next.size < 3) next.add(doctorId);
      return next;
    });
  };

  const comparedDoctors = doctors.filter(d => compareIds.has(d.id));

  return (
    <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Sparkles className="h-3.5 w-3.5" />
        Smart Doctor Match
        {usedAI && hasSearched && (
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary gap-0.5">
            <Brain className="h-2.5 w-2.5" />
            AI-powered
          </Badge>
        )}
      </div>

      {/* Recent searches */}
      {!hasSearched && searches.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <History className="h-3 w-3" /> Recent searches
            </span>
            <button onClick={clearSearches} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {searches.map((s, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] px-1.5 py-0.5 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => { setSymptoms(s); runMatch(s, false); }}
              >
                {s.length > 30 ? s.slice(0, 30) + "…" : s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Input row with voice + typeahead */}
      <div className="flex gap-2">
        <Popover open={typeaheadOpen && typeaheadSuggestions.length > 0} onOpenChange={setTypeaheadOpen}>
          <PopoverTrigger asChild>
            <div className="relative flex-1">
              <Input
                placeholder="Describe your symptoms to find the best specialist..."
                value={symptoms}
                onChange={(e) => { setSymptoms(e.target.value); setTypeaheadOpen(true); }}
                onKeyDown={handleKeyDown}
                onFocus={() => typeaheadSuggestions.length > 0 && setTypeaheadOpen(true)}
                className="text-sm h-9 pr-9"
                disabled={isLoading}
              />
              {/* Voice button */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => isListening ? stopListening() : startListening()}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors ${
                    isListening ? "text-destructive animate-pulse bg-destructive/10" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={isListening ? "Stop listening" : "Speak your symptoms"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1">
            {typeaheadSuggestions.map((kw) => (
              <button
                key={kw}
                type="button"
                className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-accent transition-colors"
                onClick={() => handleTypeaheadSelect(kw)}
              >
                {kw}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Button size="sm" onClick={handleMatch} disabled={!symptoms.trim() || isLoading} className="gap-1.5 shrink-0">
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5" />}
          {isLoading ? "Matching…" : "Match"}
        </Button>
      </div>

      {isListening && (
        <div className="flex items-center gap-2 text-xs text-destructive animate-pulse">
          <Mic className="h-3.5 w-3.5" />
          Listening… speak your symptoms
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <Brain className="h-3.5 w-3.5" />
          AI is analyzing your symptoms…
        </div>
      )}

      {!isLoading && hasSearched && matches.length > 0 && (
        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground font-medium">
              {fromPreScreener ? "Matched based on your symptom check:" : "Recommended specialists for your symptoms:"}
            </p>
            {compareMode && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2"
                disabled={compareIds.size < 2}
                onClick={() => setCompareOpen(true)}
              >
                <GitCompareArrows className="h-3 w-3" />
                Compare ({compareIds.size})
              </Button>
            )}
          </div>

          {matches.map((match) => {
            const doctor = doctors.find(d => d.id === match.doctorId);
            if (!doctor) return null;
            return (
              <MatchResultCard
                key={match.doctorId}
                match={match}
                doctor={doctor}
                nextSlot={nextSlots?.[match.doctorId]}
                onSelect={onSelectDoctor}
                compareMode={compareMode}
                isCompared={compareIds.has(match.doctorId)}
                onToggleCompare={toggleCompare}
                ratingStats={ratingsMap?.[match.doctorId]}
              />
            );
          })}
        </div>
      )}

      {/* Follow-up questions */}
      {!isLoading && hasSearched && followUpQuestions.length > 0 && (
        <div className="space-y-1.5 animate-in fade-in-0 duration-200">
          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
            <MessageCircleQuestion className="h-3 w-3" />
            Refine your search:
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {followUpQuestions.map((q, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-[10px] px-2 py-1 cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors"
                onClick={() => handleFollowUp(q)}
              >
                {q}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!isLoading && hasSearched && matches.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No specialist match found for those symptoms. Try browsing all doctors below, or describe different symptoms.
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        {usedAI
          ? "AI-powered matching using symptom analysis. Always confirm with your doctor."
          : "Matches are based on symptom-specialty relevance. Always confirm with your doctor."}
      </p>

      {/* Comparison Drawer */}
      <DoctorComparisonDrawer
        open={compareOpen}
        onOpenChange={setCompareOpen}
        doctors={comparedDoctors}
        matches={matches}
        nextSlots={nextSlots || undefined}
        onSelectDoctor={onSelectDoctor}
        ratingsMap={ratingsMap}
      />
    </div>
  );
}
