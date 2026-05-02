import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useHealthData } from "@/hooks/useHealthData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Download, Loader2, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pdfSafe } from "@/utils/pdfSafe";

export const EmergencyCardPDF = () => {
  const { t } = useTranslation();
  const { healthData } = useHealthData();
  const { profile } = useUserProfile();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateEmergencyCard = async () => {
    if (!healthData) {
      toast({
        title: t("emergencyCardPdf.noHealthData"),
        description: t("emergencyCardPdf.addHealthFirst"),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { default: jsPDF } = await import("jspdf");
      
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98],
      });

      const cardWidth = 85.6;
      const cardHeight = 53.98;
      const margin = 3;

      doc.setFillColor(220, 38, 38);
      doc.rect(0, 0, cardWidth, 12, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(t("emergencyCardPdf.headerTitle"), cardWidth / 2, 7.5, { align: "center" });

      doc.setFillColor(255, 255, 255);
      doc.rect(4, 3.5, 6, 2, "F");
      doc.rect(5.5, 2, 3, 5, "F");

      let yPos = 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      const displayName = pdfSafe(profile?.display_name) || "Patient Name";
      doc.text(displayName, margin, yPos);

      if (healthData.blood_group) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text(healthData.blood_group, cardWidth - margin, yPos, { align: "right" });
      }

      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);

      if (healthData.health_allergies) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text(t("emergencyCardPdf.allergiesLabel"), margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const allergiesText = pdfSafe(healthData.health_allergies);
        const truncAllergies = allergiesText.length > 40 
          ? allergiesText.substring(0, 37) + "..." 
          : allergiesText;
        doc.text(truncAllergies, margin + 14, yPos);
        yPos += 4;
      }

      if (healthData.current_medications) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(37, 99, 235);
        doc.text(t("emergencyCardPdf.medicationsLabel"), margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const medsText = pdfSafe(healthData.current_medications);
        const truncMeds = medsText.length > 35 
          ? medsText.substring(0, 32) + "..." 
          : medsText;
        doc.text(truncMeds, margin + 18, yPos);
        yPos += 4;
      }

      if (healthData.chronic_diseases) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text(t("emergencyCardPdf.conditionsLabel"), margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        const conditionsText = pdfSafe(healthData.chronic_diseases);
        const truncConditions = conditionsText.length > 35 
          ? conditionsText.substring(0, 32) + "..." 
          : conditionsText;
        doc.text(truncConditions, margin + 17, yPos);
        yPos += 4;
      }

      if (healthData.emergency_contact_name || healthData.emergency_contact_phone) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, cardHeight - 12, cardWidth - margin, cardHeight - 12);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(100, 100, 100);
        doc.text(t("emergencyCardPdf.emergencyContact"), margin, cardHeight - 9);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        const contactInfo = [
          pdfSafe(healthData.emergency_contact_name),
          pdfSafe(healthData.emergency_contact_phone),
        ].filter(Boolean).join(" - ");
        doc.text(contactInfo, margin, cardHeight - 5.5);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(4);
      doc.setTextColor(150, 150, 150);
      doc.text(
        t("emergencyCardPdf.generatedDate", { date: format(new Date(), "MMM d, yyyy") }),
        cardWidth - margin,
        cardHeight - 1.5,
        { align: "right" }
      );

      const fileName = `emergency_card_${displayName.replace(/\s+/g, "_")}.pdf`;
      doc.save(fileName);

      toast({
        title: t("emergencyCardPdf.cardGenerated"),
        description: t("emergencyCardPdf.cardDownloaded"),
      });
    } catch (error) {
      console.error("Error generating emergency card:", error);
      toast({
        title: t("emergencyCardPdf.generationFailed"),
        description: t("emergencyCardPdf.generationFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!healthData) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateEmergencyCard}
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      {t("emergencyCardPdf.downloadCard")}
    </Button>
  );
};