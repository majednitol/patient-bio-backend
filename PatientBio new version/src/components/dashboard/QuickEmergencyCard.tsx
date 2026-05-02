import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ShieldAlert, Droplets, AlertTriangle, Pill, Phone, ChevronDown } from "lucide-react";
import { useHealthData } from "@/hooks/useHealthData";
import { useTranslation } from "react-i18next";
import { parseAllergiesText, getSeverityColor } from "@/lib/allergyParser";

/**
 * Pull-down emergency health card overlay on dashboard.
 * Swipe down from the very top of the dashboard content to reveal
 * critical health info (blood type, allergies, meds, emergency contact).
 * Mobile-only.
 */
export const QuickEmergencyCard = () => {
  const { healthData } = useHealthData();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pulling, setPulling] = useState(false);
  const startY = useRef(0);
  const pullY = useMotionValue(0);
  const opacity = useTransform(pullY, [0, 60], [0, 1]);
  const indicatorY = useTransform(pullY, [0, 60], [0, 12]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate at the very top of scroll
    const el = e.currentTarget;
    if (el.scrollTop > 5) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && delta < 120) {
      pullY.set(delta * 0.5);
    }
  }, [pulling, pullY]);

  const handleTouchEnd = useCallback(() => {
    if (!pulling) return;
    setPulling(false);
    if (pullY.get() > 30) {
      setIsOpen(true);
    }
    pullY.set(0);
  }, [pulling, pullY]);

  const parsedAllergies = parseAllergiesText(healthData?.health_allergies);
  const allergyDisplay = parsedAllergies.length > 0
    ? parsedAllergies.map(a => a.name).join(", ")
    : null;

  const emergencyPhone = healthData?.emergency_contact_phone || null;

  const items = [
    { label: t("emergencyCard.bloodGroup"), value: healthData?.blood_group, icon: Droplets, critical: true },
    { label: t("emergencyCard.allergies"), value: allergyDisplay, icon: AlertTriangle, critical: true, allergies: parsedAllergies },
    { label: t("emergencyCard.currentMedications"), value: healthData?.current_medications, icon: Pill },
    { label: t("emergencyCard.emergencyContact"),
      value: healthData?.emergency_contact_name
        ? `${healthData.emergency_contact_name} — ${healthData.emergency_contact_phone || ""}`
        : null,
      icon: Phone },
  ];

  return (
    <>
      {/* Pull indicator - only visible on mobile */}
      <div
        className="lg:hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <motion.div
          style={{ y: indicatorY }}
          className="flex flex-col items-center justify-center gap-1 py-3 text-muted-foreground cursor-grab active:cursor-grabbing"
          initial={{ y: 0 }}
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, delay: 1, repeat: 1 }}
        >
          <div className="w-8 h-1 rounded-full bg-border mb-0.5" />
          <div className="flex items-center gap-1.5">
            <ChevronDown className="h-3 w-3" />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {t("emergencyCard.pullHint", "Pull for Emergency Info")}
            </span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </motion.div>
      </div>

      {/* Full overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-card border-b-2 border-destructive/30 rounded-b-2xl shadow-2xl safe-area-top p-4 pt-12"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{t("emergencyCard.title")}</h3>
                  <p className="text-xs text-muted-foreground">{t("emergencyCard.criticalInfo")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {items.map((item) => (
                  <div
                    key={item.label}
                    className={`p-3 rounded-xl border ${
                      item.critical
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-muted/50 border-border/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <item.icon className={`h-3.5 w-3.5 ${item.critical ? "text-destructive" : "text-muted-foreground"}`} />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {item.label}
                      </span>
                    </div>
                    {/* Allergy severity badges */}
                    {item.allergies && item.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.allergies.slice(0, 2).map((a, i) => {
                          const colors = getSeverityColor(a.severity);
                          return (
                            <span
                              key={i}
                              className={`inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                            >
                              {a.name}
                            </span>
                          );
                        })}
                        {item.allergies.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{item.allergies.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <p className={`text-sm font-bold truncate ${
                        !item.value ? "text-muted-foreground/50" : item.critical ? "text-destructive" : "text-foreground"
                      }`}>
                        {item.value || t("emergencyCard.notSet")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* One-tap call button */}
              {emergencyPhone && (
                <a
                  href={`tel:${emergencyPhone}`}
                  className="flex items-center justify-center gap-2 mt-3 w-full py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm shadow-lg hover:bg-destructive/90 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {t("emergencyCard.callEmergencyContact", "Call Emergency Contact")}
                </a>
              )}

              {/* Swipe-down to dismiss hint */}
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1.5 rounded-full bg-muted text-xs text-muted-foreground font-medium press-feedback"
                >
                  {t("activeAccess.tapToDismiss", "Tap to dismiss")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
