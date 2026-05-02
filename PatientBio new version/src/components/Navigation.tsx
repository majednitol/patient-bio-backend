import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";

// Lazy-load heavy components to reduce critical path bundle
const MobileMenu = lazy(() => import("@/components/NavigationMobileMenu"));
const DesktopAuthButtons = lazy(() => import("@/components/NavigationDesktopAuth"));

const Navigation = () => {
  const { t } = useTranslation();
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: t("nav.features"), href: "/features", sectionId: "features" },
    { name: t("nav.guidelines"), href: "/guidelines" },
    { name: t("nav.about"), href: "/about", sectionId: "about" },
    { name: t("nav.team"), href: "/team", sectionId: "team" },
    { name: t("nav.contact"), href: "/contact", sectionId: "contact" },
  ];

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navHeight = 64;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - navHeight,
        behavior: "smooth"
      });
    }
  }, []);

  const handleNavClick = useCallback((e: React.MouseEvent, item: { href: string; sectionId?: string }) => {
    if (!item.sectionId) return;
    if (location.pathname === "/") {
      e.preventDefault();
      scrollToSection(item.sectionId);
    } else {
      e.preventDefault();
      navigate("/");
      setTimeout(() => {
        scrollToSection(item.sectionId!);
      }, 100);
    }
  }, [location.pathname, navigate, scrollToSection]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 dark:border-border/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={patientBioLogo} alt="Patient Bio" className="w-9 h-9 rounded-xl object-cover shadow-lg" />
            <span className="text-lg font-bold text-foreground tracking-tight">Patient Bio</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.sectionId || item.href}
                to={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive(item.href)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons - lazy loaded */}
          <div className="hidden lg:flex items-center gap-3">
            <Suspense fallback={null}>
              <DesktopAuthButtons
                user={user}
                loading={loading}
                signOut={signOut}
                navigate={navigate}
              />
            </Suspense>
          </div>

          {/* Mobile Menu Trigger + lazy Sheet */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("nav.openMenu")}</span>
            </Button>
            {mobileMenuOpen && (
              <Suspense fallback={null}>
                <MobileMenu
                  open={mobileMenuOpen}
                  onOpenChange={setMobileMenuOpen}
                  user={user}
                  loading={loading}
                  signOut={signOut}
                  navigate={navigate}
                  menuItems={menuItems}
                  handleNavClick={handleNavClick}
                  isActive={isActive}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
