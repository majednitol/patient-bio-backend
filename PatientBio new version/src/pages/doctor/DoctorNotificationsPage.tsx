import { useState } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Bell,
  BellRing,
  UserPlus,
  FileText,
  Calendar,
  Microscope,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  Filter,
  Share2,
  ShieldCheck,
  Activity,
} from "lucide-react";

type NotificationFilter = "all" | "unread" | "patient" | "appointment" | "lab" | "sharing";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "patient_connected":
    case "new_patient":
      return UserPlus;
    case "prescription":
    case "prescription_created":
      return FileText;
    case "appointment":
    case "appointment_reminder":
    case "appointment_booked":
    case "appointment_cancelled":
      return Calendar;
    case "lab_result":
    case "pathologist_report":
    case "report_shared":
      return Microscope;
    case "data_shared":
    case "patient_shared_data":
    case "referral_received":
      return Share2;
    case "access_granted":
      return ShieldCheck;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "patient_connected":
    case "new_patient":
    case "access_granted":
      return "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400";
    case "appointment":
    case "appointment_reminder":
    case "appointment_booked":
      return "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400";
    case "appointment_cancelled":
      return "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400";
    case "lab_result":
    case "pathologist_report":
    case "report_shared":
      return "text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-400";
    case "data_shared":
    case "patient_shared_data":
    case "referral_received":
      return "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400";
    default:
      return "text-primary bg-primary/10";
  }
};

const DoctorNotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const filteredNotifications = notifications.filter((n) => {
    switch (filter) {
      case "unread":
        return !n.is_read;
      case "patient":
        return n.type.includes("patient") || n.type.includes("connected");
      case "appointment":
        return n.type.includes("appointment");
      case "lab":
        return n.type.includes("lab") || n.type.includes("pathologist") || n.type.includes("report");
      case "sharing":
        return n.type.includes("shared") || n.type.includes("referral") || n.type.includes("access");
      default:
        return true;
    }
  });

  // Count by category for badges
  const categoryCounts = {
    patient: notifications.filter((n) => n.type.includes("patient") || n.type.includes("connected")).length,
    appointment: notifications.filter((n) => n.type.includes("appointment")).length,
    lab: notifications.filter((n) => n.type.includes("lab") || n.type.includes("pathologist") || n.type.includes("report")).length,
    sharing: notifications.filter((n) => n.type.includes("shared") || n.type.includes("referral") || n.type.includes("access")).length,
  };

  const filterButtons: { key: NotificationFilter; label: string; icon?: React.ElementType; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "patient", label: "Patients", icon: UserPlus, count: categoryCounts.patient },
    { key: "appointment", label: "Appointments", icon: Calendar, count: categoryCounts.appointment },
    { key: "lab", label: "Lab Results", icon: Microscope, count: categoryCounts.lab },
    { key: "sharing", label: "Data Sharing", icon: Share2, count: categoryCounts.sharing },
  ];

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <BellRing className="h-6 w-6 text-primary" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1 animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""} — stay on top of your practice`
                : "All caught up! No pending alerts."}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead()} className="shrink-0 transition-all hover:bg-primary hover:text-primary-foreground">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        {([
          { label: "Patients", icon: UserPlus, count: categoryCounts.patient, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40" },
          { label: "Appointments", icon: Calendar, count: categoryCounts.appointment, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/40" },
          { label: "Lab Results", icon: Microscope, count: categoryCounts.lab, color: "text-violet-600 bg-violet-100 dark:bg-violet-900/40" },
          { label: "Data Sharing", icon: Share2, count: categoryCounts.sharing, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/40" },
        ] as const).map((stat) => (
          <Card key={stat.label} className="transition-all hover:shadow-md hover:scale-[1.02] duration-200">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{stat.count}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {filterButtons.map((btn) => (
          <Button
            key={btn.key}
            variant={filter === btn.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(btn.key)}
            className="h-8 text-xs px-3 shrink-0 transition-all duration-200"
          >
            {btn.icon && <btn.icon className="h-3.5 w-3.5 mr-1" />}
            {btn.label}
            {btn.count !== undefined && btn.count > 0 && (
              <Badge variant={filter === btn.key ? "secondary" : "outline"} className="ml-1.5 text-[10px] px-1 py-0 h-4">
                {btn.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "all" ? "No notifications yet" : "No matching notifications"}
          description={
            filter === "all"
              ? "You'll be instantly notified when patients share data, appointments are booked, or lab results arrive."
              : "Try changing your filter to see more notifications."
          }
          action={
            filter !== "all"
              ? { label: "Show All", onClick: () => setFilter("all") }
              : undefined
          }
        />
      ) : (
        <ScrollArea className="h-[calc(100vh-380px)]">
          <div className="space-y-2">
            {filteredNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);

              return (
                <Card
                  key={notification.id}
                  className={cn(
                    "transition-all duration-300 hover:shadow-md animate-fade-in group",
                    !notification.is_read && "border-l-4 border-l-primary bg-primary/5"
                  )}
                  style={{ animationDelay: `${index * 0.03}s`, animationFillMode: "both" }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "p-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-110",
                        colorClass
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn("font-medium", !notification.is_read && "text-foreground")}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {notification.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span title={format(new Date(notification.created_at), "PPpp")}>
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                              {!notification.is_read && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0 animate-pulse">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => markAsRead(notification.id)}
                                title="Mark as read"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteNotification(notification.id)}
                              title="Delete notification"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Real-time indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
        </span>
        Live — notifications appear in real-time
      </div>
    </div>
  );
};

export default DoctorNotificationsPage;
