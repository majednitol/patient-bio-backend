import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, MessageSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/doctor" },
  { icon: Users, label: "Patients", path: "/doctor/patients" },
  { icon: CalendarDays, label: "Appts", path: "/doctor/appointments" },
  { icon: MessageSquare, label: "Messages", path: "/doctor/messages" },
  { icon: BarChart3, label: "Analytics", path: "/doctor/analytics" },
];

export const DoctorMobileBottomNav = React.memo(() => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/doctor") return location.pathname === "/doctor";
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
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 min-w-[48px] min-h-[48px] px-3 py-1.5",
                "active:scale-90 active:opacity-70",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-all", active && "stroke-[2.5] scale-110")} />
              <span className={cn("text-[10px] font-medium transition-all", active && "font-bold")}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
