import PortalAuthPage from "@/components/auth/PortalAuthPage";
import { getDoctorConfig } from "@/components/auth/portalAuthConfig";
import { useTranslation } from "react-i18next";

const DoctorAuthPage = () => {
  const { t } = useTranslation();
  return <PortalAuthPage config={getDoctorConfig(t)} />;
};

export default DoctorAuthPage;
