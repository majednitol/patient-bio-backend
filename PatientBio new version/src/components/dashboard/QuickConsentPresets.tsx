import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConsentRecords, ConsentType, GrantedToType } from "@/hooks/useConsentRecords";
import { useConsentTemplates, ConsentTemplate } from "@/hooks/useConsentTemplates";
import { useToast } from "@/hooks/use-toast";
import {
  Stethoscope,
  FlaskConical,
  Shield,
  Clock,
  Zap,
  Loader2,
  HeartPulse,
  MessageSquare,
  Microscope,
} from "lucide-react";
import { useState } from "react";

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope,
  FlaskConical,
  Shield,
  Clock,
  HeartPulse,
  MessageSquare,
  Microscope,
};

interface QuickConsentPresetsProps {
  targetDoctorId?: string;
}

export function QuickConsentPresets({ targetDoctorId }: QuickConsentPresetsProps) {
  const { t } = useTranslation();
  const { createConsent, isCreating } = useConsentRecords();
  const { data: templates, isLoading: templatesLoading } = useConsentTemplates();
  const { toast } = useToast();
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const handleActivate = (template: ConsentTemplate) => {
    setActivatingId(template.id);
    const expiresAt = template.expiry_days
      ? new Date(Date.now() + template.expiry_days * 86400000).toISOString()
      : null;

    createConsent(
      {
        consent_type: template.consent_type as ConsentType,
        granted_to_id: targetDoctorId || null,
        granted_to_type: (template.granted_to_type as GrantedToType) || null,
        purpose: template.purpose,
        scope: template.scope,
        expires_at: expiresAt,
      },
      {
        onSuccess: () => {
          toast({ title: t("quickConsent.consentActivated"), description: t("quickConsent.consentActivatedDesc", { name: template.name }) });
          setActivatingId(null);
        },
        onError: () => {
          setActivatingId(null);
        },
      }
    );
  };

  const items = templates || [];

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          {t("quickConsent.title")}
        </CardTitle>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          {t("quickConsent.description")}
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {templatesLoading ? (
          <div className="flex items-center gap-2 p-4 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t("quickConsent.loadingTemplates")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {items.map((template) => {
              const Icon = ICON_MAP[template.icon_name || "Shield"] || Shield;
              const isActivating = activatingId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleActivate(template)}
                  disabled={isCreating}
                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border bg-card hover:bg-accent/30 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="p-1 sm:p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs sm:text-sm font-medium truncate">{template.name}</span>
                      {isActivating && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                    {template.expiry_days && (
                      <Badge variant="outline" className="text-[10px] mt-1 sm:mt-1.5 px-1 sm:px-1.5 py-0">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {t("quickConsent.expiryDays", { days: template.expiry_days })}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
