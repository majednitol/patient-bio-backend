import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, LanguageCode } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const LanguageSettings = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language as LanguageCode;

  const handleLanguageChange = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
    // Update document direction for RTL languages (future support)
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    if (lang) {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = langCode;
    }
  };

  return (
    <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          {t("language.title")}
        </CardTitle>
        <CardDescription>
          {t("language.select")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              variant="outline"
              className={cn(
                "flex items-center justify-between h-auto py-3 px-4",
                currentLanguage === lang.code && "border-primary bg-primary/5"
              )}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
              {currentLanguage === lang.code && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </Button>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Your language preference is saved automatically.
        </p>
      </CardContent>
    </Card>
  );
};
