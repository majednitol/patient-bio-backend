import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2, Inbox, Settings2 } from "lucide-react";
import ShareWithResearcherDialog from "@/components/dashboard/ShareWithResearcherDialog";
import { useTranslation } from "react-i18next";

export const WalletQuickActions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <ShareWithResearcherDialog
        trigger={
          <Button variant="outline" className="w-full h-auto flex flex-col items-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 text-[10px] sm:text-sm px-1 sm:px-3">
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="leading-tight text-center">{t("walletActions.shareForResearch")}</span>
          </Button>
        }
      />
      <Button
        variant="outline"
        className="h-auto flex flex-col items-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 text-[10px] sm:text-sm px-1 sm:px-3"
        onClick={() => navigate("/dashboard/requests")}
      >
        <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <span className="leading-tight text-center">{t("walletActions.dataRequests")}</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto flex flex-col items-center gap-1 sm:gap-1.5 py-2.5 sm:py-3 text-[10px] sm:text-sm px-1 sm:px-3"
        onClick={() => navigate("/dashboard/research-preferences")}
      >
        <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <span className="leading-tight text-center">{t("walletActions.preferences")}</span>
      </Button>
    </div>
  );
};
