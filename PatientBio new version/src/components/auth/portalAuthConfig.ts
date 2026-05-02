import { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getRoleBasedRedirectPath } from "@/hooks/useRoleBasedRedirect";
import type { PortalType } from "@/hooks/usePortalAuth";
import type { TFunction } from "i18next";

export interface PortalAuthConfig {
  portalType: PortalType;
  portalName: string;
  gradient: string;
  headline: string[];
  description: string;
  stats: { value: string; label: string }[];
  emailPlaceholder: string;
  allowSignup: boolean;
  loginTitle: string;
  loginSubtitle: string;
  signupTitle: string;
  signupSubtitle: string;
  onLoginRedirect: (userId: string, navigate: NavigateFunction) => Promise<void>;
  authPath: string;
  otherPortals: { label: string; path: string }[];
  noAccountMessage?: string;
}

const getAllPortals = (t: TFunction) => [
  { label: t("authPortal.portals.patient", "Patient"), path: "/auth" },
  { label: t("authPortal.portals.doctor", "Doctor"), path: "/doctors/login" },
  { label: t("authPortal.portals.hospital", "Hospital"), path: "/hospital/login" },
  { label: t("authPortal.portals.diagnostic", "Diagnostic"), path: "/pathologist/login" },
  { label: t("authPortal.portals.research", "Research"), path: "/researcher/login" },
  { label: t("authPortal.portals.admin", "Admin"), path: "/admin/login" },
];

const getOtherPortals = (t: TFunction, exclude: PortalType) => {
  const map: Record<string, PortalType> = {
    "/auth": "patient",
    "/doctors/login": "doctor",
    "/hospital/login": "hospital",
    "/pathologist/login": "pathologist",
    "/researcher/login": "researcher",
    "/admin/login": "admin",
  };
  return getAllPortals(t).filter((p) => map[p.path] !== exclude);
};

export const getPatientConfig = (t: TFunction): PortalAuthConfig => ({
  portalType: "patient",
  portalName: t("authPortal.patient.portalName", "Patient Bio"),
  gradient: "bg-gradient-to-br from-primary via-secondary to-accent",
  headline: [t("authPortal.patient.headline1", "Your Health Data,"), t("authPortal.patient.headline2", "Your Control")],
  description: t("authPortal.patient.description", "Join thousands of patients who trust Patient Bio to manage their health records securely."),
  stats: [
    { value: "1M+", label: t("authPortal.patient.stat1", "Active Users") },
    { value: "50+", label: t("authPortal.patient.stat2", "Countries") },
    { value: "99.9%", label: t("authPortal.patient.stat3", "Uptime") },
  ],
  emailPlaceholder: "john@example.com",
  allowSignup: true,
  loginTitle: t("authPortal.patient.loginTitle", "Welcome back"),
  loginSubtitle: t("authPortal.patient.loginSubtitle", "Sign in to access your health dashboard"),
  signupTitle: t("authPortal.patient.signupTitle", "Create your account"),
  signupSubtitle: t("authPortal.patient.signupSubtitle", "Start managing your health records today"),
  authPath: "/auth",
  onLoginRedirect: async (userId, navigate) => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get("redirect");
    const action = urlParams.get("action");
    if (redirectTo) {
      navigate(action ? `${redirectTo}?action=${action}` : redirectTo);
    } else {
      const path = await getRoleBasedRedirectPath(userId);
      navigate(path);
    }
  },
  otherPortals: getOtherPortals(t, "patient"),
});

export const getDoctorConfig = (t: TFunction): PortalAuthConfig => ({
  portalType: "doctor",
  portalName: t("authPortal.doctor.portalName", "Doctor Portal"),
  gradient: "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700",
  headline: [t("authPortal.doctor.headline1", "Your Practice."), t("authPortal.doctor.headline2", "Your Patients."), t("authPortal.doctor.headline3", "Connected.")],
  description: t("authPortal.doctor.description", "Manage your patients, issue digital prescriptions, and streamline your practice with Patient Bio."),
  stats: [
    { value: "5K+", label: t("authPortal.doctor.stat1", "Doctors") },
    { value: "50K+", label: t("authPortal.doctor.stat2", "Patients Connected") },
    { value: "100K+", label: t("authPortal.doctor.stat3", "Prescriptions") },
  ],
  emailPlaceholder: "doctor@clinic.com",
  allowSignup: true,
  loginTitle: t("authPortal.doctor.loginTitle", "Welcome back, Doctor"),
  loginSubtitle: t("authPortal.doctor.loginSubtitle", "Sign in to access your dashboard"),
  signupTitle: t("authPortal.doctor.signupTitle", "Create your account"),
  signupSubtitle: t("authPortal.doctor.signupSubtitle", "Start managing your practice today"),
  authPath: "/doctors/login",
  onLoginRedirect: async (userId, navigate) => {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (roleData?.role === "doctor_staff") {
      navigate("/doctor", { replace: true });
      return;
    }

    const { data: profile } = await supabase
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    navigate(profile ? "/doctor" : "/doctor/onboarding", { replace: true });
  },
  otherPortals: getOtherPortals(t, "doctor"),
});

export const getHospitalConfig = (t: TFunction): PortalAuthConfig => ({
  portalType: "hospital",
  portalName: t("authPortal.hospital.portalName", "Hospital Portal"),
  gradient: "bg-gradient-to-br from-primary via-primary/90 to-primary/80",
  headline: [t("authPortal.hospital.headline1", "Manage Your"), t("authPortal.hospital.headline2", "Healthcare Facility")],
  description: t("authPortal.hospital.description", "Access your hospital dashboard to manage staff, view patient records, and streamline operations."),
  stats: [
    { value: "500+", label: t("authPortal.hospital.stat1", "Hospitals") },
    { value: "10K+", label: t("authPortal.hospital.stat2", "Doctors") },
    { value: "1M+", label: t("authPortal.hospital.stat3", "Patients Served") },
  ],
  emailPlaceholder: "admin@hospital.com",
  allowSignup: true,
  loginTitle: t("authPortal.hospital.loginTitle", "Hospital Sign In"),
  loginSubtitle: t("authPortal.hospital.loginSubtitle", "Access your hospital dashboard"),
  signupTitle: t("authPortal.hospital.signupTitle", "Create Hospital Account"),
  signupSubtitle: t("authPortal.hospital.signupSubtitle", "Register to manage your healthcare facility"),
  authPath: "/hospital/login",
  onLoginRedirect: async (userId, navigate) => {
    try {
      const { data: staffRecords } = await supabase
        .from("hospital_staff")
        .select("hospital_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1);

      if (staffRecords && staffRecords.length > 0) {
        navigate(`/hospital/${staffRecords[0].hospital_id}`, { replace: true });
      } else {
        navigate("/hospitals/register", { replace: true });
      }
    } catch {
      navigate("/hospitals", { replace: true });
    }
  },
  otherPortals: getOtherPortals(t, "hospital"),
});

export const getPathologistConfig = (t: TFunction): PortalAuthConfig => ({
  portalType: "pathologist",
  portalName: t("authPortal.pathologist.portalName", "Diagnostic Center"),
  gradient: "bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600",
  headline: [t("authPortal.pathologist.headline1", "Precision"), t("authPortal.pathologist.headline2", "Diagnostics")],
  description: t("authPortal.pathologist.description", "Manage diagnostic reports, receive doctor referrals, and collaborate seamlessly with healthcare providers."),
  stats: [
    { value: "50K+", label: t("authPortal.pathologist.stat1", "Reports Generated") },
    { value: "200+", label: t("authPortal.pathologist.stat2", "Partner Doctors") },
    { value: "99%", label: t("authPortal.pathologist.stat3", "Accuracy Rate") },
  ],
  emailPlaceholder: "pathologist@lab.com",
  allowSignup: true,
  loginTitle: t("authPortal.pathologist.loginTitle", "Diagnostic Center Sign In"),
  loginSubtitle: t("authPortal.pathologist.loginSubtitle", "Access your diagnostic dashboard"),
  signupTitle: t("authPortal.pathologist.signupTitle", "Create Account"),
  signupSubtitle: t("authPortal.pathologist.signupSubtitle", "Register your diagnostic center"),
  authPath: "/pathologist/login",
  onLoginRedirect: async (userId, navigate) => {
    const { data: profile } = await supabase
      .from("pathologist_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    navigate(profile ? "/pathologist" : "/pathologist/onboarding", { replace: true });
  },
  otherPortals: getOtherPortals(t, "pathologist"),
});

export const getResearcherConfig = (t: TFunction): PortalAuthConfig => ({
  portalType: "researcher",
  portalName: t("authPortal.researcher.portalName", "Research Lab"),
  gradient: "bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600",
  headline: [t("authPortal.researcher.headline1", "Advance Medical"), t("authPortal.researcher.headline2", "Research")],
  description: t("authPortal.researcher.description", "Access patient-consented health data to power groundbreaking medical research and discoveries."),
  stats: [
    { value: "500+", label: t("authPortal.researcher.stat1", "Research Studies") },
    { value: "10K+", label: t("authPortal.researcher.stat2", "Researchers") },
    { value: "1M+", label: t("authPortal.researcher.stat3", "Data Points") },
  ],
  emailPlaceholder: "researcher@institution.edu",
  allowSignup: true,
  loginTitle: t("authPortal.researcher.loginTitle", "Researcher Sign In"),
  loginSubtitle: t("authPortal.researcher.loginSubtitle", "Access your research dashboard"),
  signupTitle: t("authPortal.researcher.signupTitle", "Create Account"),
  signupSubtitle: t("authPortal.researcher.signupSubtitle", "Register as a researcher to access data"),
  authPath: "/researcher/login",
  onLoginRedirect: async (userId, navigate) => {
    const { data: profile } = await supabase
      .from("researcher_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    navigate(profile ? "/researcher" : "/researcher/onboarding", { replace: true });
  },
  otherPortals: getOtherPortals(t, "researcher"),
});

export const getAdminConfig = (t: TFunction): PortalAuthConfig => ({
  portalType: "admin",
  portalName: t("authPortal.admin.portalName", "Admin Portal"),
  gradient: "bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700",
  headline: [t("authPortal.admin.headline1", "Platform"), t("authPortal.admin.headline2", "Administration")],
  description: t("authPortal.admin.description", "Manage users, monitor platform activity, and configure system settings from your centralized admin dashboard."),
  stats: [
    { value: "50+", label: t("authPortal.admin.stat1", "Hospitals") },
    { value: "1000+", label: t("authPortal.admin.stat2", "Users") },
    { value: "5+", label: t("authPortal.admin.stat3", "Portals") },
  ],
  emailPlaceholder: "admin@example.com",
  allowSignup: false,
  loginTitle: t("authPortal.admin.loginTitle", "Administrator Sign In"),
  loginSubtitle: t("authPortal.admin.loginSubtitle", "Access restricted to authorized administrators only"),
  signupTitle: "",
  signupSubtitle: "",
  noAccountMessage: t("authPortal.admin.noAccountMessage", "Administrator accounts are created by existing admins. Contact your system administrator for access."),
  authPath: "/admin/login",
  onLoginRedirect: async (_userId, navigate) => {
    navigate("/admin", { replace: true });
  },
  otherPortals: getOtherPortals(t, "admin"),
});
