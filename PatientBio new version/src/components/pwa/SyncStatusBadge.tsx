import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { CloudOff, Loader2 } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";

export function SyncStatusBadge() {
  const { t } = useTranslation();
  const { pendingSyncCount, isSyncing } = useOfflineMode();

  if (pendingSyncCount === 0 && !isSyncing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium"
      >
        {isSyncing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{t("pwa.syncing")}</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3" />
            <span>{t("pwa.pending", { count: pendingSyncCount })}</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
