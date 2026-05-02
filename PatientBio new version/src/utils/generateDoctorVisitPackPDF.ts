import type { HealthData } from "@/hooks/useHealthData";
import type { Prescription } from "@/hooks/usePrescriptions";
import type { Tables } from "@/integrations/supabase/types";
import { format, differenceInYears } from "date-fns";
import { formatDoctorName } from "@/utils/formatDoctorName";
import { pdfSafe } from "@/utils/pdfSafe";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";

/** Convert an image URL to base64 data URL for embedding in PDF */
async function imageToBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Failed to load logo image"));
    img.src = src;
  });
}

/** Generate a QR code as a base64 PNG data URL for embedding in PDF */
async function generateQRBase64(value: string, size: number = 256): Promise<string> {
  const { createRoot } = await import("react-dom/client");
  const { createElement } = await import("react");
  const { QRCodeCanvas } = await import("qrcode.react");

  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(createElement(QRCodeCanvas, { value, size, level: "M" }));

    // Allow a tick for the canvas to render
    setTimeout(() => {
      try {
        const canvas = container.querySelector("canvas");
        if (!canvas) {
          throw new Error("QR canvas not found");
        }
        const dataUrl = canvas.toDataURL("image/png");
        root.unmount();
        document.body.removeChild(container);
        resolve(dataUrl);
      } catch (e) {
        root.unmount();
        document.body.removeChild(container);
        reject(e);
      }
    }, 100);
  });
}

type HealthRecord = Tables<"health_records">;

interface PatientProfile {
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  patientPassportId: string | null;
}

interface LatestVitals {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  weight: number | null;
  recorded_at: string;
}

interface RecentScreening {
  symptoms: string;
  urgency: string;
  urgency_label: string;
  summary: string | null;
  reasoning: string | null;
  recommendations: string[];
  home_remedies: string[];
  warning_signs: string[];
  duration: string | null;
  severity: string | null;
  created_at: string;
}

interface UpcomingAppointment {
  appointment_date: string;
  start_time: string;
  reason: string | null;
  doctor_name: string;
  hospital_name: string;
}

interface VisitStats {
  totalVisits12m: number;
  lastVisitDate: string | null;
  lastVisitDoctor: string;
}

interface VisitPackData {
  patientName: string;
  healthData: HealthData | null;
  prescriptions: Prescription[];
  labRecords: HealthRecord[];
  patientProfile?: PatientProfile;
  latestVitals?: LatestVitals;
  recentScreenings?: RecentScreening[];
  upcomingAppointment?: UpcomingAppointment;
  visitStats?: VisitStats;
}

function generateDocumentId(): string {
  const datePart = format(new Date(), "yyyy-MM-dd");
  const hex = Math.random().toString(16).substring(2, 6).toUpperCase();
  return `PB-VPack-${datePart}-${hex}`;
}

function calcAge(dob: string | null): string | null {
  if (!dob) return null;
  try {
    const age = differenceInYears(new Date(), new Date(dob));
    return `${age} years`;
  } catch {
    return null;
  }
}

// ── Section heading with left accent bar ──
function drawSectionHeading(doc: any, title: string, margin: number, y: number): number {
  doc.setFillColor(124, 58, 237);
  doc.rect(margin, y - 4, 2.5, 7, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(title, margin + 6, y);
  return y + 7;
}

// ── Vitals thresholds for abnormal flagging ──
const VITALS_THRESHOLDS = {
  bp_systolic: { warning: 140, critical: 160 },
  bp_diastolic: { warning: 90, critical: 100 },
  heart_rate_high: 100,
  heart_rate_low: 55,
  spo2_low: 94,
  temperature_high: 38.0,
};

function isAbnormalVital(key: string, value: number | null): boolean {
  if (value == null) return false;
  switch (key) {
    case "bp_systolic": return value >= VITALS_THRESHOLDS.bp_systolic.warning;
    case "bp_diastolic": return value >= VITALS_THRESHOLDS.bp_diastolic.warning;
    case "heart_rate": return value >= VITALS_THRESHOLDS.heart_rate_high || value <= VITALS_THRESHOLDS.heart_rate_low;
    case "spo2": return value <= VITALS_THRESHOLDS.spo2_low;
    case "temperature": return value >= VITALS_THRESHOLDS.temperature_high;
    default: return false;
  }
}

function getUrgencyColor(label: string): [number, number, number] {
  const l = label.toLowerCase();
  if (l.includes("emergency")) return [220, 38, 38];
  if (l.includes("urgent")) return [234, 88, 12];
  if (l.includes("moderate")) return [202, 138, 4];
  return [22, 163, 74]; // self-care / green
}

export async function generateDoctorVisitPackPDF(data: VisitPackData): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;
  const docId = generateDocumentId();

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Load logo & QR code in parallel ──
  let logoBase64: string | null = null;
  let qrBase64: string | null = null;

  const logoPromise = imageToBase64(patientBioLogo).catch((e) => {
    console.warn("Could not load logo for PDF:", e);
    return null;
  });

  const passportId = data.patientProfile?.patientPassportId;
  const qrPromise = passportId
    ? generateQRBase64(passportId, 256).catch((e) => {
        console.warn("Could not generate QR code for PDF:", e);
        return null;
      })
    : Promise.resolve(null);

  [logoBase64, qrBase64] = await Promise.all([logoPromise, qrPromise]);

  // ── Branded Header ──
  const headerH = 36;
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageWidth, headerH, "F");

  const logoSize = 16;
  const logoCenterY = headerH / 2;
  const logoX = margin;
  const logoY = logoCenterY - logoSize / 2;
  const logoOffset = logoBase64 ? logoSize + 5 : 0;

  if (logoBase64) {
    const circleR = logoSize / 2 + 2;
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoCenterY, circleR, "F");
    doc.addImage(logoBase64, "JPEG", logoX + 1, logoY + 0.5, logoSize - 2, logoSize - 1);
  }

  doc.setTextColor(255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Bio", margin + logoOffset, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 210, 255);
  doc.text("Your Health, Your Data", margin + logoOffset, 19);
  doc.setTextColor(255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Doctor Visit Preparation Pack", margin + logoOffset, 28);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 210, 255);
  const dateStr = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  doc.text(dateStr, pageWidth - margin, 13, { align: "right" });
  doc.text(`Doc ID: ${docId}`, pageWidth - margin, 19, { align: "right" });

  // Secondary gradient strip
  doc.setFillColor(167, 119, 255);
  doc.rect(0, headerH, pageWidth, 2, "F");
  doc.setFillColor(200, 170, 255);
  doc.rect(0, headerH + 2, pageWidth, 1, "F");

  doc.setTextColor(0);
  y = headerH + 7;

  // ══════════════════════════════════════════════
  // ══ NEW: Critical Alerts Banner ══
  // ══════════════════════════════════════════════
  const allergies = pdfSafe(data.healthData?.health_allergies);
  const chronicDiseases = pdfSafe(data.healthData?.chronic_diseases);
  const hasAlerts = (allergies && allergies.toLowerCase() !== "none" && allergies !== "—") ||
                    (chronicDiseases && chronicDiseases.toLowerCase() !== "none" && chronicDiseases !== "—");

  if (hasAlerts) {
    checkPage(24);
    // Red bordered alert box
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2, "FD");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(185, 28, 28);
    doc.text("! CRITICAL ALERTS", margin + 4, y + 6);

    doc.setFontSize(8);
    doc.setTextColor(60);
    let alertY = y + 11;

    if (allergies && allergies.toLowerCase() !== "none" && allergies !== "—") {
      doc.setFont("helvetica", "bold");
      doc.text("Allergies:", margin + 4, alertY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(185, 28, 28);
      const allergyText = doc.splitTextToSize(allergies, pageWidth - 2 * margin - 30);
      doc.text(allergyText[0] || "", margin + 24, alertY);
      alertY += 5;
    }

    if (chronicDiseases && chronicDiseases.toLowerCase() !== "none" && chronicDiseases !== "—") {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      doc.text("Chronic:", margin + 4, alertY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 80, 0);
      const chronicText = doc.splitTextToSize(chronicDiseases, pageWidth - 2 * margin - 30);
      doc.text(chronicText[0] || "", margin + 24, alertY);
    }

    y += 24;
    doc.setLineWidth(0.2);
  }

  // ── Patient Information Card ──
  const qrSize = 22; // mm in PDF
  const cardHeight = qrBase64 ? 32 : 28;
  checkPage(cardHeight + 4);
  doc.setFillColor(248, 245, 255);
  doc.setDrawColor(200, 180, 240);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, cardHeight, 3, 3, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(124, 58, 237);
  doc.text("PATIENT INFORMATION", margin + 5, y + 6);

  doc.setFontSize(8.5);
  doc.setTextColor(50);
  const col1x = margin + 5;
  // Narrow col2x to avoid overlap with QR code on right side
  const fieldAreaEnd = qrBase64 ? pageWidth - margin - qrSize - 8 : pageWidth - margin;
  const col2x = margin + (fieldAreaEnd - margin) / 2 + 5;
  let cardY = y + 12;

  const dob = data.patientProfile?.dateOfBirth;
  const age = calcAge(dob);

  const leftFields: [string, string][] = [
    ["Full Name", pdfSafe(data.patientName)],
    ["Date of Birth", dob ? `${format(new Date(dob), "MMM d, yyyy")}${age ? ` (${age})` : ""}` : "—"],
    ["Gender", pdfSafe(data.patientProfile?.gender) || "—"],
  ];
  const rightFields: [string, string][] = [
    ["Blood Group", pdfSafe(data.healthData?.blood_group) || "—"],
    ["Phone", pdfSafe(data.patientProfile?.phone) || "—"],
    ["Patient ID", pdfSafe(data.patientProfile?.patientPassportId) || "—"],
  ];

  leftFields.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, col1x, cardY + i * 5);
    doc.setFont("helvetica", "normal");
    doc.text(value, col1x + 28, cardY + i * 5);
  });
  rightFields.forEach(([label, value], i) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, col2x, cardY + i * 5);
    doc.setFont("helvetica", "normal");
    doc.text(value, col2x + 25, cardY + i * 5);
  });

  // QR code on right side of Patient Information card
  if (qrBase64) {
    const qrX = pageWidth - margin - qrSize - 3;
    const qrY = y + 3;
    doc.addImage(qrBase64, "PNG", qrX, qrY, qrSize, qrSize);
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Scan for Portal Access", qrX + qrSize / 2, qrY + qrSize + 3, { align: "center" });
  }

  y += cardHeight + 8;

  // ══════════════════════════════════════════════
  // ══ NEW: Latest Vitals Snapshot ══
  // ══════════════════════════════════════════════
  if (data.latestVitals) {
    const v = data.latestVitals;
    checkPage(32);
    y = drawSectionHeading(doc, "Latest Vitals Snapshot", margin, y);

    // Light blue card
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 22, 2, 2, "FD");

    const vitalsData: [string, string, string][] = [
      ["Blood Pressure", v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic} mmHg` : "—", "bp_systolic"],
      ["Heart Rate", v.heart_rate ? `${v.heart_rate} bpm` : "—", "heart_rate"],
      ["SpO2", v.spo2 != null ? `${v.spo2}%` : "—", "spo2"],
      ["Temp", v.temperature ? `${v.temperature} C` : "—", "temperature"],
      ["Weight", v.weight ? `${v.weight} kg` : "—", "weight"],
    ];

    const colW = (pageWidth - 2 * margin) / vitalsData.length;
    vitalsData.forEach(([label, value, key], i) => {
      const cx = margin + i * colW + colW / 2;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(label, cx, y + 6, { align: "center" });

      // Highlight abnormal values in red
      const numVal = key === "bp_systolic" ? v.bp_systolic : (v as any)[key];
      const abnormal = isAbnormalVital(key, numVal) ||
        (key === "bp_systolic" && isAbnormalVital("bp_diastolic", v.bp_diastolic));

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      if (abnormal) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(30, 30, 30);
      }
      doc.text(value, cx, y + 14, { align: "center" });
    });

    // Recording date
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130);
    doc.text(
      `Recorded: ${format(new Date(v.recorded_at), "MMM d, yyyy 'at' h:mm a")}`,
      pageWidth - margin - 2, y + 20, { align: "right" }
    );

    y += 28;
  }

  // ══════════════════════════════════════════════
  // ══ NEW: Upcoming Appointment Context ══
  // ══════════════════════════════════════════════
  if (data.upcomingAppointment) {
    const appt = data.upcomingAppointment;
    checkPage(16);

    doc.setFillColor(243, 244, 246);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text("UPCOMING APPOINTMENT", margin + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    const apptInfo = `${format(new Date(appt.appointment_date), "MMM d, yyyy")} at ${appt.start_time}` +
      (appt.reason ? ` -- ${pdfSafe(appt.reason)}` : "") +
      ` | Dr. ${pdfSafe(appt.doctor_name)}` +
      (appt.hospital_name !== "—" ? ` (${pdfSafe(appt.hospital_name)})` : "");
    const apptText = doc.splitTextToSize(apptInfo, pageWidth - 2 * margin - 10);
    doc.text(apptText[0] || "", margin + 4, y + 10);

    y += 16;
  }

  // ══════════════════════════════════════════════
  // ══ AI Symptom Screenings (up to 3) ══
  // ══════════════════════════════════════════════
  if (data.recentScreenings && data.recentScreenings.length > 0) {
    checkPage(20);
    y = drawSectionHeading(doc, `AI Symptom Checker Results (${data.recentScreenings.length})`, margin, y);

    data.recentScreenings.forEach((scr, idx) => {
      checkPage(40);

      // Screening sub-header with index
      if (data.recentScreenings!.length > 1) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100);
        doc.text(`Screening #${idx + 1}`, margin, y);
        y += 5;
      }

      // Urgency badge
      const safeUrgencyLabel = pdfSafe(scr.urgency_label).toUpperCase() || "SCREENING";
      const urgColor = getUrgencyColor(safeUrgencyLabel);
      doc.setFillColor(urgColor[0], urgColor[1], urgColor[2]);
      doc.roundedRect(margin, y, 30, 6, 1.5, 1.5, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255);
      doc.text(safeUrgencyLabel, margin + 15, y + 4.2, { align: "center" });

      // Date + severity + duration badges
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(130);
      let badgeX = margin + 34;
      doc.text(format(new Date(scr.created_at), "MMM d, yyyy"), badgeX, y + 4.2);
      badgeX += 28;

      if (scr.severity) {
        doc.setTextColor(80);
        doc.text(`Severity: ${pdfSafe(scr.severity)}`, badgeX, y + 4.2);
        badgeX += 30;
      }
      if (scr.duration) {
        doc.setTextColor(80);
        doc.text(`Duration: ${pdfSafe(scr.duration)}`, badgeX, y + 4.2);
      }
      y += 10;

      // AI Summary
      if (scr.summary) {
        checkPage(12);
        doc.setFillColor(248, 245, 255);
        const summaryText = doc.splitTextToSize(pdfSafe(scr.summary), pageWidth - 2 * margin - 10);
        const summaryH = summaryText.length * 4 + 6;
        doc.roundedRect(margin, y, pageWidth - 2 * margin, summaryH, 1.5, 1.5, "F");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(124, 58, 237);
        doc.text("AI Summary:", margin + 3, y + 4);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50);
        doc.text(summaryText, margin + 3, y + 8);
        y += summaryH + 3;
      }

      // Symptoms
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50);
      doc.text("Symptoms:", margin, y);
      doc.setFont("helvetica", "normal");
      const symptomLines = doc.splitTextToSize(pdfSafe(scr.symptoms), pageWidth - 2 * margin - 25);
      doc.text(symptomLines, margin + 22, y);
      y += Math.max(symptomLines.length * 4, 5) + 2;

      // Clinical Reasoning
      if (scr.reasoning) {
        checkPage(10);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(79, 70, 229);
        doc.text("Clinical Reasoning:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        const reasonLines = doc.splitTextToSize(pdfSafe(scr.reasoning), pageWidth - 2 * margin - 35);
        doc.text(reasonLines, margin + 35, y);
        y += Math.max(reasonLines.length * 4, 5) + 2;
      }

      // Warning signs
      if (scr.warning_signs.length > 0) {
        checkPage(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28);
        doc.text("Warning Signs:", margin, y);
        doc.setFont("helvetica", "normal");
        const wsText = scr.warning_signs.map(pdfSafe).join(", ");
        const wsLines = doc.splitTextToSize(wsText, pageWidth - 2 * margin - 30);
        doc.text(wsLines, margin + 30, y);
        y += Math.max(wsLines.length * 4, 5) + 2;
      }

      // Recommendations
      if (scr.recommendations.length > 0) {
        checkPage(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50);
        doc.text("Recommendations:", margin, y);
        doc.setFont("helvetica", "normal");
        const recText = scr.recommendations.map(pdfSafe).join("; ");
        const recLines = doc.splitTextToSize(recText, pageWidth - 2 * margin - 35);
        doc.text(recLines, margin + 35, y);
        y += Math.max(recLines.length * 4, 5) + 2;
      }

      // Home Remedies
      if (scr.home_remedies.length > 0) {
        checkPage(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(22, 163, 74);
        doc.text("Home Remedies:", margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60);
        const hrText = scr.home_remedies.map(pdfSafe).join("; ");
        const hrLines = doc.splitTextToSize(hrText, pageWidth - 2 * margin - 30);
        doc.text(hrLines, margin + 30, y);
        y += Math.max(hrLines.length * 4, 5) + 2;
      }

      // Separator between screenings
      if (idx < data.recentScreenings!.length - 1) {
        y += 2;
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(margin + 10, y, pageWidth - margin - 10, y);
        y += 4;
      }
    });

    y += 4;
  }

  // ── Emergency Contact ──
  if (data.healthData?.emergency_contact_name || data.healthData?.emergency_contact_phone) {
    checkPage(14);
    doc.setFillColor(255, 240, 240);
    doc.rect(margin, y, pageWidth - 2 * margin, 12, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0);
    doc.text("EMERGENCY CONTACT", margin + 3, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const contactInfo = [
      pdfSafe(data.healthData?.emergency_contact_name),
      pdfSafe(data.healthData?.emergency_contact_phone),
    ]
      .filter(Boolean)
      .join(" -- ");
    doc.text(contactInfo, margin + 3, y + 10);
    y += 16;
  }

  // ── Health Overview ──
  checkPage(30);
  y = drawSectionHeading(doc, "Health Overview", margin, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);

  const healthFields = [
    ["Chronic Diseases", pdfSafe(data.healthData?.chronic_diseases)],
    ["Current Medications", pdfSafe(data.healthData?.current_medications)],
    ["Previous Diseases", pdfSafe(data.healthData?.previous_diseases)],
    ["Birth Defects", pdfSafe(data.healthData?.birth_defects)],
  ].filter(([, val]) => val);

  healthFields.forEach(([label, value]) => {
    checkPage(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const valLines = doc.splitTextToSize(String(value), pageWidth - margin - 60);
    doc.text(valLines, 60, y);
    y += Math.max(valLines.length * 5, 6);
  });
  y += 4;

  // ── Active Medications ──
  const activePrescriptions = data.prescriptions.filter((p) => p.is_active);
  if (activePrescriptions.length > 0) {
    checkPage(20);
    y = drawSectionHeading(doc, "Current Medications", margin, y);

    const medRows: string[][] = [];
    activePrescriptions.forEach((p) => {
      p.medications.forEach((m) => {
        medRows.push([
          pdfSafe(m.name),
          pdfSafe(m.dosage),
          pdfSafe(m.frequency),
          pdfSafe(m.duration),
          pdfSafe(formatDoctorName(p.doctor_name, "—")),
        ]);
      });
    });

    autoTable(doc, {
      head: [["Medication", "Dosage", "Frequency", "Duration", "Prescriber"]],
      body: medRows,
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [124, 58, 237] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ── Recent Diagnoses ──
  const recentDiagnoses = data.prescriptions
    .filter((p) => p.diagnosis)
    .slice(0, 5);

  if (recentDiagnoses.length > 0) {
    checkPage(20);
    y = drawSectionHeading(doc, "Recent Diagnoses", margin, y);

    autoTable(doc, {
      head: [["Diagnosis", "Doctor", "Date", "Status"]],
      body: recentDiagnoses.map((p) => [
        pdfSafe(p.diagnosis) || "—",
        pdfSafe(formatDoctorName(p.doctor_name, "—")),
        format(new Date(p.created_at), "MMM d, yyyy"),
        p.is_active ? "Active" : "Completed",
      ]),
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [124, 58, 237] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ══════════════════════════════════════════════
  // ══ NEW: Visit History Summary ══
  // ══════════════════════════════════════════════
  if (data.visitStats) {
    const vs = data.visitStats;
    checkPage(14);

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(75, 85, 99);
    doc.text("VISIT HISTORY (12 months)", margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    const statsText = `${vs.totalVisits12m} visit${vs.totalVisits12m !== 1 ? "s" : ""}` +
      (vs.lastVisitDate ? ` | Last: ${format(new Date(vs.lastVisitDate), "MMM d, yyyy")}` : "") +
      (vs.lastVisitDoctor !== "—" ? ` with ${pdfSafe(formatDoctorName(vs.lastVisitDoctor, ""))}` : "");
    doc.text(statsText, margin + 60, y + 6);

    y += 14;
  }

  // ── Recent Lab Results ──
  const recentLabs = data.labRecords
    .filter((r) => r.record_date)
    .sort((a, b) => new Date(b.record_date!).getTime() - new Date(a.record_date!).getTime())
    .slice(0, 3);

  if (recentLabs.length > 0) {
    checkPage(20);
    y = drawSectionHeading(doc, "Recent Lab Results", margin, y);

    autoTable(doc, {
      head: [["Test", "Date", "Provider"]],
      body: recentLabs.map((r) => [
        pdfSafe(r.title),
        format(new Date(r.record_date!), "MMM d, yyyy"),
        pdfSafe(r.provider_name) || "—",
      ]),
      startY: y,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [124, 58, 237] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ── Watermark + Footer (applied per page) ──
  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCenterX = pageWidth / 2;
  const pageCenterY = pageH / 2;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Subtle diagonal watermark
    const gState = new (doc as any).GState({ opacity: 0.03 });
    doc.saveGraphicsState();
    doc.setGState(gState);
    doc.setFontSize(54);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(124, 58, 237);
    doc.text("Patient Bio", pageCenterX, pageCenterY, {
      align: "center",
      angle: 35,
    });
    doc.restoreGraphicsState();

    // Footer
    doc.setFillColor(124, 58, 237);
    doc.rect(margin, pageH - 18, pageWidth - 2 * margin, 0.5, "F");

    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", margin, pageH - 16, 4, 4.5);
    }
    const footerTextX = logoBase64 ? margin + 6 : margin;

    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(
      `Page ${i}/${pageCount}  |  Doc ID: ${docId}`,
      pageWidth - margin,
      pageH - 12,
      { align: "right" }
    );
    doc.setFontSize(6.5);
    doc.setTextColor(160);
    doc.text(
      "CONFIDENTIAL MEDICAL DOCUMENT -- For informational purposes only. Verify with original records.",
      footerTextX,
      pageH - 7
    );
  }

  doc.save(`Doctor-Visit-Pack-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
