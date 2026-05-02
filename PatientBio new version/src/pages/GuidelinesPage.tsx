import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, FileText, HeartPulse, Lock, Users, Database,
  User, Stethoscope, Building2, FlaskConical, Microscope, Play, HelpCircle, Video, Clock,
} from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { useSiteContent, type GuidelinesContent } from "@/hooks/useSiteContent";

/* ── Types ── */
type Section = { icon: React.ElementType; title: string; content: string };
type VideoEntry = { title: string; url: string; duration: string };
type FAQ = { question: string; answer: string };
type SubView = "guidelines" | "videos" | "faq";

/* Portal color map — uses CSS variable references for inline styles */
const portalColors: Record<string, string> = {
  general:    "220 14% 46%",
  patient:    "199 89% 48%",
  doctor:     "262 83% 58%",
  hospital:   "25 95% 53%",
  diagnostic: "173 58% 39%",
  researcher: "316 70% 58%",
};

const getColor = (catId: string) => {
  const c = portalColors[catId] || portalColors.general;
  return {
    solid: `hsl(${c})`,
    bg08: `hsl(${c} / 0.08)`,
    bg12: `hsl(${c} / 0.12)`,
    bg06: `hsl(${c} / 0.06)`,
    border20: `hsl(${c} / 0.2)`,
  };
};

type Catalogue = {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  sections: Section[];
  videos: VideoEntry[];
  faqs: FAQ[];
};

/* ── General ── */
const generalSections: Section[] = [
  { icon: ShieldCheck, title: "Data Privacy & Security", content: "All health records are encrypted at rest and in transit using industry-standard AES-256 encryption. Access is controlled through role-based permissions, and every data access event is logged in an immutable audit trail. We comply with HIPAA, GDPR, and regional health-data regulations." },
  { icon: FileText, title: "Medical Records Management", content: "Patients retain full ownership of their medical records. Documents should be uploaded in supported formats (PDF, JPEG, PNG, DICOM). Records are validated for completeness before storage. Providers may only access records through explicit patient consent or valid access tokens." },
  { icon: HeartPulse, title: "Clinical Data Usage", content: "Clinical data shared through the platform must be used solely for the stated purpose—diagnosis, treatment, or research. Misuse of clinical data, including unauthorized sharing or commercialisation, is strictly prohibited and may result in account suspension." },
  { icon: Lock, title: "Access & Sharing Controls", content: "Patients control who accesses their data via time-limited, scope-restricted access tokens. Shared links expire automatically. Emergency access follows a separate protocol requiring identity verification. Revocation of access is immediate and irreversible." },
];
const generalVideos: VideoEntry[] = [
  { title: "Getting Started with Patient Bio", url: "", duration: "5 min" },
  { title: "Understanding Data Privacy Controls", url: "", duration: "7 min" },
];
const generalFaqs: FAQ[] = [
  { question: "How is my data encrypted?", answer: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Encryption keys are rotated regularly and managed through a secure key management service." },
  { question: "Who can access my health records?", answer: "Only individuals you explicitly grant access to via time-limited access tokens can view your records. Every access event is logged in an immutable audit trail." },
  { question: "Is the platform HIPAA compliant?", answer: "Yes. Patient Bio complies with HIPAA, GDPR, and applicable regional health-data protection regulations." },
  { question: "How do I report a data breach?", answer: "Navigate to Settings > Security > Report Issue or email our security team directly. All reports are investigated within 24 hours." },
];

/* ── Patient Portal ── */
const patientSections: Section[] = [
  { icon: User, title: "Account & Profile Setup", content: "Create your account with a valid email address. Complete your profile with accurate personal and medical information. Keep your emergency contacts up to date. Enable two-factor authentication for added security." },
  { icon: FileText, title: "Uploading Health Records", content: "Upload prescriptions, lab reports, imaging studies, and discharge summaries in PDF, JPEG, or PNG format. Ensure documents are legible and correctly categorised. You can tag records by disease category for easier retrieval." },
  { icon: Lock, title: "Sharing & Access Tokens", content: "Generate time-limited access tokens to share records with doctors, hospitals, or pathologists. Define the scope of shared data—choose specific record types or date ranges. Revoke access at any time from your dashboard." },
  { icon: HeartPulse, title: "Health Monitoring", content: "Track health trends over time through the Health Trends dashboard. Monitor your Health Score and receive personalised recommendations. Set up appointment reminders and manage your medication schedule." },
  { icon: Database, title: "Research Contributions", content: "Optionally contribute anonymised health data to the research pool. Control which data categories you share and set auto-renewal preferences. Track your token earnings from data contributions via the Wallet." },
];
const patientVideos: VideoEntry[] = [
  { title: "Getting Started with the Patient Portal", url: "", duration: "5 min" },
  { title: "Uploading & Managing Records", url: "", duration: "8 min" },
  { title: "Sharing Data with Access Tokens", url: "", duration: "6 min" },
];
const patientFaqs: FAQ[] = [
  { question: "How do I upload a health record?", answer: "Go to Records > Upload, select the file (PDF, JPEG, PNG), add a disease category tag, and click Upload. The system validates the document before saving." },
  { question: "Can I share records with multiple doctors?", answer: "Yes. Generate a separate access token for each doctor from the Sharing dashboard. Each token can have different scopes and expiry times." },
  { question: "How do I revoke access?", answer: "Navigate to Sharing > Active Tokens, select the token, and click Revoke. Access is removed immediately." },
  { question: "What is the Health Score?", answer: "The Health Score is a personalised metric based on your uploaded records, medication adherence, and appointment attendance. It helps you track your overall health trajectory." },
];

/* ── Doctor Portal ── */
const doctorSections: Section[] = [
  { icon: Stethoscope, title: "Onboarding & Verification", content: "Register with your medical licence number, specialty, and qualifications. Your profile will be verified before you can access patient data. Keep your credentials and contact information current." },
  { icon: Users, title: "Patient Management", content: "Access patient records only through valid access tokens or direct patient consent. Add clinical notes per patient for continuity of care. Use the referral system to transfer patients to specialists when needed." },
  { icon: FileText, title: "Prescriptions & Lab Orders", content: "Create digital prescriptions with dosage, frequency, and duration. Use favourite medications for faster prescribing. Share cases with pathologists for lab work and review results within the portal." },
  { icon: HeartPulse, title: "Appointments & Availability", content: "Set your weekly availability schedule with configurable slot durations. Manage appointments, check-ins, and consultations. Configure time-off periods and let the waitlist system handle rebooking." },
  { icon: ShieldCheck, title: "Staff & Delegation", content: "Invite staff members (nurses, assistants) with role-based permissions. Staff can manage appointments and basic admin tasks on your behalf. Monitor all delegated actions through the activity log." },
];
const doctorVideos: VideoEntry[] = [
  { title: "Getting Started as a Doctor", url: "", duration: "6 min" },
  { title: "Managing Patients & Records", url: "", duration: "9 min" },
  { title: "Digital Prescriptions & Lab Orders", url: "", duration: "7 min" },
];
const doctorFaqs: FAQ[] = [
  { question: "How do I get verified?", answer: "After registration, submit your medical licence number and supporting documents. Our verification team reviews applications within 2–3 business days." },
  { question: "Can I access patient records without a token?", answer: "No. You must have a valid access token or direct patient consent to view any patient data. Emergency access requires additional identity verification." },
  { question: "How do referrals work?", answer: "Navigate to a patient's profile, click Refer, select the specialist and urgency level, and add clinical notes. The referred doctor receives a notification and can accept or decline." },
  { question: "Can my staff write prescriptions?", answer: "No. Staff members can manage appointments and admin tasks, but only verified doctors can create and sign prescriptions." },
];

/* ── Hospital Portal ── */
const hospitalSections: Section[] = [
  { icon: Building2, title: "Facility Registration", content: "Register your hospital with licence details, address, and department structure. Complete the onboarding process to activate your portal. Configure wards, beds, and department hierarchies." },
  { icon: Users, title: "Staff & Doctor Management", content: "Manage doctor applications and approvals. Assign doctors to departments with appropriate roles. Use the Staff Shift Planner to schedule weekly rosters and track attendance." },
  { icon: HeartPulse, title: "Admissions & Bed Management", content: "Track patient admissions, transfers, and discharges through the visual ward/bed system. Use the Discharge Readiness Checklist to ensure all steps are completed before release. Monitor bed turnover rates for operational efficiency." },
  { icon: FileText, title: "Lab Orders & Billing", content: "Create and track hospital-wide lab orders. Manage billing for admissions, consultations, and procedures. Generate invoices and track payment status through the billing dashboard." },
  { icon: ShieldCheck, title: "Emergency & Triage", content: "Use the real-time Emergency Department Triage Board for priority-based patient management. Track severity levels and wait times. Manage inter-department referrals through status stages from Requested to Completed." },
  { icon: Database, title: "Analytics & Reporting", content: "Monitor department-level metrics including patient volume, revenue, and average length of stay. Track bed occupancy trends and staff utilisation. Use analytics to optimise resource allocation." },
];
const hospitalVideos: VideoEntry[] = [
  { title: "Setting Up Your Hospital Portal", url: "", duration: "8 min" },
  { title: "Ward & Bed Management", url: "", duration: "10 min" },
  { title: "Billing & Invoice Generation", url: "", duration: "7 min" },
];
const hospitalFaqs: FAQ[] = [
  { question: "How do I register my hospital?", answer: "Go to the Hospital Registration page, enter your facility licence number, address, departments, and admin contact details. Verification takes 3–5 business days." },
  { question: "Can I manage multiple wards?", answer: "Yes. Configure as many wards as needed, each with its own bed inventory, type classification, and daily rate settings." },
  { question: "How does the triage board work?", answer: "The Emergency Triage Board displays patients sorted by severity (Critical, Urgent, Standard). Staff can update status in real-time and assign patients to departments." },
  { question: "Can I generate compliance reports?", answer: "Yes. Navigate to Analytics > Reports, select the period and report type, and generate downloadable PDF reports with audit-ready data." },
];

/* ── Diagnostic Centre Portal ── */
const diagnosticSections: Section[] = [
  { icon: Microscope, title: "Centre Registration & Verification", content: "Register your diagnostic centre with accreditation details, NABL/CAP certificates, and contact information. Complete verification to start receiving referrals. Keep your licence and certification documents up to date." },
  { icon: Users, title: "Receiving Referrals", content: "Accept cases shared by doctors and hospitals through the referral system. View patient details and clinical notes attached to each referral. Update referral status as you process lab orders." },
  { icon: FileText, title: "Report Generation & Upload", content: "Generate diagnostic reports in supported formats (PDF, HL7, FHIR). Upload results directly to the patient's record with structured data fields. Support for haematology, biochemistry, microbiology, histopathology, and radiology reports." },
  { icon: ShieldCheck, title: "Quality Assurance", content: "Maintain turnaround time standards for each test category. Implement re-testing protocols for flagged or abnormal results. Log instrument calibration records and participate in external quality assessment programs." },
  { icon: Building2, title: "Integration with Hospitals", content: "Link your centre to hospital portals for seamless lab order routing. Share billing information and consolidated invoices. Synchronise report status updates in real-time with referring facilities." },
];
const diagnosticVideos: VideoEntry[] = [
  { title: "Getting Started with the Diagnostic Portal", url: "", duration: "6 min" },
  { title: "Processing Referrals & Lab Orders", url: "", duration: "8 min" },
  { title: "Uploading Reports & Quality Checks", url: "", duration: "7 min" },
];
const diagnosticFaqs: FAQ[] = [
  { question: "How do I register my diagnostic centre?", answer: "Navigate to the registration page, enter your centre's accreditation number, upload NABL/CAP certificates, and provide admin contact details. Verification typically takes 3–5 business days." },
  { question: "What report formats are supported?", answer: "We support PDF, HL7, and FHIR formats. Structured data entry is available for common test panels including haematology, biochemistry, and microbiology." },
  { question: "How do I handle abnormal results?", answer: "Abnormal results are automatically flagged. Follow your centre's re-testing protocol, document the retest, and upload the final verified report." },
  { question: "Can I link to multiple hospitals?", answer: "Yes. You can establish links with multiple hospital portals. Each link enables automatic lab order routing and shared billing reconciliation." },
];

/* ── Research Portal ── */
const researcherSections: Section[] = [
  { icon: FlaskConical, title: "Researcher Onboarding", content: "Register with your institutional affiliation and research credentials. Specify your areas of research interest and data requirements. Your account will be verified before access to the anonymised data pool is granted." },
  { icon: Database, title: "Accessing Anonymised Data", content: "Browse the Global Data Pool of anonymised, consented health records. Filter by disease category, age range, gender, and jurisdiction. All data is stripped of personally identifiable information and accessed through the anonymous pool view." },
  { icon: Users, title: "Cohort Management", content: "Build research cohorts using the Cohort Builder with advanced filtering. Monitor cohort drift over time with automated detection. Compare cohorts side-by-side using the Cross-Study Analytics dashboard." },
  { icon: FileText, title: "Study Protocols & Notes", content: "Create and manage study protocols with version history. Maintain study notes with archival support. Generate IRB-ready PDF reports with automated formatting and data quality summaries." },
  { icon: HeartPulse, title: "AI & Predictive Analytics", content: "Leverage AI-powered insights with PubMed literature cross-referencing. Use the AI Hypothesis Generator for study design. Access predictive risk stratification and sample size calculators for robust research planning." },
  { icon: Lock, title: "API & Data Governance", content: "Access data programmatically through the scoped API Gateway (REDCap compatible). All API access is logged and rate-limited. Adhere to data usage agreements—research data must not be re-identified or shared outside approved protocols." },
];
const researcherVideos: VideoEntry[] = [
  { title: "Getting Started as a Researcher", url: "", duration: "6 min" },
  { title: "Using the Cohort Builder", url: "", duration: "10 min" },
  { title: "API Access & Data Governance", url: "", duration: "8 min" },
];
const researcherFaqs: FAQ[] = [
  { question: "How do I access anonymised data?", answer: "After verification, navigate to Data Pool > Browse. Use filters for disease category, demographics, and jurisdiction. All data is pre-anonymised and consent-verified." },
  { question: "Can I export data for external analysis?", answer: "Yes, within the bounds of your data usage agreement. Use the Export function or the API Gateway for programmatic access. All exports are logged." },
  { question: "What is cohort drift detection?", answer: "Cohort drift detection monitors your defined cohort criteria over time and alerts you when the underlying data changes significantly, ensuring your study population remains stable." },
  { question: "How do I generate an IRB report?", answer: "Go to Study > Reports > Generate IRB Report. The system compiles your protocol, data quality metrics, and consent summaries into a formatted PDF." },
];

/* ── Catalogues ── */
const catalogues: Catalogue[] = [
  { id: "general", label: "General", icon: ShieldCheck, description: "Platform-wide standards for data privacy, record management, clinical data usage, and access controls.", sections: generalSections, videos: generalVideos, faqs: generalFaqs },
  { id: "patient", label: "Patient Portal", icon: User, description: "Guidelines for patients on managing profiles, uploading records, sharing data, and contributing to research.", sections: patientSections, videos: patientVideos, faqs: patientFaqs },
  { id: "doctor", label: "Doctor Portal", icon: Stethoscope, description: "Guidelines for doctors on onboarding, patient management, prescriptions, and staff delegation.", sections: doctorSections, videos: doctorVideos, faqs: doctorFaqs },
  { id: "hospital", label: "Hospital Portal", icon: Building2, description: "Guidelines for hospitals on facility setup, staff management, admissions, billing, and analytics.", sections: hospitalSections, videos: hospitalVideos, faqs: hospitalFaqs },
  { id: "diagnostic", label: "Diagnostic Centre", icon: Microscope, description: "Guidelines for diagnostic centres on registration, referrals, report generation, quality assurance, and hospital integration.", sections: diagnosticSections, videos: diagnosticVideos, faqs: diagnosticFaqs },
  { id: "researcher", label: "Research Portal", icon: FlaskConical, description: "Guidelines for researchers on data access, cohort building, study management, and API governance.", sections: researcherSections, videos: researcherVideos, faqs: researcherFaqs },
];

/* ── Sub-view buttons ── */
const subViewOptions: { key: SubView; label: string; icon: React.ElementType }[] = [
  { key: "guidelines", label: "Guidelines", icon: FileText },
  { key: "videos", label: "Video Tutorials", icon: Video },
  { key: "faq", label: "Q&A", icon: HelpCircle },
];

/* ── YouTube URL → embed URL converter ── */
function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    // Already an embed URL
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return `https://www.youtube.com/embed/${embedMatch[1]}`;
    // Standard watch URL
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    // Short URL
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  } catch { /* ignore */ }
  return null;
}

/* ── Video Card ── */
const VideoCard = ({ video, catId }: { video: VideoEntry; catId: string }) => {
  const c = getColor(catId);
  const embedUrl = toEmbedUrl(video.url);
  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow" style={{ borderColor: c.border20 }}>
      <CardContent className="p-0">
        {embedUrl ? (
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center gap-2" style={{ backgroundColor: c.bg06 }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform" style={{ backgroundColor: c.bg12 }}>
              <Play className="h-7 w-7 ml-0.5" style={{ color: c.solid }} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Coming Soon</span>
          </div>
        )}
        <div className="p-4 flex items-start justify-between gap-2">
          <p className="font-medium text-sm">{video.title}</p>
          <span className="shrink-0 flex items-center gap-1 text-xs rounded-full px-2 py-0.5" style={{ color: c.solid, backgroundColor: c.bg08 }}>
            <Clock className="h-3 w-3" />
            {video.duration}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

const EMPTY_GUIDELINES: GuidelinesContent = { sections: [], videos: [], faqs: [] };

/** Fetch DB overrides for each portal and merge with hardcoded defaults */
function useGuidelinesData() {
  const general = useSiteContent<GuidelinesContent>("guidelines_general", EMPTY_GUIDELINES);
  const patient = useSiteContent<GuidelinesContent>("guidelines_patient", EMPTY_GUIDELINES);
  const doctor = useSiteContent<GuidelinesContent>("guidelines_doctor", EMPTY_GUIDELINES);
  const hospital = useSiteContent<GuidelinesContent>("guidelines_hospital", EMPTY_GUIDELINES);
  const diagnostic = useSiteContent<GuidelinesContent>("guidelines_diagnostic", EMPTY_GUIDELINES);
  const researcher = useSiteContent<GuidelinesContent>("guidelines_researcher", EMPTY_GUIDELINES);

  const dbMap: Record<string, GuidelinesContent> = {
    general: general.data,
    patient: patient.data,
    doctor: doctor.data,
    hospital: hospital.data,
    diagnostic: diagnostic.data,
    researcher: researcher.data,
  };

  return useMemo(() => {
    return catalogues.map((cat) => {
      const db = dbMap[cat.id];
      const hasDbSections = db && db.sections && db.sections.length > 0;
      const hasDbVideos = db && db.videos && db.videos.length > 0;
      const hasDbFaqs = db && db.faqs && db.faqs.length > 0;

      return {
        ...cat,
        sections: hasDbSections
          ? db.sections.map((s) => ({ icon: FileText, title: s.title, content: s.content }))
          : cat.sections,
        videos: hasDbVideos ? db.videos : cat.videos,
        faqs: hasDbFaqs ? db.faqs : cat.faqs,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [general.data, patient.data, doctor.data, hospital.data, diagnostic.data, researcher.data]);
}

/* ── Page ── */
const GuidelinesPage = () => {
  const { t } = useTranslation();
  const [subViews, setSubViews] = useState<Record<string, SubView>>({});
  const mergedCatalogues = useGuidelinesData();

  const getSubView = (catId: string): SubView => subViews[catId] || "guidelines";
  const setSubView = (catId: string, view: SubView) => setSubViews((prev) => ({ ...prev, [catId]: view }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={patientBioLogo} alt="Patient Bio" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-bold">Patient Bio</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-12 max-w-5xl">
        <h1 className="text-xl sm:text-4xl font-bold mb-0.5 sm:mb-2">{t("nav.guidelines")}</h1>
        <p className="text-muted-foreground mb-4 sm:mb-10 text-xs sm:text-lg leading-relaxed max-w-3xl">
          How Patient Bio handles health data, what is expected of every user and provider, and the standards we uphold.
        </p>

        <Tabs defaultValue="general" className="w-full">
          {/* Sticky horizontally scrollable tabs on mobile */}
          <div className="sticky top-[52px] sm:static z-40 bg-background/95 backdrop-blur-sm -mx-3 px-3 sm:mx-0 sm:px-0 pb-2 sm:pb-0 mb-4 sm:mb-8 pt-1 sm:pt-0 border-b sm:border-b-0 border-border/30">
            <div className="overflow-x-auto hide-scrollbar relative scroll-fade-right sm:after:hidden">
              <TabsList className="flex h-auto gap-0.5 sm:gap-1.5 bg-transparent p-0 w-max sm:w-auto sm:flex-wrap">
                {mergedCatalogues.map((cat) => {
                  const Icon = cat.icon;
                  const c = getColor(cat.id);
                  return (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.id}
                      className="gap-1 sm:gap-2 rounded-full sm:rounded-lg border border-transparent px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm whitespace-nowrap min-h-[36px] sm:min-h-[44px] data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50"
                      style={{
                        "--_portal-color": c.solid,
                        "--_portal-bg": c.bg08,
                        "--_portal-border": c.border20,
                      } as React.CSSProperties}
                      data-portal-colored=""
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{cat.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          {mergedCatalogues.map((cat) => {
            const activeView = getSubView(cat.id);
            const c = getColor(cat.id);
            return (
              <TabsContent key={cat.id} value={cat.id} className="mt-0">
                {/* Description — compact on mobile */}
                <div className="mb-3 sm:mb-6 p-2.5 sm:p-4 rounded-lg sm:rounded-xl border" style={{ backgroundColor: c.bg06, borderColor: c.border20 }}>
                  <p className="text-muted-foreground text-[11px] sm:text-sm leading-relaxed">{cat.description}</p>
                </div>

                {/* Sub-view switcher — sticky on mobile for quick switching */}
                <div className="sticky top-[92px] sm:static z-30 bg-background/95 backdrop-blur-sm -mx-3 px-3 sm:mx-0 sm:px-0 pb-2 sm:pb-0 mb-3 sm:mb-8">
                  <div className="flex gap-0 sm:gap-1 p-0.5 sm:p-1 rounded-lg w-full sm:w-fit border" style={{ backgroundColor: c.bg06, borderColor: c.border20 }}>
                    {subViewOptions.map((opt) => {
                      const SvIcon = opt.icon;
                      const isActive = activeView === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setSubView(cat.id, opt.key)}
                          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-md text-[11px] sm:text-sm font-medium transition-all min-h-[36px] sm:min-h-[40px] ${
                            isActive
                              ? "bg-background shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          style={isActive ? { color: c.solid } : undefined}
                        >
                          <SvIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Guidelines — accordion-style on mobile for space saving */}
                {activeView === "guidelines" && (
                  <div className="space-y-2 sm:space-y-4">
                    {cat.sections.map((section, idx) => {
                      const SIcon = section.icon;
                      return (
                        <Card
                          key={idx}
                          className="group overflow-hidden transition-all hover:shadow-md border press-feedback"
                          style={{ borderColor: c.border20 }}
                        >
                          <CardContent className="p-0">
                            <div className="flex items-start gap-2.5 sm:gap-4 p-2.5 sm:p-5">
                              {/* Compact numbered icon badge */}
                              <div className="shrink-0 relative">
                                <div
                                  className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                                  style={{ backgroundColor: c.bg12 }}
                                >
                                  <SIcon className="h-3.5 w-3.5 sm:h-5 sm:w-5" style={{ color: c.solid }} />
                                </div>
                                <span
                                  className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full text-[8px] sm:text-[10px] font-bold flex items-center justify-center text-white"
                                  style={{ backgroundColor: c.solid }}
                                >
                                  {idx + 1}
                                </span>
                              </div>

                              {/* Text content — tighter on mobile */}
                              <div className="flex-1 min-w-0">
                                <h2 className="text-[13px] sm:text-base font-semibold mb-0.5 sm:mb-1.5 group-hover:text-foreground transition-colors leading-tight">
                                  {section.title}
                                </h2>
                                <p className="text-[11px] sm:text-sm text-muted-foreground leading-relaxed">
                                  {section.content}
                                </p>
                              </div>
                            </div>

                            {/* Accent bottom bar */}
                            <div
                              className="h-0.5 w-0 group-hover:w-full transition-all duration-500"
                              style={{ backgroundColor: c.solid }}
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Video Tutorials */}
                {activeView === "videos" && (
                  <div className="grid gap-2.5 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.videos.map((video, idx) => (
                      <VideoCard key={idx} video={video} catId={cat.id} />
                    ))}
                  </div>
                )}

                {/* Q&A — tighter mobile spacing */}
                {activeView === "faq" && (
                  <Accordion type="single" collapsible className="w-full">
                    {cat.faqs.map((faq, idx) => (
                      <AccordionItem key={idx} value={`${cat.id}-faq-${idx}`} className="border-b" style={{ borderColor: c.border20 }}>
                        <AccordionTrigger className="text-left hover:no-underline text-[13px] sm:text-base py-3 sm:py-4">{faq.question}</AccordionTrigger>
                        <AccordionContent className="pb-3 sm:pb-4">
                          <p className="text-muted-foreground leading-relaxed text-[11px] sm:text-sm">{faq.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 sm:py-8 mt-6 sm:mt-12">
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2026 Patient Bio. All rights reserved.</p>
          <div className="flex justify-center gap-3 sm:gap-4 mt-1.5 sm:mt-2">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GuidelinesPage;
