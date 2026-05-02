import PortalAuthPage from "@/components/auth/PortalAuthPage";
import { getHospitalConfig } from "@/components/auth/portalAuthConfig";
import { useTranslation } from "react-i18next";

export default function HospitalAuthPage() {
  const { t } = useTranslation();
  return <PortalAuthPage config={getHospitalConfig(t)} />;
}
