import PortalAuthPage from "@/components/auth/PortalAuthPage";
import { getResearcherConfig } from "@/components/auth/portalAuthConfig";
import { useTranslation } from "react-i18next";

const ResearcherAuthPage = () => {
  const { t } = useTranslation();
  return <PortalAuthPage config={getResearcherConfig(t)} />;
};

export default ResearcherAuthPage;
