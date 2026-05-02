import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Plus, Upload, QrCode, CalendarPlus, Link2, X, Camera } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

const SPRING = { type: "spring", stiffness: 400, damping: 28 } as const;

function useScrollDirection() {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 50) {
        setVisible(true);
      } else if (currentY > lastScrollY.current + 5) {
        setVisible(false); // scrolling down
      } else if (currentY < lastScrollY.current - 5) {
        setVisible(true); // scrolling up
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return visible;
}

function getActionsForRoute(pathname: string, navigate: ReturnType<typeof useNavigate>): FABAction[] | null {
  if (pathname === "/dashboard") {
    return [
      {
        icon: <Upload className="h-5 w-5" />,
        label: "Upload Record",
        onClick: () => navigate("/dashboard/upload"),
      },
    ];
  }

  if (pathname.startsWith("/dashboard/prescriptions")) {
    return [
      {
        icon: <Upload className="h-5 w-5" />,
        label: "Upload",
        onClick: () => navigate("/dashboard/upload"),
      },
      {
        icon: <QrCode className="h-5 w-5" />,
        label: "Scan QR",
        onClick: () => navigate("/dashboard/qr-code"),
      },
    ];
  }

  if (pathname.startsWith("/dashboard/appointments")) {
    return [
      {
        icon: <CalendarPlus className="h-5 w-5" />,
        label: "Book Appt",
        onClick: () => {
          // Trigger the booking dialog via state
          navigate("/dashboard/appointments", { state: { openBooking: true } });
          // Force re-render by navigating to same route
          window.dispatchEvent(new CustomEvent("fab-book-appointment"));
        },
      },
    ];
  }

  if (pathname.startsWith("/dashboard/upload")) {
    return [
      {
        icon: <Upload className="h-5 w-5" />,
        label: "Choose File",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("fab-upload-record"));
        },
      },
      {
        icon: <Camera className="h-5 w-5" />,
        label: "Take Photo",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("fab-upload-camera"));
        },
      },
    ];
  }

  if (pathname.startsWith("/dashboard/share")) {
    return [
      {
        icon: <Link2 className="h-5 w-5" />,
        label: "Create Link",
        onClick: () => {
          window.dispatchEvent(new CustomEvent("fab-create-share-link"));
        },
      },
    ];
  }

  return null;
}

export const ContextualFAB = React.memo(function ContextualFAB() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const visible = useScrollDirection();

  const actions = getActionsForRoute(pathname, navigate);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on outside tap
  const handleBackdropClick = useCallback(() => setIsOpen(false), []);

  if (!isMobile || !actions || actions.length === 0) return null;

  const isSingleAction = actions.length === 1;

  const handleFABClick = () => {
    if (isSingleAction) {
      actions[0].onClick();
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />
        )}
      </AnimatePresence>

      {/* FAB container */}
      <div className="fixed z-50 lg:hidden" style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", right: "16px" }}>
        {/* Radial action buttons */}
        <AnimatePresence>
          {isOpen &&
            actions.map((action, i) => {
              const angle = -90 - (i * 60) / Math.max(actions.length - 1, 1);
              const radianAngle = actions.length === 1 ? -Math.PI / 2 : (angle * Math.PI) / 180;
              const radius = 80;
              const offsetX = Math.cos(radianAngle) * radius;
              const offsetY = Math.sin(radianAngle) * radius;

              return (
                <motion.button
                  key={i}
                  className="absolute bottom-0 right-0 flex items-center gap-2"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{
                    opacity: 1,
                    x: offsetX,
                    y: offsetY,
                    scale: 1,
                  }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  transition={{ ...SPRING, delay: i * 0.05 }}
                  onClick={() => {
                    setIsOpen(false);
                    action.onClick();
                  }}
                  style={{ originX: 1, originY: 1 }}
                >
                  {/* Label */}
                  <span className="bg-foreground text-background text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                    {action.label}
                  </span>
                  {/* Circle */}
                  <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center">
                    {action.icon}
                  </div>
                </motion.button>
              );
            })}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          className={cn(
            "h-14 w-14 rounded-full shadow-xl flex items-center justify-center",
            "bg-primary text-primary-foreground",
            "active:scale-95 transition-shadow",
            "hover:shadow-2xl"
          )}
          animate={{
            y: visible ? 0 : 100,
            rotate: isOpen ? 45 : 0,
          }}
          transition={SPRING}
          onClick={handleFABClick}
          aria-label={isSingleAction ? actions[0].label : isOpen ? "Close menu" : "Open quick actions"}
        >
          {isSingleAction ? actions[0].icon : <Plus className="h-6 w-6" />}
        </motion.button>
      </div>
    </>
  );
});
