import { Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import patientBioLogoSmall from "@/assets/patient-bio-logo-small.webp";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  const footerLinks = {
    [t("footer.product")]: [
      { name: t("footer.features"), href: "/features" },
      { name: t("footer.scheduleMeeting"), href: "https://calendly.com/sabbirhossainnde" },
    ],
    [t("footer.company")]: [
      { name: t("footer.about"), href: "/about" },
      { name: t("footer.team"), href: "/team" },
      { name: t("footer.investors"), href: "/investors" },
    ],
    [t("footer.resources")]: [
      { name: t("footer.support"), href: "/contact" },
      { name: t("footer.privacyPolicy"), href: "/privacy" },
      { name: t("footer.termsOfService"), href: "/terms" },
    ],
    [t("footer.connect")]: [
      { name: t("footer.contact"), href: "/contact" },
      
      { name: t("footer.linkedin"), href: "https://www.linkedin.com/company/patient-bio/" },
      { name: t("footer.facebook", "Facebook"), href: "https://www.facebook.com/share/1GTBngQHRt/" },
      { name: t("footer.blog"), href: "/blog" },
    ],
  };

  return (
    <footer className="bg-foreground text-background py-10 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8 mb-10 sm:mb-12">
          <div className="col-span-2 sm:col-span-2 md:col-span-1 mb-4 md:mb-0">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={patientBioLogoSmall} alt="Patient Bio" className="w-9 h-9 rounded-xl object-cover" width={36} height={36} loading="lazy" decoding="async" />
              <span className="text-lg font-bold">Patient Bio</span>
            </div>
            <p className="text-background/70 text-sm mb-4">{t("footer.tagline")}</p>
            <div className="space-y-2 text-sm text-background/70">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 flex-shrink-0" /><span className="break-all">eyrasaray@gmail.com</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 flex-shrink-0" /><span>+1 (415) 965-9919</span></div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 flex-shrink-0" /><span>San Francisco Bay Area, CA, US</span></div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.href.startsWith("/") ? (
                      <Link to={link.href} className="text-xs sm:text-sm text-background/70 hover:text-background transition-colors">{link.name}</Link>
                    ) : (
                      <a href={link.href} className="text-xs sm:text-sm text-background/70 hover:text-background transition-colors">{link.name}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-background/20 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs sm:text-sm text-background/70 text-center sm:text-left">
            © {new Date().getFullYear()} Patient Bio. {t("common.allRightsReserved")}
          </p>
          <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-background/70">
            <Link to="/privacy" className="hover:text-background transition-colors">{t("common.privacy")}</Link>
            <Link to="/terms" className="hover:text-background transition-colors">{t("common.terms")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
