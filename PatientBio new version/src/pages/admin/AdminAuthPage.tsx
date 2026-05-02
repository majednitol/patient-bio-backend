import PortalAuthPage from "@/components/auth/PortalAuthPage";
import { getAdminConfig } from "@/components/auth/portalAuthConfig";
import { useTranslation } from "react-i18next";

export default function AdminAuthPage() {
  const { t } = useTranslation();
  return <PortalAuthPage config={getAdminConfig(t)} />;
}
