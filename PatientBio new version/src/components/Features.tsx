import { Shield, Globe, Smartphone, Lock, FileText, Users, Zap, Heart, Link, Brain, CloudOff, Fingerprint } from "lucide-react";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Link,
      title: t("features.blockchainRecords"),
      description: t("features.blockchainRecordsDesc"),
      color: "from-primary to-secondary",
    },
    {
      icon: Brain,
      title: t("features.aiInsights"),
      description: t("features.aiInsightsDesc"),
      color: "from-secondary to-accent",
    },
    {
      icon: Lock,
      title: t("features.patientSovereignty"),
      description: t("features.patientSovereigntyDesc"),
      color: "from-accent to-primary",
    },
    {
      icon: Shield,
      title: t("features.encryption"),
      description: t("features.encryptionDesc"),
      color: "from-primary to-secondary",
    },
    {
      icon: CloudOff,
      title: t("features.offlineAccess"),
      description: t("features.offlineAccessDesc"),
      color: "from-secondary to-accent",
    },
    {
      icon: Fingerprint,
      title: t("features.biometricSecurity"),
      description: t("features.biometricSecurityDesc"),
      color: "from-accent to-primary",
    },
    {
      icon: Globe,
      title: t("features.globalInterop"),
      description: t("features.globalInteropDesc"),
      color: "from-primary to-secondary",
    },
    {
      icon: Users,
      title: t("features.familySharing"),
      description: t("features.familySharingDesc"),
      color: "from-secondary to-accent",
    },
  ];

  return (
    <section id="features" className="py-12 sm:py-24 bg-muted/30 dark:bg-muted/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <span className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            {t("features.badge")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2">
            {t("features.title")}{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t("features.titleHighlight")}
            </span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground px-2">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-card dark:bg-card border border-border/50 dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-xl dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300"
            >
              <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2.5 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
