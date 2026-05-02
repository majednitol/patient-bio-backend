import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useHealthData } from "@/hooks/useHealthData";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useHealthRecords } from "@/hooks/useHealthRecords";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pdfSafe } from "@/utils/pdfSafe";

export const HealthCardPDF = () => {
  const { t } = useTranslation();
  const { healthData } = useHealthData();
  const { profile } = useUserProfile();
  const { records } = useHealthRecords();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateHealthCardPDF = async () => {
    if (!healthData && !profile) {
      toast({
        title: t("healthCardPdf.noData"),
        description: t("healthCardPdf.addProfileFirst"),
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 35, "F");
      
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, 10, 12, 4, "F");
      doc.rect(margin + 4, 6, 4, 12, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(t("healthCardPdf.patientHealthCard"), margin + 18, 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(t("healthCardPdf.medvaultRecords"), margin + 18, 23);
      doc.text(t("healthCardPdf.generatedAt", { date: format(new Date(), "MMMM d, yyyy 'at' h:mm a") }), margin + 18, 29);

      yPos = 45;

      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(t("healthCardPdf.patientInfo"), margin, yPos);
      yPos += 8;

      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const patientInfo = [
        [t("common.name"), pdfSafe(profile?.display_name) || t("healthCardPdf.notSet")],
        ["Patient ID", pdfSafe(profile?.patient_passport_id) || t("healthCardPdf.notAssigned")],
        [t("common.date") + " of Birth", profile?.date_of_birth ? format(new Date(profile.date_of_birth), "MMMM d, yyyy") : t("healthCardPdf.notSet")],
        ["Gender", profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : t("healthCardPdf.notSet")],
        ["Blood Group", pdfSafe(healthData?.blood_group) || t("healthCardPdf.notSet")],
        ["Height", healthData?.height ? `${healthData.height} cm` : t("healthCardPdf.notSet")],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: patientInfo,
        theme: "plain",
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45, textColor: [100, 100, 100] },
          1: { cellWidth: "auto" },
        },
        styles: { fontSize: 10, cellPadding: 2 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(t("healthCardPdf.criticalHealthInfo"), margin, yPos);
      yPos += 8;

      doc.setDrawColor(220, 38, 38);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

      const criticalInfo = [
        ["Allergies", pdfSafe(healthData?.health_allergies) || t("healthCardPdf.noneRecorded")],
        ["Chronic Conditions", pdfSafe(healthData?.chronic_diseases) || t("healthCardPdf.noneRecorded")],
        ["Current Medications", pdfSafe(healthData?.current_medications) || t("healthCardPdf.noneRecorded")],
        ["Birth Defects", pdfSafe(healthData?.birth_defects) || t("healthCardPdf.noneRecorded")],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: criticalInfo,
        theme: "plain",
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45, textColor: [220, 38, 38] },
          1: { cellWidth: "auto" },
        },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(t("healthCardPdf.medicalHistory"), margin, yPos);
      yPos += 8;

      doc.setDrawColor(37, 99, 235);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

      const historyInfo = [
        [t("healthCardPdf.previousDiseases"), pdfSafe(healthData?.previous_diseases) || t("healthCardPdf.noneRecorded")],
        [t("healthCardPdf.badHabits"), pdfSafe(healthData?.bad_habits) || t("healthCardPdf.noneRecorded")],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: historyInfo,
        theme: "plain",
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45, textColor: [100, 100, 100] },
          1: { cellWidth: "auto" },
        },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      doc.setTextColor(34, 197, 94);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(t("healthCardPdf.emergencyContact"), margin, yPos);
      yPos += 8;

      doc.setDrawColor(34, 197, 94);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

      const emergencyInfo = [
        [t("healthCardPdf.contactName"), pdfSafe(healthData?.emergency_contact_name) || t("healthCardPdf.notSet")],
        [t("healthCardPdf.contactPhone"), pdfSafe(healthData?.emergency_contact_phone) || t("healthCardPdf.notSet")],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: emergencyInfo,
        theme: "plain",
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45, textColor: [34, 197, 94] },
          1: { cellWidth: "auto" },
        },
        styles: { fontSize: 10, cellPadding: 3 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      if (records && records.length > 0) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = margin;
        }

        doc.setTextColor(139, 92, 246);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(t("healthCardPdf.recentRecords"), margin, yPos);
        yPos += 8;

        doc.setDrawColor(139, 92, 246);
        doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);

        const recentRecords = records.slice(0, 5).map(record => [
          pdfSafe(record.title),
          pdfSafe(record.disease_category) || t("healthCardPdf.general"),
          record.record_date ? format(new Date(record.record_date), "MMM d, yyyy") : "N/A",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [[t("healthCardPdf.document"), t("healthCardPdf.category"), t("common.date")]],
          body: recentRecords,
          theme: "striped",
          margin: { left: margin, right: margin },
          headStyles: {
            fillColor: [139, 92, 246],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          styles: { fontSize: 9, cellPadding: 3 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;
        
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text(t("healthCardPdf.showing", { shown: Math.min(records.length, 5), total: records.length }), margin, yPos);
      }

      doc.setFillColor(245, 245, 245);
      doc.rect(0, pageHeight - 20, pageWidth, 20, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(t("healthCardPdf.footerLine1"), pageWidth / 2, pageHeight - 12, { align: "center" });
      doc.text(t("healthCardPdf.footerLine2"), pageWidth / 2, pageHeight - 7, { align: "center" });

      const displayName = pdfSafe(profile?.display_name) || "Patient";
      const fileName = `health_card_${displayName.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);

      toast({
        title: t("healthCardPdf.cardGenerated"),
        description: t("healthCardPdf.cardDownloaded"),
      });
    } catch (error) {
      console.error("Error generating health card PDF:", error);
      toast({
        title: t("healthCardPdf.generationFailed"),
        description: t("healthCardPdf.generationFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={generateHealthCardPDF}
      disabled={isGenerating}
      className="gap-2"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {t("healthCardPdf.exportButton")}
    </Button>
  );
};