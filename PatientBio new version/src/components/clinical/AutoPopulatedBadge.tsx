import { Badge } from "@/components/ui/badge";
import { Bot, Stethoscope, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AutoPopulatedBadgeProps {
  source?: string;
  sourceRef?: string;
  compact?: boolean;
}

export function AutoPopulatedBadge({ source, sourceRef, compact = false }: AutoPopulatedBadgeProps) {
  const { t } = useTranslation();

  if (!source || source === "manual") return null;

  const getSourceInfo = () => {
    if (source.startsWith("auto:prescription")) {
      return {
        icon: Stethoscope,
        label: compact ? t("clinicalRecords.auto.rx", "Rx") : t("clinicalRecords.auto.prescription", "From prescription"),
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    }
    if (source.startsWith("auto:vitals")) {
      return {
        icon: Stethoscope,
        label: compact ? t("clinicalRecords.auto.vitals", "Vitals") : t("clinicalRecords.auto.fromVitals", "From vitals"),
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    }
    if (source.startsWith("auto:doctor_access")) {
      return {
        icon: Stethoscope,
        label: compact ? t("clinicalRecords.auto.dr", "Dr") : t("clinicalRecords.auto.fromDoctor", "Auto-added"),
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    }
    if (source.startsWith("auto:visit_summary")) {
      return {
        icon: Bot,
        label: compact ? "AI" : t("clinicalRecords.auto.fromSummary", "From visit summary"),
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    }
    if (source.startsWith("auto:document")) {
      return {
        icon: FileText,
        label: compact ? t("clinicalRecords.auto.doc", "Doc") : t("clinicalRecords.auto.fromUpload", "From upload"),
        className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
      };
    }
    return {
      icon: Bot,
      label: compact ? "Auto" : t("clinicalRecords.auto.auto", "Auto-populated"),
      className: "bg-muted text-muted-foreground",
    };
  };

  const info = getSourceInfo();
  const Icon = info.icon;

  return (
    <Badge variant="outline" className={`${info.className} gap-1 text-[10px] font-medium`}>
      <Icon className="h-2.5 w-2.5" />
      {info.label}
    </Badge>
  );
}
