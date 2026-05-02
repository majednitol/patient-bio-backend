import PortalAuthPage from "@/components/auth/PortalAuthPage";
import { getPatientConfig } from "@/components/auth/portalAuthConfig";
import { useTranslation } from "react-i18next";

const AuthPage = () => {
  const { t } = useTranslation();
  return <PortalAuthPage config={getPatientConfig(t)} />;
};

export default AuthPage;
