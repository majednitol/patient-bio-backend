import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FileText, Upload, Share2, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useNotifications } from "@/hooks/useNotifications";
import { hapticTap } from "@/lib/haptics";

export const MobileBottomNav = React.memo(() => {
  const location = useLocation();
  const { t } = useTranslation();
  const { notifications } = useNotifications();

  // Count unread notifications relevant to each nav section
  const recordsBadge = notifications.filter(
    (n) => !n.is_read && ["prescription_added", "report_shared"].includes(n.type)
  ).length;
  const appointmentsBadge = notifications.filter(
    (n) => !n.is_read && ["appointment_reminder", "appointment_confirmed", "appointment_cancelled", "waitlist_available"].includes(n.type)
  ).length;

  const navItems = [
    { icon: Home, label: t("mobileNav.home"), path: "/dashboard", badge: 0 },
    { icon: FileText, label: t("mobileNav.records"), path: "/dashboard/prescriptions", badge: recordsBadge },
    { icon: Upload, label: t("mobileNav.upload"), path: "/dashboard/upload", badge: 0 },
    { icon: Share2, label: t("mobileNav.share"), path: "/dashboard/share", badge: 0 },
    { icon: CalendarDays, label: t("mobileNav.appointments"), path: "/dashboard/appointments", badge: appointmentsBadge },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 dark:border-border/60 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => hapticTap()}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 min-w-[48px] min-h-[48px] px-3 py-1.5",
                "active:scale-90 active:opacity-70",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 transition-all", active && "stroke-[2.5] scale-110")} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] max-w-[24px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium transition-all", active && "font-bold")}>
                {item.label}
              </span>
              {active && (
                <motion.span
                  layoutId="bottomNavIndicator"
                  className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = "MobileBottomNav";
