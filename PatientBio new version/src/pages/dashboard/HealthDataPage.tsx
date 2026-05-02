import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHealthData, HealthDataUpdate } from "@/hooks/useHealthData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Save, Loader2, Phone, User, AlertTriangle, Download } from "lucide-react";
import { FHIRExportDialog } from "@/components/dashboard/FHIRExportDialog";
import { FHIRImportDialog } from "@/components/dashboard/FHIRImportDialog";
import { HealthCardPDF } from "@/components/dashboard/HealthCardPDF";
import { ProvenanceTimelineCard } from "@/components/dashboard/ProvenanceTimeline";
import { MobileStickyFormBar } from "@/components/dashboard/MobileStickyFormBar";
import { useMemo } from "react";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const HealthDataPage = () => {
  const { t } = useTranslation();
  const { healthData, loading, saving, updateHealthData } = useHealthData();
  
  const [formData, setFormData] = useState<HealthDataUpdate>({
    height: "",
    blood_group: "",
    previous_diseases: "",
    current_medications: "",
    bad_habits: "",
    chronic_diseases: "",
    health_allergies: "",
    birth_defects: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    weight: "",
    emergency_contact_relationship: "",
  });

  // Populate form when health data loads
  useEffect(() => {
    if (healthData) {
      setFormData({
        height: healthData.height || "",
        blood_group: healthData.blood_group || "",
        previous_diseases: healthData.previous_diseases || "",
        current_medications: healthData.current_medications || "",
        bad_habits: healthData.bad_habits || "",
        chronic_diseases: healthData.chronic_diseases || "",
        health_allergies: healthData.health_allergies || "",
        birth_defects: healthData.birth_defects || "",
        emergency_contact_name: healthData.emergency_contact_name || "",
        emergency_contact_phone: healthData.emergency_contact_phone || "",
        weight: (healthData as any).weight || "",
        emergency_contact_relationship: (healthData as any).emergency_contact_relationship || "",
      });
    }
  }, [healthData]);

  const handleChange = (field: keyof HealthDataUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHealthData(formData);
  };

  const isDirty = useMemo(() => {
    if (!healthData) return false;
    return Object.keys(formData).some(
      (key) => (formData[key as keyof HealthDataUpdate] || "") !== (healthData[key as keyof typeof healthData] || "")
    );
  }, [formData, healthData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-0 desktop-sidebar pb-20 sm:pb-6">
      <div className="space-y-3 sm:space-y-4">
      <Card className="border-0 shadow-none lg:border lg:shadow-sm dark:lg:border-border/60 dark:lg:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="px-3 py-2.5 sm:px-6 sm:pb-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div>
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg md:text-xl">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                {t("healthDataPage.title")}
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs sm:text-sm md:text-base">
                {t("healthDataPage.subtitle")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <HealthCardPDF />
              <FHIRExportDialog />
              <FHIRImportDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-8">
            {/* Basic Health Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="height" className="text-sm md:text-base">{t("healthData.height")}</Label>
                <Input
                  id="height"
                  placeholder={t("healthDataPage.heightPlaceholder")}
                  value={formData.height || ""}
                  onChange={(e) => handleChange("height", e.target.value)}
                  className="h-10 md:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm md:text-base">{t("healthDataPage.weight")}</Label>
                <Input
                  id="weight"
                  placeholder={t("healthDataPage.weightPlaceholder")}
                  value={formData.weight || ""}
                  onChange={(e) => handleChange("weight", e.target.value)}
                  className="h-10 md:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood_group" className="text-sm md:text-base">{t("healthData.bloodGroup")}</Label>
                <Select
                  value={formData.blood_group || ""}
                  onValueChange={(value) => handleChange("blood_group", value)}
                >
                  <SelectTrigger className="h-10 md:h-11">
                    <SelectValue placeholder={t("healthDataPage.selectBloodGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Medical History */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {t("healthDataPage.medicalHistory")}
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="previous_diseases">{t("healthDataPage.previousDiseases")}</Label>
                <Textarea
                  id="previous_diseases"
                  placeholder={t("healthDataPage.previousDiseasesPlaceholder")}
                  className="min-h-[48px] sm:min-h-[80px]"
                  value={formData.previous_diseases || ""}
                  onChange={(e) => handleChange("previous_diseases", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_medications">{t("healthDataPage.currentMedications")}</Label>
                <Textarea
                  id="current_medications"
                  placeholder={t("healthDataPage.currentMedicationsPlaceholder")}
                  className="min-h-[48px] sm:min-h-[80px]"
                  value={formData.current_medications || ""}
                  onChange={(e) => handleChange("current_medications", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chronic_diseases">{t("healthDataPage.chronicDiseases")}</Label>
                <Textarea
                  id="chronic_diseases"
                  placeholder={t("healthDataPage.chronicDiseasesPlaceholder")}
                  className="min-h-[48px] sm:min-h-[80px]"
                  value={formData.chronic_diseases || ""}
                  onChange={(e) => handleChange("chronic_diseases", e.target.value)}
                />
              </div>
            </div>

            {/* Allergies & Other */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {t("healthDataPage.allergiesOther")}
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="health_allergies" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {t("healthDataPage.healthAllergies")}
                </Label>
                <Textarea
                  id="health_allergies"
                  placeholder={t("healthDataPage.allergiesPlaceholder")}
                  className="min-h-[48px] sm:min-h-[80px]"
                  value={formData.health_allergies || ""}
                  onChange={(e) => handleChange("health_allergies", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birth_defects">{t("healthDataPage.birthDefects")}</Label>
                <Textarea
                  id="birth_defects"
                  placeholder={t("healthDataPage.birthDefectsPlaceholder")}
                  className="min-h-[48px] sm:min-h-[80px]"
                  value={formData.birth_defects || ""}
                  onChange={(e) => handleChange("birth_defects", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bad_habits">{t("healthDataPage.lifestyleHabits")}</Label>
                <Textarea
                  id="bad_habits"
                  placeholder={t("healthDataPage.lifestyleHabitsPlaceholder")}
                  className="min-h-[48px] sm:min-h-[80px]"
                  value={formData.bad_habits || ""}
                  onChange={(e) => handleChange("bad_habits", e.target.value)}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                {t("healthDataPage.emergencyContact")}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name" className="text-sm md:text-base">{t("healthDataPage.contactName")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emergency_contact_name"
                      placeholder={t("healthDataPage.emergencyNamePlaceholder")}
                      className="pl-10 h-10 md:h-11"
                      value={formData.emergency_contact_name || ""}
                      onChange={(e) => handleChange("emergency_contact_name", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone" className="text-sm md:text-base">{t("healthDataPage.contactPhone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      placeholder={t("healthDataPage.emergencyPhonePlaceholder")}
                      className="pl-10 h-10 md:h-11"
                      value={formData.emergency_contact_phone || ""}
                      onChange={(e) => handleChange("emergency_contact_phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_relationship" className="text-sm md:text-base">{t("healthDataPage.emergencyRelationship")}</Label>
                  <Select
                    value={formData.emergency_contact_relationship || ""}
                    onValueChange={(value) => handleChange("emergency_contact_relationship", value)}
                  >
                    <SelectTrigger className="h-10 md:h-11">
                      <SelectValue placeholder={t("healthDataPage.selectRelationship")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">{t("healthDataPage.relationshipSpouse")}</SelectItem>
                      <SelectItem value="parent">{t("healthDataPage.relationshipParent")}</SelectItem>
                      <SelectItem value="sibling">{t("healthDataPage.relationshipSibling")}</SelectItem>
                      <SelectItem value="child">{t("healthDataPage.relationshipChild")}</SelectItem>
                      <SelectItem value="friend">{t("healthDataPage.relationshipFriend")}</SelectItem>
                      <SelectItem value="other">{t("healthDataPage.relationshipOther")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Desktop Save button */}
            <div className="hidden lg:block">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-secondary border-0 touch-target"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("healthDataPage.saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("healthDataPage.saveHealthData")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>

      {/* Right Column: Provenance Timeline */}
      <div>
        <ProvenanceTimelineCard
          title={t("healthDataPage.healthDataHistory")}
          resourceType="health_data"
          limit={10}
        />
      </div>

      {/* Mobile sticky save bar */}
      <MobileStickyFormBar
        isDirty={isDirty}
        isSaving={saving}
        onSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
      />
    </div>
  );
};

export default HealthDataPage;
