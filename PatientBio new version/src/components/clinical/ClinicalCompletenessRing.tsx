import { useTranslation } from "react-i18next";
import { useBackgroundInfo, useComorbidities, useClinicalInvestigations, useTreatments, useCareTeam, useComplicationsStatus } from "@/hooks/useClinicalRecords";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";

interface TabScore {
  value: string;
  label: string;
  filled: boolean;
}

export function useClinicalCompleteness() {
  const { t } = useTranslation();
  const bg = useBackgroundInfo();
  const co = useComorbidities();
  const inv = useClinicalInvestigations();
  const tx = useTreatments();
  const ct = useCareTeam();
  const cs = useComplicationsStatus();

  const isLoading = bg.isLoading || co.isLoading || inv.isLoading || tx.isLoading || ct.isLoading || cs.isLoading;

  const tabs: TabScore[] = [
    { value: "background", label: t("clinicalRecords.tabs.background"), filled: !!(bg.data && (bg.data.education_level || bg.data.occupation || bg.data.family_history)) },
    { value: "comorbidities", label: t("clinicalRecords.tabs.comorbidities"), filled: !!(co.data && ((co.data.comorbidity_list as string[] | null)?.length ?? 0) > 0) },
    { value: "investigations", label: t("clinicalRecords.tabs.investigations"), filled: !!(inv.data && inv.data.length > 0) },
    { value: "treatments", label: t("clinicalRecords.tabs.treatments"), filled: !!(tx.data && tx.data.length > 0) },
    { value: "care-team", label: t("clinicalRecords.tabs.careTeam"), filled: !!(ct.data && ct.data.length > 0) },
    { value: "complications", label: t("clinicalRecords.tabs.complications"), filled: !!(cs.data && (cs.data.treatment_response || ((cs.data.current_complications as string[] | null)?.length ?? 0) > 0)) },
  ];

  const score = Math.round((tabs.filter((t) => t.filled).length / tabs.length) * 100);

  return { tabs, score, isLoading };
}

export function ClinicalCompletenessRing() {
  const { t } = useTranslation();
  const { tabs, score, isLoading } = useClinicalCompleteness();

  if (isLoading) return null;

  return (
    <>
      {/* Mobile: compact inline strip */}
      <div className="flex sm:hidden items-center gap-2.5 p-2.5 rounded-xl border bg-card">
        <span className="text-lg font-bold text-primary min-w-[40px]">{score}%</span>
        <Progress value={score} className="h-1.5 flex-1" />
        <div className="flex items-center gap-1.5">
          {tabs.map((tab) => (
            <div
              key={tab.value}
              title={tab.label}
              className={`h-2 w-2 rounded-full ${tab.filled ? "bg-green-500" : "bg-muted-foreground/30"}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: full layout */}
      <div className="hidden sm:flex items-center gap-4 p-4 rounded-xl border bg-card">
        <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
          <span className="text-2xl font-bold text-primary">{score}%</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t("clinicalRecords.complete")}</span>
        </div>
        <div className="flex-1 space-y-2">
          <Progress value={score} className="h-2" />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {tabs.map((tab) => (
              <span key={tab.value} className={`text-xs flex items-center gap-1 ${tab.filled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                {tab.filled && <CheckCircle2 className="h-3 w-3" />}
                {tab.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
