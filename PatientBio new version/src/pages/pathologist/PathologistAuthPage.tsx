import PortalAuthPage from "@/components/auth/PortalAuthPage";
import { getPathologistConfig } from "@/components/auth/portalAuthConfig";
import { useTranslation } from "react-i18next";

const PathologistAuthPage = () => {
  const { t } = useTranslation();
  return <PortalAuthPage config={getPathologistConfig(t)} />;
};

export default PathologistAuthPage;
