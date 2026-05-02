import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
  });

  const [dismissed, setDismissed] = useState(false);
  const show = needRefresh && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 z-50 bg-primary text-primary-foreground rounded-xl shadow-lg p-4 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-primary-foreground/10 shrink-0">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t("pwa.updateTitle")}</p>
            <p className="text-xs opacity-80">{t("pwa.updateDesc")}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={() => updateServiceWorker(true)}
          >
            {t("pwa.update")}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 opacity-70 hover:opacity-100 transition-opacity shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
