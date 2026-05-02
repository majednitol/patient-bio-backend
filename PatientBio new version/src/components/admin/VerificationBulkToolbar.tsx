import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VerificationBulkToolbarProps {
  selectedCount: number;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onClearSelection: () => void;
  isProcessing?: boolean;
}

export function VerificationBulkToolbar({
  selectedCount,
  onBulkApprove,
  onBulkReject,
  onClearSelection,
  isProcessing,
}: VerificationBulkToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-card border rounded-xl shadow-lg px-3 sm:px-4 py-2 sm:py-3">
        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
          {t("providerVerifications.selectedCount", { count: selectedCount })}
        </span>
        
        <div className="h-4 w-px bg-border hidden sm:block" />
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            size="sm"
            onClick={onBulkApprove}
            disabled={isProcessing}
            className="h-8 text-xs sm:text-sm"
          >
            <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">{t("providerVerifications.approveAll")}</span>
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onBulkReject}
            disabled={isProcessing}
            className="h-8 text-xs sm:text-sm"
          >
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span className="hidden sm:inline">{t("providerVerifications.rejectAll")}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8"
            title={t("providerVerifications.clearSelection")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
