import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";

export const SyncIndicator = React.memo(function SyncIndicator() {
  const { t } = useTranslation();
  const { isSyncing, isOnline, pendingSyncCount } = useOfflineMode();

  if (isOnline && !isSyncing && pendingSyncCount === 0) return null;

  return (
    <AnimatePresence mode="wait">
      {isSyncing ? (
        <motion.div
          key="syncing"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="flex items-center gap-1 text-primary"
          title={t("pwa.syncing")}
        >
          <RefreshCw className="h-4 w-4 animate-spin" />
        </motion.div>
      ) : pendingSyncCount > 0 ? (
        <motion.div
          key="pending"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="relative flex items-center text-muted-foreground"
          title={t("pwa.pendingChanges", { count: pendingSyncCount })}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
            {pendingSyncCount}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});
