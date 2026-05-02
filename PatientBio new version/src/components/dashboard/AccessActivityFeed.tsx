import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAccessSummary } from "@/hooks/useActiveAccessSummary";
import {
  Activity,
  Stethoscope,
  Link2,
  Eye,
  Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";

const typeIcons: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  token: Link2,
  system: Shield,
};

export function AccessActivityFeed() {
  const { t } = useTranslation();
  const { recentActivity, isLoadingActivity } = useActiveAccessSummary();

  if (isLoadingActivity) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (recentActivity.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t("accessActivity.recentAccessActivity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Eye className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">{t("accessActivity.noRecentEvents")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {t("accessActivity.recentAccessActivity")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-3">
            {recentActivity.map((event, i) => {
              const Icon = typeIcons[event.accessorType] || Eye;
              return (
                <div key={event.id} className="flex items-start gap-3 relative">
                  <div className="h-8 w-8 rounded-full border-2 border-background bg-muted flex items-center justify-center z-10 shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm">
                      <span className="font-medium">
                        {event.accessorName || t("accessActivity.unknown")}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        {t("accessActivity.viewedRecords")}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>
                        {formatDistanceToNow(new Date(event.accessedAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {event.reason && (
                        <>
                          <span>·</span>
                          <span className="truncate">{event.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}