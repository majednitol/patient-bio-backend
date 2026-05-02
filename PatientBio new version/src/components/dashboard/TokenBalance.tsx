import { useTranslation } from "react-i18next";
import { Wallet, TrendingUp, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TokenBalanceProps {
  balance: number;
  totalEarned: number;
  thisMonthEarnings: number;
  totalShares: number;
  walletAddress?: string;
  isLoading?: boolean;
}

export const TokenBalance = ({ balance, totalEarned, thisMonthEarnings, totalShares, walletAddress, isLoading }: TokenBalanceProps) => {
  const { t } = useTranslation();
  const avgPerShare = totalShares > 0 ? totalEarned / totalShares : 0;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardHeader className="pb-2"><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent className="space-y-4"><Skeleton className="h-12 w-40" /><div className="flex gap-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div></CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <CardHeader className="pb-2 relative">
        <CardTitle className="flex items-center gap-2 text-lg"><Wallet className="h-5 w-5 text-primary" />{t("walletDetails.myDataWallet")}</CardTitle>
        {walletAddress && <p className="text-xs text-muted-foreground font-mono">{walletAddress}</p>}
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("walletDetails.tokenBalance")}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-lg font-semibold text-primary/70">PBIO</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Coins className="h-4 w-4" /><span className="text-xs">{t("walletDetails.totalEarned")}</span></div>
            <p className="text-lg font-semibold">{totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PBIO</p>
          </div>
          <div className="p-3 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs">{t("walletDetails.thisMonth")}</span></div>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">+{thisMonthEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-muted-foreground">PBIO</span></p>
          </div>
          <div className="p-3 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Wallet className="h-4 w-4" /><span className="text-xs">{t("walletDetails.totalShares")}</span></div>
            <p className="text-lg font-semibold">{totalShares}</p>
          </div>
          <div className="p-3 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1"><Coins className="h-4 w-4" /><span className="text-xs">{t("walletDetails.avgPerShare")}</span></div>
            <p className="text-lg font-semibold">{avgPerShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PBIO</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};