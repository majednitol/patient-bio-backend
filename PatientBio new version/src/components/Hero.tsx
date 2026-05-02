import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent, DEFAULT_HERO_STATS, type HeroStats } from "@/hooks/useSiteContent";
import { useTranslation } from "react-i18next";

const STAT_COLORS = [
  "from-primary to-accent",
  "from-secondary to-primary",
  "from-accent to-secondary",
];

const Hero = () => {
  const { t } = useTranslation();
  const { data: heroStats } = useSiteContent<HeroStats>("hero_stats", DEFAULT_HERO_STATS);
  const stats = Array.isArray((heroStats as any)?.stats) ? (heroStats as any).stats : DEFAULT_HERO_STATS.stats;

  return (
    <section className="relative pt-20 sm:pt-32 pb-12 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-[var(--gradient-mesh)]" />
      <div className="hidden sm:block absolute top-20 left-10 w-72 h-72 bg-primary/20 dark:bg-primary/10 rounded-full blur-3xl animate-float" />
      <div className="hidden sm:block absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 dark:bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      
      <div className="container mx-auto max-w-6xl relative">
        <div className="text-center mb-10 sm:mb-16 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-3 sm:mb-6 leading-[1.1] tracking-tight">
            {t("hero.headline1")}
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t("hero.headline2")}
            </span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-10 leading-relaxed font-medium px-1">
            {t("hero.subheadline")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 mb-10 sm:mb-20 px-2">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group bg-gradient-to-r from-primary to-secondary hover:shadow-xl transition-all text-sm sm:text-base h-11 sm:h-14">
                {t("hero.getStarted")}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/hospitals/register" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 text-sm sm:text-base h-11 sm:h-14">
                {t("hero.registerHospital")}
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-6 max-w-5xl mx-auto">
          {stats.map((stat: { value: string; label: string }, index: number) => (
            <div key={index} className="group relative bg-card dark:bg-card rounded-xl sm:rounded-3xl p-2.5 sm:p-8 text-center shadow-[var(--card-shadow-lg)] hover:shadow-[var(--card-shadow-xl)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-300 border border-border/50 dark:border-border/60 hover:border-primary/30 dark:hover:border-primary/40 backdrop-blur-sm" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="absolute inset-0 rounded-xl sm:rounded-3xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity from-primary/5 to-secondary/5" />
              <div className="relative">
                <div className={`text-xl sm:text-5xl font-bold mb-0.5 sm:mb-2 bg-gradient-to-r ${STAT_COLORS[index % STAT_COLORS.length]} bg-clip-text text-transparent`}>{stat.value}</div>
                <div className="text-[10px] leading-tight sm:text-sm font-medium text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
