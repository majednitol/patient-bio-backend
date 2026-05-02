import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogOut, User, ChevronRight, Shield, LayoutDashboard } from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { NavigateFunction } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SupaUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  navigate: NavigateFunction;
  menuItems: Array<{ name: string; href: string; sectionId?: string }>;
  handleNavClick: (e: React.MouseEvent, item: { href: string; sectionId?: string }) => void;
  isActive: (href: string) => boolean;
}

const NavigationMobileMenu = ({
  open, onOpenChange, user, loading, signOut, navigate,
  menuItems, handleNavClick, isActive,
}: Props) => {
  const { t } = useTranslation();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
    toast({ title: t("auth.signedOut"), description: t("auth.signedOutDesc") });
    navigate("/");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border/50 dark:border-border/60">
          <SheetTitle className="flex items-center gap-2.5">
            <img src={patientBioLogo} alt="Patient Bio" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold">Patient Bio</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-73px)]">
          {user && (
            <div className="px-4 py-3 border-b border-border/50 dark:border-border/60 bg-muted/30 dark:bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{t("common.signedIn")}</p>
                </div>
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-0.5">
              {menuItems.map((item) => (
                <Link
                  key={item.sectionId || item.href}
                  to={item.href}
                  onClick={(e) => { handleNavClick(e, item); onOpenChange(false); }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.href) ? "text-primary bg-primary/10" : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  {item.name}
                  <ChevronRight className={`h-4 w-4 transition-colors ${isActive(item.href) ? "text-primary" : "text-muted-foreground"}`} />
                </Link>
              ))}

              {user && (
                <Link to="/dashboard" onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-foreground hover:bg-muted/50">
                  <span className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />{t("nav.dashboard")}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}

              {isAdmin && (
                <Link to="/admin" onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-foreground hover:bg-muted/50">
                  <span className="flex items-center gap-2"><Shield className="h-4 w-4" />{t("nav.adminPanel")}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
            </div>

            {!user && !loading && (
              <div className="mt-4 pt-4 border-t border-border/50 dark:border-border/60">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("common.portals")}</p>
                <div className="space-y-0.5">
                  {[
                    { name: t("nav.patientPortal"), href: "/auth" },
                    { name: t("nav.doctorPortal"), href: "/doctors/login" },
                    { name: t("nav.hospitalPortal"), href: "/hospitals/login" },
                    { name: t("nav.diagnosticPortal", "Diagnostic Portal"), href: "/pathologist/login" },
                    { name: t("nav.researchPortal", "Research Portal"), href: "/researcher/login" },
                  ].map((portal) => (
                    <Link key={portal.href} to={portal.href} onClick={() => onOpenChange(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-muted/50 transition-all">
                      {portal.name}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-border/50 dark:border-border/60 space-y-2">
            {!loading && (
              <>
                {user ? (
                  <Button variant="outline" className="w-full justify-center gap-2 h-11" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />{t("auth.signOut")}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/auth" className="flex-1" onClick={() => onOpenChange(false)}>
                      <Button className="w-full h-11 text-sm">{t("auth.signIn")}</Button>
                    </Link>
                    <Link to="/auth" className="flex-1" onClick={() => onOpenChange(false)}>
                      <Button variant="outline" className="w-full h-11 text-sm">{t("auth.signUp")}</Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavigationMobileMenu;
