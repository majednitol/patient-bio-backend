import { Bell, Check, X, Eye, Shield, Pill, FileText, AlertTriangle, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getNotificationRoute } from "@/utils/notificationRoutes";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export const NotificationBell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  // Check if there are any critical unread notifications
  const hasCriticalUnread = useMemo(() => {
    return notifications.some(
      (n) => !n.is_read && (n.type === "emergency_access" || (n.metadata as Record<string, unknown> | undefined)?.is_critical === true)
    );
  }, [notifications]);

  const isCriticalNotification = (type: string, metadata?: Record<string, unknown>) => {
    return type === "emergency_access" || metadata?.is_critical === true;
  };

  const iconSize = "w-6 h-6 sm:w-8 sm:h-8";
  const iconInner = "h-3 w-3 sm:h-4 sm:w-4";

  const getNotificationIcon = (type: string, metadata?: Record<string, unknown>) => {
    const isCritical = isCriticalNotification(type, metadata);
    
    switch (type) {
      case "emergency_access":
        return (
          <div className={cn(iconSize, "rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 ring-2 ring-red-500")}>
            <Shield className={cn(iconInner, "text-red-600 dark:text-red-400")} />
          </div>
        );
      case "access_request":
        return (
          <div className={cn(iconSize, "rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0")}>
            <Shield className={cn(iconInner, "text-amber-600 dark:text-amber-400")} />
          </div>
        );
      case "data_viewed":
        return (
          <div className={cn(iconSize, `rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 ${isCritical ? "ring-2 ring-blue-500" : ""}`)}>
            <Eye className={cn(iconInner, "text-blue-600 dark:text-blue-400")} />
          </div>
        );
      case "prescription_added":
        return (
          <div className={cn(iconSize, "rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0")}>
            <Pill className={cn(iconInner, "text-purple-600 dark:text-purple-400")} />
          </div>
        );
      case "request_approved":
        return (
          <div className={cn(iconSize, "rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0")}>
            <Check className={cn(iconInner, "text-green-600 dark:text-green-400")} />
          </div>
        );
      case "request_rejected":
        return (
          <div className={cn(iconSize, "rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0")}>
            <X className={cn(iconInner, "text-red-600 dark:text-red-400")} />
          </div>
        );
      case "report_shared":
        return (
          <div className={cn(iconSize, "rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0")}>
            <FileText className={cn(iconInner, "text-teal-600 dark:text-teal-400")} />
          </div>
        );
      default:
        return (
          <div className={cn(iconSize, "rounded-full bg-muted flex items-center justify-center flex-shrink-0")}>
            <Bell className={cn(iconInner, "text-muted-foreground")} />
          </div>
        );
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            hasCriticalUnread && "animate-pulse"
          )}
          aria-label="Notifications"
        >
          {hasCriticalUnread ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className={cn(
              "absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-medium flex items-center justify-center",
              hasCriticalUnread 
                ? "bg-destructive text-destructive-foreground animate-bounce" 
                : "bg-destructive text-destructive-foreground"
            )}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-0 mr-1 sm:mr-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h4 className="font-semibold text-xs sm:text-sm">{t("notificationBell.notifications")}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground h-6 px-1.5"
              onClick={() => markAllAsRead()}
            >
              <Check className="h-3 w-3 mr-0.5" />
              {t("notificationBell.readAll")}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[240px] sm:h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="p-2.5 rounded-full bg-muted mb-2">
                <Bell className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-xs sm:text-sm">{t("notificationBell.noNotifications")}</p>
            </div>
          ) : (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const metadata = notification.metadata as Record<string, unknown> | undefined;
                    const isCritical = isCriticalNotification(notification.type, metadata);
                    
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex gap-2 p-2 sm:p-3 hover:bg-muted/50 transition-colors cursor-pointer group",
                          !notification.is_read && "bg-primary/5",
                          isCritical && !notification.is_read && "bg-destructive/10 border-l-2 border-destructive"
                        )}
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                          const route = getNotificationRoute(notification.type, metadata);
                          if (route) navigate(route);
                        }}
                      >
                        {getNotificationIcon(notification.type, metadata)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p
                              className={cn(
                                "text-[11px] sm:text-sm truncate",
                                !notification.is_read && "font-medium"
                              )}
                            >
                              {notification.title}
                            </p>
                            {isCritical && !notification.is_read && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 leading-none">
                                !
                              </Badge>
                            )}
                            {!notification.is_read && !isCritical && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <p className="text-[9px] sm:text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                            {getNotificationRoute(notification.type, metadata) && (
                              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 sm:h-6 sm:w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 self-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                    );
                  })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-1.5">
          <Link to="/dashboard/notifications">
            <Button variant="ghost" size="sm" className="w-full text-[10px] sm:text-xs h-7">
              {t("notificationBell.viewAll")}
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
