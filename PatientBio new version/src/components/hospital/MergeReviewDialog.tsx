import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Phone, Shield, X, Merge, FileText, Stethoscope, Loader2, Brain, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { STALE_TIMES } from "@/lib/queryConfig";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MergeCandidate } from "@/hooks/useMergeCandidates";
import { useDismissMergeCandidate } from "@/hooks/useMergeCandidates";
import { useMergePatients } from "@/hooks/useMergePatients";

interface MergeReviewDialogProps {
  candidate: MergeCandidate | null;
  onClose: () => void;
}

function usePatientStats(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-merge-stats", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const [appts, prescriptions, lastVisit] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patientId!),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", patientId!),
        supabase.from("appointments").select("appointment_date").eq("patient_id", patientId!).order("appointment_date", { ascending: false }).limit(1),
      ]);

      return {
        appointmentCount: appts.count || 0,
        prescriptionCount: prescriptions.count || 0,
        lastVisit: lastVisit.data?.[0]?.appointment_date || null,
      };
    },
  });
}

function useAIMergeAssessment(candidate: MergeCandidate | null) {
  return useQuery({
    queryKey: ["ai-merge-assessment", candidate?.id],
    enabled: !!candidate,
    staleTime: STALE_TIMES.EXPENSIVE,
    queryFn: async () => {
      if (!candidate) return null;

      const { data, error } = await supabase.functions.invoke("suggest-diagnosis", {
        body: {
          chief_complaint: `MERGE ASSESSMENT REQUEST - NOT A DIAGNOSIS.
Compare these two patient profiles and determine if they are the same person:

Patient A:
- Name: ${candidate.profile_a?.display_name || "Unknown"}
- DOB: ${candidate.profile_a?.date_of_birth || "Unknown"}
- Phone: ${candidate.profile_a?.phone || "Unknown"}
- Gender: ${candidate.profile_a?.gender || "Unknown"}
- Passport ID: ${candidate.profile_a?.patient_passport_id || "None"}

Patient B:
- Name: ${candidate.profile_b?.display_name || "Unknown"}
- DOB: ${candidate.profile_b?.date_of_birth || "Unknown"}
- Phone: ${candidate.profile_b?.phone || "Unknown"}
- Gender: ${candidate.profile_b?.gender || "Unknown"}
- Passport ID: ${candidate.profile_b?.patient_passport_id || "None"}

Match factors: Name similarity ${Math.round((candidate.match_factors?.name_similarity || 0) * 100)}%, DOB match: ${candidate.match_factors?.dob_match ? "Yes" : "No"}, Phone match: ${candidate.match_factors?.phone_match ? "Yes" : "No"}

Instead of diagnosis suggestions, respond with:
{
  "suggestions": [{
    "diagnosis": "SAME_PERSON" or "DIFFERENT_PEOPLE",
    "confidence": "high" or "medium" or "low",
    "reasoning": "Detailed explanation of why these patients are or are not the same person",
    "medications": [],
    "general_instructions": "Recommendation for the admin"
  }]
}`,
        },
      });

      if (error) return null;

      const suggestion = data?.suggestions?.[0];
      if (!suggestion) return null;

      return {
        verdict: suggestion.diagnosis as string,
        confidence: suggestion.confidence as string,
        reasoning: suggestion.reasoning as string,
        recommendation: suggestion.general_instructions as string,
      };
    },
  });
}

export default function MergeReviewDialog({ candidate, onClose }: MergeReviewDialogProps) {
  const dismiss = useDismissMergeCandidate();
  const mergePatients = useMergePatients();

  const statsA = usePatientStats(candidate?.patient_id_a);
  const statsB = usePatientStats(candidate?.patient_id_b);
  const aiAssessment = useAIMergeAssessment(candidate);

  if (!candidate) return null;

  const handleDismiss = () => {
    dismiss.mutate({ candidateId: candidate.id, status: "dismissed" }, { onSuccess: onClose });
  };

  const handleMerge = () => {
    mergePatients.mutate({
      keepPatientId: candidate.patient_id_a,
      mergePatientId: candidate.patient_id_b,
      candidateId: candidate.id,
    }, { onSuccess: onClose });
  };

  const isPending = dismiss.isPending || mergePatients.isPending;

  const ProfileColumn = ({ profile, label, stats }: { profile: MergeCandidate["profile_a"]; label: string; stats: ReturnType<typeof usePatientStats> }) => (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-3 w-3 text-muted-foreground" />
          <span>{profile?.display_name || "Unknown"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span>
            {profile?.date_of_birth
              ? format(new Date(profile.date_of_birth), "MMM d, yyyy")
              : "No DOB"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span>{profile?.phone || "No phone"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-mono">
            {profile?.patient_passport_id || "No GHPID"}
          </span>
        </div>
        {profile?.gender && (
          <Badge variant="outline" className="text-xs">{profile.gender}</Badge>
        )}
        <Separator />
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Stethoscope className="h-3 w-3" />
            <span>{stats.data?.appointmentCount ?? "..."} appointments</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>{stats.data?.prescriptionCount ?? "..."} prescriptions</span>
          </div>
          {stats.data?.lastVisit && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Last visit: {format(new Date(stats.data.lastVisit), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={!!candidate} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-primary" />
            Review Duplicate Pair
          </DialogTitle>
          <DialogDescription>
            Confidence: {Math.round(candidate.confidence_score * 100)}% match
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3">
          <ProfileColumn profile={candidate.profile_a} label="Patient A (Keep)" stats={statsA} />
          <ProfileColumn profile={candidate.profile_b} label="Patient B (Merge)" stats={statsB} />
        </div>

        <Separator />

        {/* AI Assessment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Assessment
          </div>
          {aiAssessment.isLoading ? (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Analyzing patient profiles...</span>
            </div>
          ) : aiAssessment.data ? (
            <div className={`p-3 rounded-lg border ${
              aiAssessment.data.verdict === "SAME_PERSON"
                ? "border-primary/30 bg-primary/5"
                : "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <Badge variant="outline" className="text-[10px]">
                  {aiAssessment.data.confidence} confidence
                </Badge>
                <Badge variant={aiAssessment.data.verdict === "SAME_PERSON" ? "default" : "secondary"} className="text-[10px]">
                  {aiAssessment.data.verdict === "SAME_PERSON" ? "Likely same person" : "Likely different"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{aiAssessment.data.reasoning}</p>
              {aiAssessment.data.recommendation && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">{aiAssessment.data.recommendation}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">AI assessment unavailable</p>
          )}
        </div>

        <Separator />

        <div className="space-y-1">
          <p className="text-sm font-medium">Match Details</p>
          <div className="flex flex-wrap gap-2">
            {candidate.match_factors?.name_similarity && (
              <Badge variant="outline">
                Name: {Math.round(candidate.match_factors.name_similarity * 100)}% similar
              </Badge>
            )}
            {candidate.match_factors?.dob_match && (
              <Badge variant="outline">DOB: Exact match</Badge>
            )}
            {candidate.match_factors?.phone_match && (
              <Badge variant="outline">Phone: Exact match</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Merging will move all of Patient B's records (appointments, prescriptions) to Patient A.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleDismiss} disabled={isPending}>
            <X className="h-4 w-4 mr-1" />
            Not Duplicate
          </Button>
          <Button onClick={handleMerge} disabled={isPending}>
            {mergePatients.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Merge className="h-4 w-4 mr-1" />}
            Merge Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
