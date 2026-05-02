import { Button } from "@/components/ui/button";
import AppLauncher from "@/components/AppLauncher";
import { LogOut, User, Shield, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { NavigateFunction } from "react-router-dom";

interface Props {
  user: SupaUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  navigate: NavigateFunction;
}

const NavigationDesktopAuth = ({ user, loading, signOut, navigate }: Props) => {
  const { t } = useTranslation();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: t("auth.signedOut"), description: t("auth.signedOutDesc") });
    navigate("/");
  };

  return (
    <>
      {!loading && user && (
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />{t("nav.dashboard")}
            </Button>
          </Link>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="outline" size="sm" className="gap-2">
                <Shield className="h-4 w-4" />{t("nav.admin")}
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground max-w-[150px] truncate">{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />{t("auth.signOut")}
          </Button>
        </div>
      )}
      <AppLauncher />
    </>
  );
};

export default NavigationDesktopAuth;
