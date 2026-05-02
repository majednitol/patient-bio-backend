import { WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface OfflineUnavailableProps {
  isOnline: boolean;
  children: React.ReactNode;
}

export const OfflineUnavailable = ({ isOnline, children }: OfflineUnavailableProps) => {
  const { t } = useTranslation();

  if (!isOnline) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            {t("pwa.featureUnavailableOffline")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};
