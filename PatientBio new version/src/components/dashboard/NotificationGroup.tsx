import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Notification } from "@/hooks/useNotifications";
import { getNotificationRoute } from "@/utils/notificationRoutes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, Check, Trash2, Eye, Shield, Pill, FileText, X,
  AlertTriangle, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import type { LucideIcon } from "lucide-react";

export type NotificationCategory = "access" | "appointments" | "medications" | "system";

interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  colorClasses: string;
  iconColor: string;
}

const CATEGORY_CONFIG: Record<NotificationCategory, CategoryConfig> = {
  access: {
    label: "Access & Security",
    icon: Shield,
    colorClasses: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  appointments: {
    label: "Appointments",
    icon: Bell,
    colorClasses: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  medications: {
    label: "Medications & Reports",
    icon: Pill,
    colorClasses: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  system: {
    label: "System",
    icon: Bell,
    colorClasses: "bg-muted",
    iconColor: "text-muted-foreground",
  },
};

export function categorizeNotification(type: string): NotificationCategory {
  switch (type) {
    case "access_request":
    case "data_viewed":
    case "emergency_access":
    case "request_approved":
    case "request_rejected":
      return "access";
    case "appointment_reminder":
    case "appointment_cancelled":
    case "appointment_confirmed":
    case "follow_up":
      return "appointments";
    case "prescription_added":
    case "report_shared":
    case "medication_reminder":
    case "lab_result":
      return "medications";
    default:
      return "system";
  }
}

const isCriticalNotification = (type: string, metadata?: Record<string, unknown>) => {
  return type === "emergency_access" || metadata?.is_critical === true;
};

const getNotificationIcon = (type: string, metadata?: Record<string, unknown>) => {
  const isCritical = isCriticalNotification(type, metadata);
  const size = "w-7 h-7 sm:w-10 sm:h-10";
  const iconSize = "h-3.5 w-3.5 sm:h-5 sm:w-5";

  switch (type) {
    case "emergency_access":
      return (
        <div className={cn(size, "rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 ring-2 ring-red-500 ring-offset-1 sm:ring-offset-2 ring-offset-background animate-pulse")}>
          <Shield className={cn(iconSize, "text-red-600 dark:text-red-400")} />
        </div>
      );
    case "access_request":
      return (
        <div className={cn(size, "rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0")}>
          <Shield className={cn(iconSize, "text-amber-600 dark:text-amber-400")} />
        </div>
      );
    case "data_viewed":
      return (
        <div className={cn(size, `rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 ${isCritical ? "ring-2 ring-blue-500 ring-offset-1 sm:ring-offset-2 ring-offset-background" : ""}`)}>
          <Eye className={cn(iconSize, "text-blue-600 dark:text-blue-400")} />
        </div>
      );
    case "prescription_added":
      return (
        <div className={cn(size, "rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0")}>
          <Pill className={cn(iconSize, "text-purple-600 dark:text-purple-400")} />
        </div>
      );
    case "request_approved":
      return (
        <div className={cn(size, "rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0")}>
          <Check className={cn(iconSize, "text-green-600 dark:text-green-400")} />
        </div>
      );
    case "request_rejected":
      return (
        <div className={cn(size, "rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0")}>
          <X className={cn(iconSize, "text-red-600 dark:text-red-400")} />
        </div>
      );
    case "report_shared":
      return (
        <div className={cn(size, "rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0")}>
          <FileText className={cn(iconSize, "text-teal-600 dark:text-teal-400")} />
        </div>
      );
    default:
      return (
        <div className={cn(size, "rounded-full bg-muted flex items-center justify-center flex-shrink-0")}>
          <Bell className={cn(iconSize, "text-muted-foreground")} />
        </div>
      );
  }
};

interface NotificationGroupProps {
  category: NotificationCategory;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkGroupAsRead: (ids: string[]) => void;
  onDelete: (id: string) => void;
}

export function NotificationGroup({
  category,
  notifications,
  onMarkAsRead,
  onMarkGroupAsRead,
  onDelete,
}: NotificationGroupProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const config = CATEGORY_CONFIG[category];
  const CategoryIcon = config.icon;
  const unreadInGroup = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {/* Group Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 sm:px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <div className={cn("w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center", config.colorClasses)}>
            <CategoryIcon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", config.iconColor)} />
          </div>
          <span className="text-xs sm:text-sm font-semibold">{config.label}</span>
          <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 h-5">
            {notifications.length}
          </Badge>
          {unreadInGroup > 0 && (
            <Badge className="text-[10px] sm:text-xs px-1.5 h-5 bg-primary text-primary-foreground">
              {unreadInGroup} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadInGroup > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[10px] sm:text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
                onMarkGroupAsRead(unreadIds);
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark group read
            </Button>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Notification Items */}
      {isOpen && (
        <div className="space-y-1.5 sm:space-y-2 pl-2 sm:pl-4">
          {notifications.map((notification) => (
            <SwipeableRow
              key={notification.id}
              leftActions={
                !notification.is_read
                  ? [
                      {
                        icon: <Check className="h-5 w-5" />,
                        label: "Read",
                        color: "bg-primary",
                        onClick: () => onMarkAsRead(notification.id),
                      },
                    ]
                  : []
              }
              rightActions={[
                {
                  icon: <Trash2 className="h-5 w-5" />,
                  label: "Delete",
                  color: "bg-destructive",
                  onClick: () => onDelete(notification.id),
                },
              ]}
            >
              <Card
                className={cn(
                  "transition-all hover:shadow-md cursor-pointer group/item dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]",
                  !notification.is_read && "border-primary/30 bg-primary/5"
                )}
                onClick={() => {
                  if (!notification.is_read) onMarkAsRead(notification.id);
                  const route = getNotificationRoute(
                    notification.type,
                    notification.metadata as Record<string, unknown> | undefined
                  );
                  if (route) navigate(route);
                }}
              >
                <CardContent className="p-2.5 sm:p-4">
                  <div className="flex gap-2 sm:gap-4">
                    {getNotificationIcon(
                      notification.type,
                      notification.metadata as Record<string, unknown> | undefined
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={cn("text-xs sm:text-sm truncate", !notification.is_read && "font-semibold")}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1 sm:mt-2">
                        <div className="flex items-center gap-1">
                          <p className="text-[9px] sm:text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                          {getNotificationRoute(
                            notification.type,
                            notification.metadata as Record<string, unknown> | undefined
                          ) && <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(notification.id);
                              }}
                            >
                              <Check className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">{t("notificationsPage.markRead")}</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(notification.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SwipeableRow>
          ))}
        </div>
      )}
    </div>
  );
}
