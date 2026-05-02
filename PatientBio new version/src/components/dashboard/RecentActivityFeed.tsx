import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  Upload,
  Share2,
  FileText,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ICON_MAP = {
  Eye,
  Upload,
  Share2,
  Bell,
  FileText,
};

export const RecentActivityFeed = React.memo(() => {
  const { t } = useTranslation();
  const { data: activities = [], isLoading } = useRecentActivity();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-normal text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            {t("activityFeed.recentActivity")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t("activityFeed.yourRecentActions")}</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          {t("activityFeed.noActivityYet")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-normal text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            {t("activityFeed.recentActivity")}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">{t("activityFeed.last5Actions")}</CardDescription>
        </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => {
            const IconComponent = ICON_MAP[activity.icon as keyof typeof ICON_MAP] || FileText;
            const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
              addSuffix: true,
            });

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors dark:bg-muted/10 dark:hover:bg-muted/20"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <IconComponent className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    {activity.titleKey ? t(activity.titleKey, activity.title) : activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {activity.descriptionKey ? t(activity.descriptionKey, activity.descriptionParams || {}) : activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                </div>
                {activity.link && (
                  <Link to={activity.link}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
        <Link to="/dashboard/access-analytics" className="mt-4 block">
          <Button variant="outline" className="w-full">
            {t("activityFeed.viewAllActivity")}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
});
