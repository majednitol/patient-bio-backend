import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote } from "lucide-react";

interface CostEstimateCardProps {
  consultationFee: number | null | undefined;
  doctorName?: string | null;
  specialty?: string | null;
}

export function CostEstimateCard({ consultationFee, doctorName, specialty }: CostEstimateCardProps) {
  const { t } = useTranslation();

  if (!consultationFee || consultationFee <= 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Banknote className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {doctorName ? t("medications.drName", { name: doctorName }) : t("medications.costEstimate")}
              {specialty && ` · ${specialty}`}
            </p>
            <p className="text-sm font-semibold text-foreground">
              ৳{consultationFee.toLocaleString("en-BD")}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0 border-primary/30 text-primary">
          {t("medications.estimated")}
        </Badge>
      </CardContent>
    </Card>
  );
}