import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShieldAlert, Bell, BellOff, CheckCircle, Loader2 } from "lucide-react";
import type { AbnormalFlag } from "./AbnormalFlagEditor";

// Configurable critical ranges per common test type
export const CRITICAL_RANGES: Record<string, { low?: number; high?: number; unit: string }> = {
  // Hematology
  "Hemoglobin": { low: 7.0, high: 20.0, unit: "g/dL" },
  "WBC": { low: 2.0, high: 30.0, unit: "×10³/µL" },
  "Platelet Count": { low: 50, high: 1000, unit: "×10³/µL" },
  "Hematocrit": { low: 20, high: 60, unit: "%" },
  // Chemistry
  "Glucose": { low: 40, high: 500, unit: "mg/dL" },
  "Potassium": { low: 2.5, high: 6.5, unit: "mEq/L" },
  "Sodium": { low: 120, high: 160, unit: "mEq/L" },
  "Calcium": { low: 6.0, high: 13.0, unit: "mg/dL" },
  "Creatinine": { high: 10.0, unit: "mg/dL" },
  "Troponin": { high: 0.4, unit: "ng/mL" },
  "INR": { high: 5.0, unit: "" },
  // Blood Gases
  "pH": { low: 7.2, high: 7.6, unit: "" },
  "pO2": { low: 40, unit: "mmHg" },
  "pCO2": { low: 20, high: 70, unit: "mmHg" },
  // Liver
  "Bilirubin": { high: 15.0, unit: "mg/dL" },
  "AST": { high: 500, unit: "U/L" },
  "ALT": { high: 500, unit: "U/L" },
};

export interface CriticalDetection {
  flagIndex: number;
  flag: AbnormalFlag;
  reason: string;
}

/**
 * Detect critical values from abnormal flags by checking against known critical ranges
 */
export function detectCriticalValues(flags: AbnormalFlag[]): CriticalDetection[] {
  const criticals: CriticalDetection[] = [];

  flags.forEach((flag, index) => {
    // Already marked critical by user
    if (flag.severity === "critical") {
      criticals.push({ flagIndex: index, flag, reason: "Manually flagged as critical" });
      return;
    }

    // Auto-detect from known ranges
    const numValue = parseFloat(flag.value);
    if (isNaN(numValue)) return;

    // Try exact match first, then case-insensitive
    const rangeName = Object.keys(CRITICAL_RANGES).find(
      (k) => k.toLowerCase() === flag.name.toLowerCase()
    );
    if (!rangeName) return;

    const range = CRITICAL_RANGES[rangeName];
    if (range.low !== undefined && numValue < range.low) {
      criticals.push({
        flagIndex: index,
        flag,
        reason: `${flag.value} ${flag.unit} is below critical low (${range.low} ${range.unit})`,
      });
    }
    if (range.high !== undefined && numValue > range.high) {
      criticals.push({
        flagIndex: index,
        flag,
        reason: `${flag.value} ${flag.unit} is above critical high (${range.high} ${range.unit})`,
      });
    }
  });

  return criticals;
}

interface CriticalValueAlertBannerProps {
  flags: AbnormalFlag[];
  doctorId?: string | null;
  onNotifyDoctor?: () => Promise<void>;
  notified?: boolean;
}

export function CriticalValueAlertBanner({
  flags,
  doctorId,
  onNotifyDoctor,
  notified = false,
}: CriticalValueAlertBannerProps) {
  const [criticals, setCriticals] = useState<CriticalDetection[]>([]);
  const [isNotifying, setIsNotifying] = useState(false);
  const [hasNotified, setHasNotified] = useState(notified);

  useEffect(() => {
    setCriticals(detectCriticalValues(flags));
  }, [flags]);

  useEffect(() => {
    setHasNotified(notified);
  }, [notified]);

  if (criticals.length === 0) return null;

  const handleNotify = async () => {
    if (!onNotifyDoctor) return;
    setIsNotifying(true);
    try {
      await onNotifyDoctor();
      setHasNotified(true);
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
      <ShieldAlert className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold flex items-center gap-2">
        Critical Value Alert
        <Badge variant="destructive" className="text-[10px] uppercase tracking-wider">
          {criticals.length} Critical
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <div className="space-y-1.5">
          {criticals.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm bg-destructive/10 rounded-md px-3 py-1.5"
            >
              <span className="font-semibold text-destructive">{c.flag.name}:</span>
              <span className="font-bold">
                {c.flag.value} {c.flag.unit}
              </span>
              <span className="text-muted-foreground text-xs">— {c.reason}</span>
            </div>
          ))}
        </div>

        <Separator className="bg-destructive/20" />

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Critical values require immediate physician notification per lab protocol.
          </p>
          {doctorId && onNotifyDoctor && (
            <Button
              type="button"
              size="sm"
              variant={hasNotified ? "outline" : "destructive"}
              onClick={handleNotify}
              disabled={isNotifying || hasNotified}
              className="shrink-0"
            >
              {isNotifying ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Notifying...</>
              ) : hasNotified ? (
                <><CheckCircle className="h-3 w-3 mr-1" />Doctor Notified</>
              ) : (
                <><Bell className="h-3 w-3 mr-1" />Notify Doctor Now</>
              )}
            </Button>
          )}
          {!doctorId && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <BellOff className="h-3 w-3" />
              No ordering doctor linked
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
