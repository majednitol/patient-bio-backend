import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Heart, Pill, Phone, Clock, Lock, ShieldAlert, User, Calendar, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseAllergiesText, getSeverityColor, getSeverityLabel } from "@/lib/allergyParser";

interface MedicationDetailed {
  name: string;
  dosage: string | null;
  frequency: string;
}

interface EmergencyData {
  patient_name: string;
  date_of_birth: string | null;
  blood_group: string | null;
  allergies: string[];
  current_medications: string[];
  medications_detailed?: MedicationDetailed[];
  chronic_conditions: string[];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  access_level: string;
  expires_at: string;
}

const EmergencyViewPage = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPin, setRequiresPin] = useState(false);
  const [pin, setPin] = useState("");
  const [remainingTime, setRemainingTime] = useState<string>("");

  const fetchData = async (pinValue?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({ token });
      if (pinValue) {
        queryParams.set("pin", pinValue);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-emergency-patient-data?${queryParams}`,
        { method: "GET", headers: { "Content-Type": "application/json" } }
      );

      const responseData = await response.json();

      if (!response.ok) {
        if (responseData.requires_pin) {
          setRequiresPin(true);
          setLoading(false);
          return;
        }
        throw new Error(responseData.error || "Failed to fetch emergency data");
      }

      setData(responseData as EmergencyData);
      setRequiresPin(false);
    } catch (err) {
      console.error("Emergency data fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load emergency data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  useEffect(() => {
    if (!data?.expires_at) return;
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(data.expires_at);
      const diffMs = expires.getTime() - now.getTime();
      if (diffMs <= 0) {
        setRemainingTime(t("emergencyView.expired"));
        setError(t("emergencyView.emergencyAccessExpired"));
        return;
      }
      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setRemainingTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data?.expires_at, t]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) fetchData(pin);
  };

  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-destructive/10 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-destructive mb-4" />
            <p className="text-muted-foreground">{t("emergencyView.loadingData")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requiresPin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-destructive/10 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{t("emergencyView.pinRequired")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">{t("emergencyView.pinDescription")}</p>
              <Input type="password" placeholder={t("emergencyView.enterPin")} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={6} className="text-center text-2xl tracking-widest font-mono" autoFocus />
              <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={pin.length < 4}>{t("emergencyView.accessEmergencyData")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-destructive/10 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("emergencyView.accessDenied")}</h2>
            <p className="text-muted-foreground text-center">{error || t("emergencyView.unableToAccess")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsedAllergies = parseAllergiesText(data.allergies.join(", "));
  const hasDetailedMeds = data.medications_detailed && data.medications_detailed.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-destructive/10 to-background p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <Card className="border-destructive bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle className="text-destructive">{t("emergencyView.emergencyHealthData")}</CardTitle>
              </div>
              <Badge variant="destructive" className="animate-pulse">
                <Clock className="h-3 w-3 mr-1" />{remainingTime}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("emergencyView.timeLimitedAccess")}</p>
          </CardContent>
        </Card>

        {/* Emergency Contact - prominent at the top */}
        {(data.emergency_contact_name || data.emergency_contact_phone) && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("emergencyView.emergencyContact")}</p>
                  {data.emergency_contact_name && <p className="font-semibold truncate">{data.emergency_contact_name}</p>}
                </div>
                {data.emergency_contact_phone && (
                  <a
                    href={`tel:${data.emergency_contact_phone}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-base shadow-lg hover:bg-destructive/90 transition-colors flex-shrink-0"
                  >
                    <Phone className="h-5 w-5" />
                    Call
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("emergencyView.patientInformation")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold">{data.patient_name}</div>
            {data.date_of_birth && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{t("emergencyView.age", { age: calculateAge(data.date_of_birth) })}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {data.blood_group && (
          <Card className="bg-primary/5 border-primary/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-4">
                <Heart className="h-10 w-10 text-destructive" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">{t("emergencyView.bloodType")}</p>
                  <p className="text-5xl font-bold text-destructive">{data.blood_group}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {parsedAllergies.length > 0 && (
          <Card className="bg-warning/5 border-warning/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle className="text-lg text-warning">{t("emergencyView.allergies")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {parsedAllergies.map((allergy, index) => {
                  const colors = getSeverityColor(allergy.severity);
                  const label = getSeverityLabel(allergy.severity);
                  return (
                    <Badge
                      key={index}
                      variant="outline"
                      className={`${colors.bg} ${colors.border} ${colors.text} text-sm py-1 px-3`}
                    >
                      {allergy.name}
                      {label && (
                        <span className="ml-1.5 text-[10px] opacity-80 uppercase font-bold">({label})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed medications (structured) */}
        {hasDetailedMeds && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-secondary" />
                <CardTitle className="text-lg">{t("emergencyView.currentMedications")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.medications_detailed!.map((med, index) => (
                  <div key={index} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                    <div className="h-2 w-2 rounded-full bg-secondary mt-2 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{med.name}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {med.dosage && <span>{med.dosage}</span>}
                        {med.frequency && <span>• {med.frequency.replace(/_/g, " ")}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fallback: plain text medications (only if no detailed data) */}
        {!hasDetailedMeds && data.current_medications.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-secondary" />
                <CardTitle className="text-lg">{t("emergencyView.currentMedications")}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.current_medications.map((med, index) => (
                  <li key={index} className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-secondary" /><span>{med}</span></li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {data.chronic_conditions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("emergencyView.chronicConditions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.chronic_conditions.map((condition, index) => (
                  <li key={index} className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-muted-foreground" /><span>{condition}</span></li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="text-center py-4 text-xs text-muted-foreground">
          <Separator className="mb-4" />
          <p>{t("emergencyView.poweredBy")}</p>
          <p className="mt-1">{t("emergencyView.accessLogged")}</p>
        </div>
      </div>
    </div>
  );
};

export default EmergencyViewPage;
