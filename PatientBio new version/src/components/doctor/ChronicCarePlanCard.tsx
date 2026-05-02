import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import {
  useChronicCarePlans,
  useCreateCarePlan,
  useUpdateCarePlanMilestones,
  useUpdateCarePlanStatus,
  ChronicCarePlan,
} from "@/hooks/useChronicCarePlans";
import {
  ChronicCondition,
  CONDITION_COLORS,
  CONDITION_LABELS,
  CARE_PLAN_TEMPLATES,
  CarePlanMilestone,
  detectChronicConditions,
} from "@/constants/chronicCareTemplates";
import { Heart, Plus, Loader2, CheckCircle, Pause, Play, ClipboardList } from "lucide-react";
import { format, addWeeks } from "date-fns";

interface ChronicCarePlanCardProps {
  patientId: string;
  chronicDiseases?: string | null;
}

export function ChronicCarePlanCard({ patientId, chronicDiseases }: ChronicCarePlanCardProps) {
  const { user } = useAuth();
  const { data: plans, isLoading } = useChronicCarePlans(patientId);
  const createPlan = useCreateCarePlan();
  const updateMilestones = useUpdateCarePlanMilestones();
  const updateStatus = useUpdateCarePlanStatus();

  const detectedConditions = detectChronicConditions(chronicDiseases);

  if (!detectedConditions.length && !plans?.length) return null;

  const activePlans = plans?.filter((p) => p.status === "active") || [];
  const hasPlans = (plans?.length || 0) > 0;

  const handleCreateFromTemplate = (condition: ChronicCondition) => {
    if (!user?.id) return;
    const template = CARE_PLAN_TEMPLATES.find((t) => t.condition === condition);
    if (!template) return;

    const milestones: CarePlanMilestone[] = template.milestones.map((m, i) => ({
      id: `ms-${Date.now()}-${i}`,
      title: m.title,
      frequency: m.frequency,
      completed: false,
    }));

    createPlan.mutate({
      patient_id: patientId,
      doctor_id: user.id,
      condition_type: condition,
      plan_name: template.planName,
      milestones,
      next_review_date: format(addWeeks(new Date(), template.defaultFollowUpWeeks), "yyyy-MM-dd"),
    });
  };

  const toggleMilestone = (plan: ChronicCarePlan, milestoneId: string) => {
    const updated = plan.milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date().toISOString() : undefined }
        : m
    );
    updateMilestones.mutate({ planId: plan.id, milestones: updated });
  };

  // Conditions that don't have a plan yet
  const uncoveredConditions = detectedConditions.filter(
    (c) => !plans?.some((p) => p.condition_type === c && p.status !== "completed")
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Chronic Care Plans
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Detected conditions badges */}
        <div className="flex flex-wrap gap-1.5">
          {detectedConditions.map((c) => (
            <Badge key={c} className={`text-[10px] ${CONDITION_COLORS[c].badge}`}>
              {CONDITION_LABELS[c]}
            </Badge>
          ))}
        </div>

        {/* Active care plans */}
        {activePlans.map((plan) => {
          const completedCount = plan.milestones.filter((m) => m.completed).length;
          const totalCount = plan.milestones.length;
          const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          const colors = CONDITION_COLORS[plan.condition_type];

          return (
            <div key={plan.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${colors.badge}`}>
                    {CONDITION_LABELS[plan.condition_type]}
                  </Badge>
                  <span className="text-xs font-medium">{plan.plan_name}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateStatus.mutate({ planId: plan.id, status: "paused" })}
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateStatus.mutate({ planId: plan.id, status: "completed" })}
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Progress value={progress} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground">
                  {completedCount}/{totalCount}
                </span>
              </div>

              {plan.next_review_date && (
                <p className="text-[10px] text-muted-foreground">
                  Next review: {format(new Date(plan.next_review_date), "MMM d, yyyy")}
                </p>
              )}

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {plan.milestones.map((ms) => (
                  <label
                    key={ms.id}
                    className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1"
                  >
                    <Checkbox
                      checked={ms.completed}
                      onCheckedChange={() => toggleMilestone(plan, ms.id)}
                      className="h-3.5 w-3.5"
                    />
                    <span className={ms.completed ? "line-through text-muted-foreground" : ""}>
                      {ms.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{ms.frequency}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* Paused plans indicator */}
        {plans?.filter((p) => p.status === "paused").map((plan) => (
          <div key={plan.id} className="border rounded-lg p-2 flex items-center justify-between opacity-60">
            <div className="flex items-center gap-2">
              <Pause className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs">{plan.plan_name}</span>
              <Badge variant="secondary" className="text-[10px]">Paused</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => updateStatus.mutate({ planId: plan.id, status: "active" })}
            >
              <Play className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Create plan buttons for uncovered conditions */}
        {uncoveredConditions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground font-medium">
              Add care plan:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {uncoveredConditions.map((c) => (
                <Button
                  key={c}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] gap-1"
                  onClick={() => handleCreateFromTemplate(c)}
                  disabled={createPlan.isPending}
                >
                  {createPlan.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                  {CONDITION_LABELS[c]} Plan
                </Button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Loading care plans...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
