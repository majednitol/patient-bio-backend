import { lazy, Suspense, useEffect, useState } from "react";
import { MinimalErrorBoundary } from "@/components/ui/MinimalErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { STALE_TIMES, GC_TIME } from "@/lib/queryConfig";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/PageLoader";
import { lazyRetry } from "@/lib/lazyRetry";

// Deferred non-critical components
const SplashScreen = lazy(() => import("@/components/SplashScreen").then(m => ({ default: m.SplashScreen })));
const DeferredPWA = lazy(() => import("@/components/DeferredPWA").then(m => ({ default: m.DeferredPWA })));
const PageViewTracker = lazy(() => import("@/components/PageViewTracker").then(m => ({ default: m.PageViewTracker })));

// Deferred UI providers — not needed for first paint
const LazyToaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const LazyTooltipProvider = lazy(() => import("@/components/ui/tooltip").then(m => ({ default: m.TooltipProvider })));

/** Wrapper that loads TooltipProvider after first paint */
function DeferredTooltipProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);
  if (!ready) return <>{children}</>;
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyTooltipProvider>{children}</LazyTooltipProvider>
    </Suspense>
  );
}

// Core pages - lazy loaded with code splitting for smaller initial bundle
const Index = lazy(lazyRetry(() => import("./pages/Index")));
const AuthPage = lazy(lazyRetry(() => import("./pages/AuthPage")));
const NotFound = lazy(lazyRetry(() => import("./pages/NotFound")));

// Lazy-loaded public pages
const FeaturesPage = lazy(lazyRetry(() => import("./pages/FeaturesPage")));
const AboutPage = lazy(lazyRetry(() => import("./pages/AboutPage")));
const TeamPage = lazy(lazyRetry(() => import("./pages/TeamPage")));
const InvestorsPage = lazy(lazyRetry(() => import("./pages/InvestorsPage")));
const ContactPage = lazy(lazyRetry(() => import("./pages/ContactPage")));
const ResetPasswordPage = lazy(lazyRetry(() => import("./pages/ResetPasswordPage")));
const VerifyEmailPage = lazy(lazyRetry(() => import("./pages/VerifyEmailPage")));
const GuidelinesPage = lazy(lazyRetry(() => import("./pages/GuidelinesPage")));
const TermsPage = lazy(lazyRetry(() => import("./pages/TermsPage")));
const PrivacyPage = lazy(lazyRetry(() => import("./pages/PrivacyPage")));
const InstallPage = lazy(lazyRetry(() => import("./pages/InstallPage").then(m => ({ default: m.default }))));
const ShareViewPage = lazy(lazyRetry(() => import("./pages/ShareViewPage")));
const StaffInvitationPage = lazy(lazyRetry(() => import("./pages/StaffInvitationPage")));
const EmergencyViewPage = lazy(lazyRetry(() => import("./pages/EmergencyViewPage")));
const VerifyContributionPage = lazy(lazyRetry(() => import("./pages/VerifyContributionPage")));

// Lazy-loaded Admin Portal
const AdminAuthPage = lazy(lazyRetry(() => import("./pages/admin/AdminAuthPage")));
const AdminLayout = lazy(lazyRetry(() => import("./pages/admin/AdminLayout")));
const Dashboard = lazy(lazyRetry(() => import("./pages/admin/Dashboard")));
const UsersPage = lazy(lazyRetry(() => import("./pages/admin/UsersPage")));
const TeamAdminPage = lazy(lazyRetry(() => import("./pages/admin/TeamAdminPage")));
const ContentPage = lazy(lazyRetry(() => import("./pages/admin/ContentPage")));
const MessagesPage = lazy(lazyRetry(() => import("./pages/admin/MessagesPage")));
const SharedDataPage = lazy(lazyRetry(() => import("./pages/admin/SharedDataPage")));
const DiseaseAnalyticsPage = lazy(lazyRetry(() => import("./pages/admin/DiseaseAnalyticsPage")));
const AdminHospitalsPage = lazy(lazyRetry(() => import("./pages/admin/AdminHospitalsPage")));
const AdminSettingsPage = lazy(lazyRetry(() => import("./pages/admin/AdminSettingsPage")));
const AuditLogsPage = lazy(lazyRetry(() => import("./pages/admin/AuditLogsPage")));
const AdminVerificationsPage = lazy(lazyRetry(() => import("./pages/admin/AdminVerificationsPage")));
const SystemHealthPage = lazy(lazyRetry(() => import("./pages/admin/SystemHealthPage")));
const ComplianceReportsPage = lazy(lazyRetry(() => import("./pages/admin/ComplianceReportsPage")));
const AdminGuidelinesPage = lazy(lazyRetry(() => import("./pages/admin/AdminGuidelinesPage")));
const AdminBackupPage = lazy(lazyRetry(() => import("./pages/admin/AdminBackupPage")));
const BlockchainExplorerPage = lazy(lazyRetry(() => import("./pages/admin/BlockchainExplorerPage")));
const AdminBlogPage = lazy(lazyRetry(() => import("./pages/admin/AdminBlogPage")));
const DoctorDemandPage = lazy(lazyRetry(() => import("./pages/admin/DoctorDemandPage")));

// Public Blog pages
const BlogPage = lazy(lazyRetry(() => import("./pages/BlogPage")));
const BlogPostPage = lazy(lazyRetry(() => import("./pages/BlogPostPage")));

// Lazy-loaded Patient Dashboard
const DashboardLayout = lazy(lazyRetry(() => import("./pages/dashboard/DashboardLayout")));
const DashboardHome = lazy(lazyRetry(() => import("./pages/dashboard/DashboardHome")));
const ProfilePage = lazy(lazyRetry(() => import("./pages/dashboard/ProfilePage")));
const HealthDataPage = lazy(lazyRetry(() => import("./pages/dashboard/HealthDataPage")));
const PrescriptionsPage = lazy(lazyRetry(() => import("./pages/dashboard/PrescriptionsPage")));
const UploadPage = lazy(lazyRetry(() => import("./pages/dashboard/UploadPage")));
const ShareDataPage = lazy(lazyRetry(() => import("./pages/dashboard/ShareDataPage")));
const MyDoctorsPage = lazy(lazyRetry(() => import("./pages/dashboard/MyDoctorsPage")));
const QRCodePage = lazy(lazyRetry(() => import("./pages/dashboard/QRCodePage")));
const AppointmentsPage = lazy(lazyRetry(() => import("./pages/dashboard/AppointmentsPage")));
const DataRequestsPage = lazy(lazyRetry(() => import("./pages/dashboard/DataRequestsPage")));
const WalletPage = lazy(lazyRetry(() => import("./pages/dashboard/WalletPage")));
const AccessAnalyticsPage = lazy(lazyRetry(() => import("./pages/dashboard/AccessAnalyticsPage")));
const NotificationsPage = lazy(lazyRetry(() => import("./pages/dashboard/NotificationsPage")));
const HealthTrendsPage = lazy(lazyRetry(() => import("./pages/dashboard/HealthTrendsPage")));
const FamilyMembersPage = lazy(lazyRetry(() => import("./pages/dashboard/FamilyMembersPage")));
const FamilyMemberProfilePage = lazy(lazyRetry(() => import("./pages/dashboard/FamilyMemberProfilePage")));
const ConsentManagementPage = lazy(lazyRetry(() => import("./pages/dashboard/ConsentManagementPage")));
const FHIRSubscriptionsPage = lazy(lazyRetry(() => import("./pages/dashboard/FHIRSubscriptionsPage")));
const InternationalDataPage = lazy(lazyRetry(() => import("./pages/dashboard/InternationalDataPage")));
const DataIntegrityPage = lazy(lazyRetry(() => import("./pages/dashboard/DataIntegrityPage")));
const PatientLabReportsPage = lazy(lazyRetry(() => import("./pages/dashboard/PatientLabReportsPage")));
const MyPathologistsPage = lazy(lazyRetry(() => import("./pages/dashboard/MyPathologistsPage")));
const ResearchPreferencesPage = lazy(lazyRetry(() => import("./pages/dashboard/ResearchPreferencesPage")));
const SettingsPage = lazy(lazyRetry(() => import("./pages/dashboard/SettingsPage")));
const HealthScoreDetailPage = lazy(lazyRetry(() => import("./pages/dashboard/HealthScoreDetailPage")));
const ClinicalRecordsPage = lazy(lazyRetry(() => import("./pages/dashboard/ClinicalRecordsPage")));
const FindDoctorPage = lazy(lazyRetry(() => import("./pages/dashboard/FindDoctorPage")));
const DoctorPublicProfilePage = lazy(lazyRetry(() => import("./pages/dashboard/DoctorPublicProfilePage")));
const FindBestDoctorPage = lazy(lazyRetry(() => import("./pages/dashboard/FindBestDoctorPage")));
const PatientMessagesPage = lazy(lazyRetry(() => import("./pages/dashboard/PatientMessagesPage")));

// SMART on FHIR Launch Page
const SmartLaunchPage = lazy(lazyRetry(() => import("./pages/SmartLaunchPage")));

// Lazy-loaded Hospital Portal
const HospitalsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalsPage")));
const HospitalOnboardingPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalOnboardingPage")));
const HospitalAuthPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalAuthPage")));
const ApplyToHospitalPage = lazy(lazyRetry(() => import("./pages/hospital/ApplyToHospitalPage")));
const HospitalLayout = lazy(lazyRetry(() => import("./pages/hospital/HospitalLayout")));
const HospitalDashboard = lazy(lazyRetry(() => import("./pages/hospital/HospitalDashboard")));
const HospitalStaffPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalStaffPage")));
const HospitalApplicationsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalApplicationsPage")));
const HospitalSettingsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalSettingsPage")));
const DoctorPatientsPage = lazy(lazyRetry(() => import("./pages/hospital/DoctorPatientsPage")));
const DoctorPrescriptionsPage = lazy(lazyRetry(() => import("./pages/hospital/DoctorPrescriptionsPage")));
const HospitalAppointmentsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalAppointmentsPage")));
const DoctorAvailabilityPage = lazy(lazyRetry(() => import("./pages/hospital/DoctorAvailabilityPage")));
const HospitalWardsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalWardsPage")));
const HospitalAdmissionsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalAdmissionsPage")));
const HospitalBillingPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalBillingPage")));
const HospitalAnalyticsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalAnalyticsPage")));
const HospitalDepartmentsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalDepartmentsPage")));
const DoctorSchedulePage = lazy(lazyRetry(() => import("./pages/hospital/DoctorSchedulePage")));
const HospitalDataImportPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalDataImportPage")));
const HospitalLabOrdersPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalLabOrdersPage")));
const HospitalShiftsPage = lazy(lazyRetry(() => import("./pages/hospital/HospitalShiftsPage")));
const EmergencyTriageBoardPage = lazy(lazyRetry(() => import("./pages/hospital/EmergencyTriageBoardPage")));
const DepartmentReferralsPage = lazy(lazyRetry(() => import("./pages/hospital/DepartmentReferralsPage")));

// Lazy-loaded Standalone Doctor Portal
const DoctorAuthPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorAuthPage")));
const DoctorOnboardingPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorOnboardingPage")));
const DoctorLayout = lazy(lazyRetry(() => import("./pages/doctor/DoctorLayout")));
const DoctorDashboard = lazy(lazyRetry(() => import("./pages/doctor/DoctorDashboard")));
const DoctorProfilePage = lazy(lazyRetry(() => import("./pages/doctor/DoctorProfilePage")));
const DoctorPatientsPageStandalone = lazy(lazyRetry(() => import("./pages/doctor/DoctorPatientsPage")));
const DoctorPrescriptionsPageStandalone = lazy(lazyRetry(() => import("./pages/doctor/DoctorPrescriptionsPage")));
const DoctorQRCodePage = lazy(lazyRetry(() => import("./pages/doctor/DoctorQRCodePage")));
const DoctorAppointmentsPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorAppointmentsPage")));
const DoctorNotificationsPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorNotificationsPage")));
const DoctorAnalyticsPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorAnalyticsPage")));
const DoctorSettingsPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorSettingsPage")));
const DoctorReferralsPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorReferralsPage")));
const DoctorStaffPageStandalone = lazy(lazyRetry(() => import("./pages/doctor/DoctorStaffPage")));
const DoctorLabReportsPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorLabReportsPage")));
const DoctorMessagesPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorMessagesPage")));
const DoctorReportsPage = lazy(lazyRetry(() => import("./pages/doctor/DoctorReportsPage")));

// Lazy-loaded Pathologist Portal
const PathologistAuthPage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistAuthPage")));
const PathologistOnboardingPage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistOnboardingPage")));
const PathologistLayout = lazy(lazyRetry(() => import("./pages/pathologist/PathologistLayout")));
const PathologistDashboard = lazy(lazyRetry(() => import("./pages/pathologist/PathologistDashboard")));
const PathologistProfilePage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistProfilePage")));
const PathologistReportsPage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistReportsPage")));
const DataFromDoctorsPage = lazy(lazyRetry(() => import("./pages/pathologist/DataFromDoctorsPage")));
const ShareToDoctorsPage = lazy(lazyRetry(() => import("./pages/pathologist/ShareToDoctorsPage")));
const PathologistPatientsPage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistPatientsPage")));
const PathologistQRCodePage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistQRCodePage")));
const PathologistAnalyticsPage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistAnalyticsPage")));
const TestCatalogPage = lazy(lazyRetry(() => import("./pages/pathologist/TestCatalogPage")));
const PathologistBillingPage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistBillingPage")));
const IncomingLabOrdersPage = lazy(lazyRetry(() => import("./pages/pathologist/IncomingLabOrdersPage")));
const SampleTrackingPage = lazy(lazyRetry(() => import("./pages/pathologist/SampleTrackingPage")));
const PathologistDataImportPage = lazy(lazyRetry(() => import("./pages/pathologist/PathologistDataImportPage")));
const PatientSharesPage = lazy(lazyRetry(() => import("./pages/pathologist/PatientSharesPage")));
const BulkResultEntryPage = lazy(lazyRetry(() => import("./pages/pathologist/BulkResultEntryPage")));

// Lazy-loaded Researcher Portal
const ResearcherAuthPage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherAuthPage")));
const ResearcherOnboardingPage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherOnboardingPage")));
const ResearcherLayout = lazy(lazyRetry(() => import("./pages/researcher/ResearcherLayout")));
const ResearcherDashboard = lazy(lazyRetry(() => import("./pages/researcher/ResearcherDashboard")));
const ResearcherProfilePage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherProfilePage")));
const ResearcherDataPage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherDataPage")));
const ResearcherQRCodePage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherQRCodePage")));
const CohortBuilderPage = lazy(lazyRetry(() => import("./pages/researcher/CohortBuilderPage")));
const ResearcherDataImportPage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherDataImportPage")));
const CohortAnalyticsPage = lazy(lazyRetry(() => import("./pages/researcher/CohortAnalyticsPage")));
const ResearcherVisualizationStudio = lazy(lazyRetry(() => import("./pages/researcher/ResearcherVisualizationStudio")));
const ResearcherStudyNotesPage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherStudyNotesPage")));
const CohortComparisonPage = lazy(lazyRetry(() => import("./pages/researcher/CohortComparisonPage")));
const DataQualityDashboardPage = lazy(lazyRetry(() => import("./pages/researcher/DataQualityDashboardPage")));
const PublicationTrackerPage = lazy(lazyRetry(() => import("./pages/researcher/PublicationTrackerPage")));
const ResearcherStudiesPage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherStudiesPage")));
const CrossStudyAnalyticsPage = lazy(lazyRetry(() => import("./pages/researcher/CrossStudyAnalyticsPage")));
const GlobalDataPoolPage = lazy(lazyRetry(() => import("./pages/researcher/GlobalDataPoolPage")));
const ResearcherApiPage = lazy(lazyRetry(() => import("./pages/researcher/ResearcherApiPage")));
const LiteratureSearchPage = lazy(lazyRetry(() => import("./pages/researcher/LiteratureSearchPage")));
const OutcomePredictorPage = lazy(lazyRetry(() => import("./pages/researcher/OutcomePredictorPage")));
const CollaborationHubPage = lazy(lazyRetry(() => import("./pages/researcher/CollaborationHubPage")));
const DataGovernancePage = lazy(lazyRetry(() => import("./pages/researcher/DataGovernancePage")));
const DataCatalogPage = lazy(lazyRetry(() => import("./pages/researcher/DataCatalogPage")));
const AnonymousSharingPage = lazy(lazyRetry(() => import("./pages/dashboard/AnonymousSharingPage")));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.FREQUENT,
      gcTime: GC_TIME,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <MinimalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <DeferredTooltipProvider>
        <Suspense fallback={null}><LazyToaster /></Suspense>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={null}><SplashScreen><span /></SplashScreen></Suspense>
            <Suspense fallback={null}><DeferredPWA /></Suspense>
            <Suspense fallback={null}><PageViewTracker /></Suspense>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/investors" element={<InvestorsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/guidelines" element={<GuidelinesPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/install" element={<InstallPage />} />
                <Route path="/share/:token" element={<ShareViewPage />} />
                <Route path="/staff-invitation/:token" element={<StaffInvitationPage />} />
                <Route path="/emergency/:token" element={<EmergencyViewPage />} />
                <Route path="/smart-launch" element={<SmartLaunchPage />} />
                <Route path="/verify-contribution/:hash" element={<VerifyContributionPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                
                {/* Hospital Routes */}
                <Route path="/hospitals" element={<HospitalsPage />} />
                <Route path="/hospitals/register" element={<HospitalOnboardingPage />} />
                <Route path="/hospitals/login" element={<HospitalAuthPage />} />
                <Route path="/hospital/login" element={<HospitalAuthPage />} />
                <Route path="/hospital/register" element={<HospitalOnboardingPage />} />
                <Route path="/hospitals/:hospitalId/apply" element={<ApplyToHospitalPage />} />
                <Route path="/hospital/:hospitalId" element={<HospitalLayout />}>
                  <Route index element={<HospitalDashboard />} />
                  <Route path="analytics" element={<HospitalAnalyticsPage />} />
                  <Route path="staff" element={<HospitalStaffPage />} />
                  <Route path="departments" element={<HospitalDepartmentsPage />} />
                  <Route path="schedules" element={<DoctorSchedulePage />} />
                  <Route path="applications" element={<HospitalApplicationsPage />} />
                  <Route path="settings" element={<HospitalSettingsPage />} />
                  <Route path="patients" element={<DoctorPatientsPage />} />
                  <Route path="prescriptions" element={<DoctorPrescriptionsPage />} />
                  <Route path="appointments" element={<HospitalAppointmentsPage />} />
                  <Route path="availability" element={<DoctorAvailabilityPage />} />
                  <Route path="wards" element={<HospitalWardsPage />} />
                  <Route path="admissions" element={<HospitalAdmissionsPage />} />
                  <Route path="billing" element={<HospitalBillingPage />} />
                  <Route path="lab-orders" element={<HospitalLabOrdersPage />} />
                  <Route path="import" element={<HospitalDataImportPage />} />
                  <Route path="shifts" element={<HospitalShiftsPage />} />
                  <Route path="emergency-triage" element={<EmergencyTriageBoardPage />} />
                  <Route path="referrals" element={<DepartmentReferralsPage />} />
                </Route>
                
                {/* Standalone Doctor Portal Routes */}
                <Route path="/doctors/login" element={<DoctorAuthPage />} />
                <Route path="/doctor/onboarding" element={<DoctorOnboardingPage />} />
                <Route path="/doctor" element={<DoctorLayout />}>
                  <Route index element={<DoctorDashboard />} />
                  <Route path="profile" element={<DoctorProfilePage />} />
                  <Route path="patients" element={<DoctorPatientsPageStandalone />} />
                  <Route path="staff" element={<DoctorStaffPageStandalone />} />
                  <Route path="appointments" element={<DoctorAppointmentsPage />} />
                  <Route path="prescriptions" element={<DoctorPrescriptionsPageStandalone />} />
                  <Route path="referrals" element={<DoctorReferralsPage />} />
                  <Route path="lab-reports" element={<DoctorLabReportsPage />} />
                  <Route path="analytics" element={<DoctorAnalyticsPage />} />
                  <Route path="notifications" element={<DoctorNotificationsPage />} />
                  <Route path="qr-code" element={<DoctorQRCodePage />} />
                  <Route path="settings" element={<DoctorSettingsPage />} />
                  <Route path="messages" element={<DoctorMessagesPage />} />
                  <Route path="reports" element={<DoctorReportsPage />} />
                </Route>
                
                {/* Pathologist Portal Routes */}
                <Route path="/pathologist/login" element={<PathologistAuthPage />} />
                <Route path="/pathologist/onboarding" element={<PathologistOnboardingPage />} />
                <Route path="/pathologist" element={<PathologistLayout />}>
                  <Route index element={<PathologistDashboard />} />
                  <Route path="analytics" element={<PathologistAnalyticsPage />} />
                  <Route path="profile" element={<PathologistProfilePage />} />
                  <Route path="catalog" element={<TestCatalogPage />} />
                  <Route path="import" element={<PathologistDataImportPage />} />
                  <Route path="hospital-orders" element={<IncomingLabOrdersPage />} />
                  <Route path="sample-tracking" element={<SampleTrackingPage />} />
                  <Route path="billing" element={<PathologistBillingPage />} />
                  <Route path="reports" element={<PathologistReportsPage />} />
                  <Route path="from-doctors" element={<DataFromDoctorsPage />} />
                  <Route path="to-doctors" element={<ShareToDoctorsPage />} />
                  <Route path="patients" element={<PathologistPatientsPage />} />
                  <Route path="patient-shares" element={<PatientSharesPage />} />
                  <Route path="bulk-results" element={<BulkResultEntryPage />} />
                  <Route path="qr-code" element={<PathologistQRCodePage />} />
                </Route>
                
                {/* Researcher Portal Routes */}
                <Route path="/researcher/login" element={<ResearcherAuthPage />} />
                <Route path="/researcher/onboarding" element={<ResearcherOnboardingPage />} />
                <Route path="/researcher" element={<ResearcherLayout />}>
                   <Route index element={<ResearcherDashboard />} />
                   <Route path="profile" element={<ResearcherProfilePage />} />
                   <Route path="data" element={<ResearcherDataPage />} />
                   <Route path="cohort" element={<CohortBuilderPage />} />
                   <Route path="analytics" element={<CohortAnalyticsPage />} />
                   <Route path="visualization" element={<ResearcherVisualizationStudio />} />
                   <Route path="import" element={<ResearcherDataImportPage />} />
                   <Route path="qr-code" element={<ResearcherQRCodePage />} />
                   <Route path="notes" element={<ResearcherStudyNotesPage />} />
                   <Route path="cohort-compare" element={<CohortComparisonPage />} />
                   <Route path="data-quality" element={<DataQualityDashboardPage />} />
                   <Route path="publications" element={<PublicationTrackerPage />} />
                   <Route path="studies" element={<ResearcherStudiesPage />} />
                   <Route path="cross-study-analytics" element={<CrossStudyAnalyticsPage />} />
                   <Route path="global-pool" element={<GlobalDataPoolPage />} />
                   <Route path="api-access" element={<ResearcherApiPage />} />
                   <Route path="literature" element={<LiteratureSearchPage />} />
                   <Route path="outcome-predictor" element={<OutcomePredictorPage />} />
                   <Route path="collaboration" element={<CollaborationHubPage />} />
                   <Route path="data-governance" element={<DataGovernancePage />} />
                   <Route path="data-catalog" element={<DataCatalogPage />} />
                </Route>
                
                {/* Patient Dashboard Routes */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardHome />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="health-data" element={<HealthDataPage />} />
                  <Route path="trends" element={<HealthTrendsPage />} />
                  <Route path="prescriptions" element={<PrescriptionsPage />} />
                  <Route path="upload" element={<UploadPage />} />
                  <Route path="share" element={<ShareDataPage />} />
                  <Route path="access-analytics" element={<AccessAnalyticsPage />} />
                  <Route path="requests" element={<DataRequestsPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="find-doctor" element={<FindDoctorPage />} />
                  <Route path="doctors" element={<MyDoctorsPage />} />
                  <Route path="qr-code" element={<QRCodePage />} />
                  <Route path="appointments" element={<AppointmentsPage />} />
                  <Route path="family" element={<FamilyMembersPage />} />
                  <Route path="family/:memberId" element={<FamilyMemberProfilePage />} />
                  <Route path="consents" element={<ConsentManagementPage />} />
                  <Route path="subscriptions" element={<FHIRSubscriptionsPage />} />
                  <Route path="international" element={<InternationalDataPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="data-integrity" element={<DataIntegrityPage />} />
                  <Route path="lab-reports" element={<PatientLabReportsPage />} />
                  <Route path="pathologists" element={<MyPathologistsPage />} />
                  <Route path="research-preferences" element={<ResearchPreferencesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="health-score" element={<HealthScoreDetailPage />} />
                  <Route path="anonymous-sharing" element={<AnonymousSharingPage />} />
                  <Route path="clinical-records" element={<ClinicalRecordsPage />} />
                  <Route path="doctor/:doctorId" element={<DoctorPublicProfilePage />} />
                  <Route path="find-best-doctor" element={<FindBestDoctorPage />} />
                  <Route path="messages" element={<PatientMessagesPage />} />
                </Route>
                
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminAuthPage />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="hospitals" element={<AdminHospitalsPage />} />
                  <Route path="team" element={<TeamAdminPage />} />
                  <Route path="content" element={<ContentPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                  <Route path="shared-data" element={<SharedDataPage />} />
                  <Route path="disease-analytics" element={<DiseaseAnalyticsPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                  <Route path="verifications" element={<AdminVerificationsPage />} />
                  <Route path="system-health" element={<SystemHealthPage />} />
                  <Route path="compliance" element={<ComplianceReportsPage />} />
                  <Route path="guidelines" element={<AdminGuidelinesPage />} />
                  <Route path="backup" element={<AdminBackupPage />} />
                  <Route path="blockchain-explorer" element={<BlockchainExplorerPage />} />
                  <Route path="blog" element={<AdminBlogPage />} />
                  <Route path="doctor-demand" element={<DoctorDemandPage />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </DeferredTooltipProvider>
    </QueryClientProvider>
  </MinimalErrorBoundary>
);

export default App;
