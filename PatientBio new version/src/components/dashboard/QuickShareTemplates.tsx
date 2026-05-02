import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Stethoscope, FlaskConical, ShieldCheck, ClipboardList } from "lucide-react";
import { SharedScopes, DEFAULT_SCOPES } from "./DataScopeSelector";

export interface ShareTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  expiryHours: string;
  scopes: SharedScopes;
}

interface QuickShareTemplatesProps {
  onSelect: (template: ShareTemplate) => void;
}

const QuickShareTemplates = ({ onSelect }: QuickShareTemplatesProps) => {
  const { t } = useTranslation();

  const TEMPLATES: ShareTemplate[] = [
    {
      id: "emergency",
      name: t("quickShare.emergencyVisit"),
      description: t("quickShare.emergencyVisitDesc"),
      icon: <Zap className="h-4 w-4" />,
      expiryHours: "24",
      scopes: {
        all: false,
        profile: true,
        health_summary: true,
        allergies: true,
        medications: true,
        records: false,
        record_ids: [],
        categories: [],
        emergency_contact: true,
        clinical_records: false,
      },
    },
    {
      id: "specialist",
      name: t("quickShare.specialistReferral"),
      description: t("quickShare.specialistReferralDesc"),
      icon: <Stethoscope className="h-4 w-4" />,
      expiryHours: "168",
      scopes: {
        all: false,
        profile: true,
        health_summary: true,
        allergies: true,
        medications: true,
        records: true,
        record_ids: [],
        categories: [],
        emergency_contact: false,
        clinical_records: true,
      },
    },
    {
      id: "clinical_handover",
      name: t("quickShare.clinicalHandover", "Clinical Handover"),
      description: t("quickShare.clinicalHandoverDesc", "Full clinical snapshot for provider transfers"),
      icon: <ClipboardList className="h-4 w-4" />,
      expiryHours: "720",
      scopes: {
        all: false,
        profile: true,
        health_summary: true,
        allergies: true,
        medications: true,
        records: true,
        record_ids: [],
        categories: [],
        emergency_contact: true,
        clinical_records: true,
      },
    },
    {
      id: "lab",
      name: t("quickShare.labResultsOnly"),
      description: t("quickShare.labResultsOnlyDesc"),
      icon: <FlaskConical className="h-4 w-4" />,
      expiryHours: "48",
      scopes: {
        all: false,
        profile: false,
        health_summary: false,
        allergies: false,
        medications: false,
        records: true,
        record_ids: [],
        categories: [],
        emergency_contact: false,
        clinical_records: false,
      },
    },
    {
      id: "full",
      name: t("quickShare.fullAccess"),
      description: t("quickShare.fullAccessDesc"),
      icon: <ShieldCheck className="h-4 w-4" />,
      expiryHours: "720",
      scopes: { ...DEFAULT_SCOPES },
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("quickShare.title")}</p>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant="outline"
            className="h-auto py-1.5 sm:py-3 px-2 sm:px-3 flex flex-col items-start gap-0.5 sm:gap-1 text-left whitespace-normal"
            onClick={() => onSelect(template)}
          >
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-primary shrink-0">{template.icon}</span>
              <span className="text-[11px] sm:text-sm font-medium leading-tight">{template.name}</span>
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{template.description}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickShareTemplates;