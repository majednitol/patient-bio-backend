import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@/hooks/useNotifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Bell, CheckCheck, Eye, Shield, Pill, FileText, AlertTriangle,
} from "lucide-react";
import {
  NotificationGroup,
  categorizeNotification,
  type NotificationCategory,
} from "@/components/dashboard/NotificationGroup";

const NOTIFICATION_TYPES = [
  { value: "all", label: "All", icon: Bell },
  { value: "critical", label: "Critical", icon: AlertTriangle, isCritical: true },
  { value: "access_request", label: "Access Requests", icon: Shield },
  { value: "data_viewed", label: "Data Viewed", icon: Eye },
  { value: "emergency_access", label: "Emergency", icon: Shield, isCritical: true },
  { value: "prescription_added", label: "Prescriptions", icon: Pill },
  { value: "report_shared", label: "Reports", icon: FileText },
];

const isCriticalNotification = (type: string, metadata?: Record<string, unknown>) => {
  return type === "emergency_access" || metadata?.is_critical === true;
};

const NotificationSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex gap-4">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CATEGORY_ORDER: NotificationCategory[] = ["access", "appointments", "medications", "system"];

export default function NotificationsPage() {
  const { t } = useTranslation();
  const {
    notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification,
  } = useNotifications();

  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredNotifications = notifications.filter((n) => {
    if (readFilter === "unread" && n.is_read) return false;
    if (readFilter === "read" && !n.is_read) return false;
    if (typeFilter === "critical") {
      return isCriticalNotification(n.type, n.metadata as Record<string, unknown> | undefined);
    }
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  // Group by category
  const groupedByCategory = filteredNotifications.reduce(
    (groups, notification) => {
      const category = categorizeNotification(notification.type);
      if (!groups[category]) groups[category] = [];
      groups[category].push(notification);
      return groups;
    },
    {} as Record<NotificationCategory, typeof filteredNotifications>
  );

  const handleMarkGroupAsRead = (ids: string[]) => {
    ids.forEach((id) => markAsRead(id));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-0 desktop-sidebar">
      <div className="space-y-3 sm:space-y-6">
        {filteredNotifications.length === 0 ? (
          <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-4 rounded-full bg-muted dark:bg-muted/20 mb-4">
                <Bell className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-lg font-medium">{t("notificationsPage.noNotifications")}</p>
              <p className="text-sm text-center max-w-xs mt-1">
                {readFilter !== "all" || typeFilter !== "all"
                  ? t("notificationsPage.adjustFilters")
                  : t("notificationsPage.activityHere")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {CATEGORY_ORDER.filter((cat) => groupedByCategory[cat]?.length > 0).map((category) => (
              <NotificationGroup
                key={category}
                category={category}
                notifications={groupedByCategory[category]}
                onMarkAsRead={markAsRead}
                onMarkGroupAsRead={handleMarkGroupAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start order-first lg:order-last">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-bold">{t("notificationsPage.title")}</h1>
              <p className="text-[10px] sm:text-sm text-muted-foreground">
                {unreadCount > 0
                  ? t("notificationsPage.unread", { count: unreadCount })
                  : t("notificationsPage.allCaughtUp")}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              {t("notificationsPage.markAllRead")}
            </Button>
          )}
        </div>

        <Card className="dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="flex gap-1.5 sm:gap-2">
                <Button
                  variant={readFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-xs sm:text-sm"
                  onClick={() => setReadFilter("all")}
                >
                  {t("notificationsPage.all")}
                  <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs px-1.5">
                    {notifications.length}
                  </Badge>
                </Button>
                <Button
                  variant={readFilter === "unread" ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-xs sm:text-sm"
                  onClick={() => setReadFilter("unread")}
                >
                  {t("notificationsPage.unreadLabel")}
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs px-1.5">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={readFilter === "read" ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-xs sm:text-sm"
                  onClick={() => setReadFilter("read")}
                >
                  {t("notificationsPage.readLabel")}
                </Button>
              </div>

              <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 scrollbar-none">
                <div className="flex gap-1.5 sm:gap-2 pb-1">
                  {NOTIFICATION_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={typeFilter === type.value ? (type.isCritical ? "destructive" : "secondary") : "ghost"}
                      size="sm"
                      onClick={() => setTypeFilter(type.value)}
                      className={cn(
                        "text-xs whitespace-nowrap h-8 px-2.5 sm:px-3 flex-shrink-0",
                        type.isCritical && typeFilter !== type.value && "text-destructive hover:text-destructive"
                      )}
                    >
                      <type.icon className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">{type.label}</span>
                      <span className="sm:hidden">
                        {type.value === "access_request" ? "Access" : type.value === "data_viewed" ? "Viewed" : type.value === "prescription_added" ? "Rx" : type.value === "report_shared" ? "Reports" : type.label}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
