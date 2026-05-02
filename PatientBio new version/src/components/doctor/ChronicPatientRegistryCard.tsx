import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDoctorPatients, usePatientHealthData } from "@/hooks/useDoctorPatients";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import {
  ChronicCondition,
  CONDITION_COLORS,
  CONDITION_LABELS,
  detectChronicConditions,
} from "@/constants/chronicCareTemplates";
import { Heart, Users, ChevronRight, Activity } from "lucide-react";
import { Link } from "react-router-dom";

interface ConditionGroup {
  condition: ChronicCondition;
  count: number;
  patientIds: string[];
}

export function ChronicPatientRegistryCard() {
  const { effectiveDoctorId } = useStaffAccess();
  const { data: patients } = useDoctorPatients(effectiveDoctorId || undefined);

  // We'll detect chronic conditions from the patient_profile data we already have
  // Since health_data requires per-patient fetch, we scan display names and use
  // a lightweight approach: store detected conditions from the patient list itself
  const conditionGroups = useMemo(() => {
    if (!patients?.length) return [];

    // For the registry card, we need to scan patients.
    // Since we can't batch-fetch health_data for all patients efficiently,
    // we'll show a summary that links to the full patients page with filter.
    // In a real scenario, this would be powered by a DB view.
    return [];
  }, [patients]);

  // Since we can't efficiently batch-query health data client-side for all patients,
  // show a CTA card that links to the patients page with chronic filter
  const totalPatients = patients?.length || 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          Chronic Patient Care
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Manage patients with ongoing conditions like Diabetes, Hypertension, Asthma, Arthritis, and Cancer.
        </p>

        <div className="grid grid-cols-3 gap-1.5">
          {(["diabetes", "hypertension", "asthma", "arthritis", "cancer", "copd"] as ChronicCondition[]).map((c) => {
            const colors = CONDITION_COLORS[c];
            return (
              <div
                key={c}
                className={`rounded-lg p-2 text-center ${colors.bg} transition-colors`}
              >
                <p className={`text-[10px] font-semibold ${colors.text}`}>
                  {CONDITION_LABELS[c]}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{totalPatients} total patients</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
            <Link to="/doctor/patients">
              View All
              <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
