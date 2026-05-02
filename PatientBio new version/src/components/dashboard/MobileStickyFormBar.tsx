import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Save, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MobileStickyFormBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}

export const MobileStickyFormBar: React.FC<MobileStickyFormBarProps> = ({
  isDirty,
  isSaving,
  onSave,
  onDiscard,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-[calc(60px+env(safe-area-inset-bottom))] left-0 right-0 z-40 lg:hidden"
        >
          <div className="mx-2 rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-lg px-3 py-2.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="text-xs font-medium text-muted-foreground flex-1 truncate">
              {t("profilePage.unsavedChanges", "Unsaved changes")}
            </span>
            {onDiscard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                className="h-8 px-2.5 text-xs"
                disabled={isSaving}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-8 px-4 text-xs bg-gradient-to-r from-primary to-secondary border-0"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {t("common.save", "Save")}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
