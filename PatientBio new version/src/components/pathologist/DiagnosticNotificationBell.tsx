import {
  Bell,
  Check,
  X,
  Users,
  Send,
  Inbox,
  Barcode,
  Building2,
  Share2,
  Receipt,
  ChevronRight,
  AlertTriangle,
  Microscope,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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

const DIAGNOSTIC_ROUTES: Record<string, string> = {
  lab_order_received: "/pathologist/hospital-orders",
  doctor_referral: "/pathologist/from-doctors",
  sample_status_update: "/pathologist/sample-tracking",
  report_shared: "/pathologist/to-doctors",
  patient_share_received: "/pathologist/patient-shares",
  invoice_payment: "/pathologist/billing",
};

function getDiagnosticRoute(type: string): string | null {
  return DIAGNOSTIC_ROUTES[type] ?? null;
}

const ICON_CONFIG: Record<string, { icon: typeof Bell; bg: string; text: string }> = {
  lab_order_received: { icon: Building2, bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" },
  doctor_referral: { icon: Users, bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400" },
  sample_status_update: { icon: Barcode, bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  report_shared: { icon: Send, bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
  patient_share_received: { icon: Share2, bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  invoice_payment: { icon: Receipt, bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
};

const CRITICAL_TYPES = new Set(["lab_order_received", "sample_status_update"]);

export const DiagnosticNotificationBell = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const hasCriticalUnread = useMemo(
    () =>
      notifications.some(
        (n) =>
          !n.is_read &&
          (CRITICAL_TYPES.has(n.type) ||
            (n.metadata as Record<string, unknown> | undefined)?.is_critical === true)
      ),
    [notifications]
  );

  const getNotificationIcon = (type: string) => {
    const config = ICON_CONFIG[type];
    const isCritical = CRITICAL_TYPES.has(type);
    if (config) {
      const Icon = config.icon;
      return (
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
            config.bg,
            isCritical && "ring-2 ring-amber-500"
          )}
        >
          <Icon className={cn("h-3.5 w-3.5", config.text)} />
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", hasCriticalUnread && "animate-pulse")}
          aria-label="Diagnostic Notifications"
        >
          {hasCriticalUnread ? (
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-medium flex items-center justify-center bg-teal-600 text-white",
                hasCriticalUnread && "bg-amber-500 animate-bounce"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-0 mr-1 sm:mr-0"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h4 className="font-semibold text-xs sm:text-sm">Lab Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground h-6 px-1.5"
              onClick={() => markAllAsRead()}
            >
              <Check className="h-3 w-3 mr-0.5" />
              Read all
            </Button>
          )}
        </div>
        <ScrollArea className="h-[280px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="p-2.5 rounded-full bg-muted mb-2">
                <Microscope className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-xs sm:text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const metadata = notification.metadata as Record<string, unknown> | undefined;
                const isCritical =
                  CRITICAL_TYPES.has(notification.type) ||
                  metadata?.is_critical === true;
                const route = getDiagnosticRoute(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-2 p-2 sm:p-3 hover:bg-muted/50 transition-colors cursor-pointer group",
                      !notification.is_read && "bg-primary/5",
                      isCritical && !notification.is_read && "bg-amber-50 dark:bg-amber-900/10 border-l-2 border-amber-500"
                    )}
                    onClick={() => {
                      if (!notification.is_read) markAsRead(notification.id);
                      if (route) navigate(route);
                    }}
                  >
                    {getNotificationIcon(notification.type)}
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
                          <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 leading-none">
                            !
                          </Badge>
                        )}
                        {!notification.is_read && !isCritical && (
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
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
                        {route && <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />}
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
          <Link to="/pathologist/from-doctors">
            <Button variant="ghost" size="sm" className="w-full text-[10px] sm:text-xs h-7">
              View All Activity
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
