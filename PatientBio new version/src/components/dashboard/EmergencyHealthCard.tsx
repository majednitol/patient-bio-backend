import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHealthData } from "@/hooks/useHealthData";
import { Link } from "react-router-dom";
import { ShieldAlert, Droplets, AlertTriangle, Pill, HeartPulse, Phone, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmergencyCardPDF } from "./EmergencyCardPDF";
import { useTranslation } from "react-i18next";
import { parseAllergiesText, getSeverityColor, getSeverityLabel } from "@/lib/allergyParser";

export const EmergencyHealthCard = () => {
  const { healthData, loading } = useHealthData();
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 via-orange-500/5 to-transparent">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const parsedAllergies = parseAllergiesText(healthData?.health_allergies);
  const allergyDisplay = parsedAllergies.length > 0
    ? parsedAllergies.map(a => a.name).join(", ")
    : t("emergencyCard.noneRecorded");
  const hasAllergySeverity = parsedAllergies.some(a => a.severity !== "unknown");

  const infoItems = [
    {
      label: t("emergencyCard.bloodGroup"),
      value: healthData?.blood_group || t("emergencyCard.notSet"),
      icon: Droplets,
      highlight: true,
    },
    {
      label: t("emergencyCard.allergies"),
      value: allergyDisplay,
      icon: AlertTriangle,
      highlight: true,
      allergies: parsedAllergies,
    },
    {
      label: t("emergencyCard.currentMedications"),
      value: healthData?.current_medications || t("emergencyCard.none"),
      icon: Pill,
    },
    {
      label: t("emergencyCard.chronicConditions"),
      value: healthData?.chronic_diseases || t("emergencyCard.none"),
      icon: HeartPulse,
    },
  ];

  const emergencyContact = healthData?.emergency_contact_name && healthData?.emergency_contact_phone
    ? `${healthData.emergency_contact_name} - ${healthData.emergency_contact_phone}`
    : null;

  const emergencyPhone = healthData?.emergency_contact_phone || null;

  const emptyValues = [t("emergencyCard.notSet"), t("emergencyCard.noneRecorded"), t("emergencyCard.none")];

  return (
    <Card className="border-destructive/20 bg-gradient-to-br from-destructive/10 via-orange-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-lg">{t("emergencyCard.title")}</CardTitle>
            <CardDescription>{t("emergencyCard.criticalInfo")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className={`p-3 rounded-lg border ${
                item.highlight
                  ? "bg-destructive/5 border-destructive/20"
                  : "bg-muted/50 border-border/50"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className={`h-3.5 w-3.5 ${item.highlight ? "text-destructive" : "text-muted-foreground"}`} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              {/* Allergy severity badges */}
              {item.allergies && item.allergies.length > 0 && hasAllergySeverity ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.allergies.slice(0, 3).map((a, i) => {
                    const colors = getSeverityColor(a.severity);
                    return (
                      <span
                        key={i}
                        className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                      >
                        {a.name}
                      </span>
                    );
                  })}
                  {item.allergies.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{item.allergies.length - 3}</span>
                  )}
                </div>
              ) : (
                <p className={`text-sm font-semibold truncate ${
                  emptyValues.includes(item.value)
                    ? "text-muted-foreground"
                    : item.highlight ? "text-destructive" : "text-foreground"
                }`}>
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("emergencyCard.emergencyContact")}
                </span>
              </div>
              <p className={`text-sm font-semibold truncate ${emergencyContact ? "text-primary" : "text-muted-foreground"}`}>
                {emergencyContact || t("emergencyCard.noEmergencyContact")}
              </p>
            </div>
            {emergencyPhone && (
              <a
                href={`tel:${emergencyPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold shadow-sm hover:bg-destructive/90 transition-colors flex-shrink-0"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <EmergencyCardPDF />
          <Link to="/dashboard/health-data" className="flex-1">
            <Button variant="outline" className="w-full border-destructive/30 hover:bg-destructive/5">
              {t("emergencyCard.updateHealthData")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
