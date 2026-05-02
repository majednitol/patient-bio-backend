import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { formatDistanceToNow } from "date-fns";

export const OfflineBanner = React.memo(function OfflineBanner() {
  const { t } = useTranslation();
  const { isOnline, lastSyncAt } = useOfflineMode();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium"
        >
          <WifiOff className="h-3 w-3" />
          <span>{t("pwa.offline")}</span>
          {lastSyncAt && (
            <span className="text-[10px] opacity-70">
              · {formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
