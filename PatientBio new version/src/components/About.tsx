import { Target, Eye, Heart, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();

  const values = [
    { icon: Heart, title: t("about.patientFirst"), description: t("about.patientFirstDesc") },
    { icon: Target, title: t("about.transparency"), description: t("about.transparencyDesc") },
    { icon: Eye, title: t("about.privacyByDesign"), description: t("about.privacyByDesignDesc") },
    { icon: TrendingUp, title: t("about.innovation"), description: t("about.innovationDesc") },
  ];

  const milestones = [
    { year: "2023", event: "Founded in Italy" },
    { year: "2024", event: "R&D at Daffodil International University" },
    { year: "2025", event: "Multiple National and International achievements" },
    { year: "2026", event: "Expanded from Bangladesh to other countries" },
  ];

  return (
    <section id="about" className="py-12 sm:py-24 bg-muted/30 dark:bg-muted/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-14 sm:mb-20">
          <span className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            🎯 {t("about.ourMission")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2">
            {t("about.missionTitle1")}{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t("about.missionTitle2")}
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground px-2">{t("about.missionDesc")}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-14 sm:mb-20">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-foreground">{t("about.ourStory")}</h3>
            <div className="space-y-3 sm:space-y-4 text-muted-foreground text-sm sm:text-base">
              <p>{t("about.storyP1")}</p>
              <p>{t("about.storyP2")}</p>
              <p>{t("about.storyP3")}</p>
              <p>{t("about.storyP4")}</p>
            </div>
          </div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent dark:opacity-80" />
            <div className="space-y-4 sm:space-y-6">
              {milestones.map((milestone, index) => (
                <div key={index} className="relative pl-10 sm:pl-12">
                  <div className="absolute left-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shadow-md">{index + 1}</div>
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-card dark:bg-card border border-border/50 dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                    <span className="text-primary font-bold text-sm sm:text-base">{milestone.year}</span>
                    <p className="text-muted-foreground text-sm sm:text-base">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mb-8 sm:mb-12">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-foreground">{t("about.ourValues")}</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base px-2">{t("about.valuesDesc")}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {values.map((value, index) => (
            <div key={index} className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-card dark:bg-card border border-border/50 dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-lg dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300 text-center">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <value.icon className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
              </div>
              <h4 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 text-foreground">{value.title}</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;
