import { useState, useEffect } from "react";
import { usePatientFeatureEligibility } from "@/hooks/usePatientFeatureEligibility";
import { FeatureGateBlocker } from "@/components/shared/FeatureGateBlocker";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useTranslation } from "react-i18next";
import { usePatientWallet } from "@/hooks/usePatientWallet";
import { markWalletVisited } from "@/hooks/useUnseenTransactions";
import { TokenBalance } from "@/components/dashboard/TokenBalance";
import { TransactionHistory } from "@/components/dashboard/TransactionHistory";
import { EarningsChart } from "@/components/dashboard/EarningsChart";
import { WalletQuickActions } from "@/components/dashboard/WalletQuickActions";
import { TokenIncentiveCalculator } from "@/components/dashboard/TokenIncentiveCalculator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, History, TrendingUp, Lock, Shield, Coins,
  ArrowDownToLine, FileText, Upload, Settings2, CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const WalletPage = () => {
  const { t } = useTranslation();
  const eligibility = usePatientFeatureEligibility();
  const { 
    wallet, transactions, recentTransactions, thisMonthEarnings, isLoading, pricing 
  } = usePatientWallet();

  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    markWalletVisited();
  }, []);

  const hasZeroBalance = !isLoading && (wallet?.token_balance ?? 0) === 0 && transactions.length === 0;

  if (eligibility.isLoading) return <PageSkeleton />;
  if (!eligibility.isEligible) return <FeatureGateBlocker eligibility={eligibility} feature="wallet" />;

 return (
   <div>
      <div className="mb-4 sm:mb-8">
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("walletPage.earnDescription")}
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6 lg:space-y-0 desktop-two-col">
        <div className="space-y-4 sm:space-y-6">
        <TokenBalance
          balance={wallet?.token_balance ?? 0}
          totalEarned={wallet?.total_earned ?? 0}
          thisMonthEarnings={thisMonthEarnings}
          totalShares={transactions.length}
          walletAddress={wallet?.wallet_address}
          isLoading={isLoading}
        />

        <EarningsChart transactions={transactions} isLoading={isLoading} />

        <Tabs defaultValue="transactions" className="space-y-4">
           <TabsList className="grid w-full grid-cols-3 h-auto">
             <TabsTrigger value="transactions" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
               <History className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t("walletPage.transactions")}</span>
                <span className="sm:hidden">Txns</span>
             </TabsTrigger>
             <TabsTrigger value="pricing" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
               <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t("walletPage.tokenPricing")}</span>
                <span className="sm:hidden">Pricing</span>
             </TabsTrigger>
             <TabsTrigger value="about" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
               <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t("walletPage.aboutPBIO")}</span>
                <span className="sm:hidden">About</span>
             </TabsTrigger>
           </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            <TransactionHistory
              transactions={showAllTransactions ? transactions : recentTransactions}
              isLoading={isLoading}
              showAll={showAllTransactions}
              onViewAll={() => setShowAllTransactions(true)}
              filterType={filterType}
              onFilterChange={setFilterType}
            />

            {showAllTransactions && transactions.length > 5 && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowAllTransactions(false)}
              >
                {t("walletPage.showLess")}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("walletPage.tokenRewards")}</CardTitle>
                <CardDescription>
                  {t("walletPage.tokenRewardsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {pricing.length > 0 ? (
                    pricing.map((price) => (
                      <div
                        key={price.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium capitalize">
                            {price.disease_category.replace("_", " ")} Data
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-primary font-semibold">
                          {Number(price.base_price_tokens).toFixed(0)} PBIO
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      {t("common.loading")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("walletPage.aboutTitle")}</CardTitle>
                <CardDescription>
                  {t("walletPage.aboutDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {t("walletPage.yourDataControl")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("walletPage.yourDataControlDesc")}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{t("walletPage.privacyFirst")}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("walletPage.privacyFirstDesc")}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{t("walletPage.fairCompensation")}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("walletPage.fairCompensationDesc")}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <ArrowDownToLine className="h-5 w-5" />
                    {t("walletPage.comingSoon")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("walletPage.comingSoonDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <WalletQuickActions />
          <TokenIncentiveCalculator />

          {hasZeroBalance && (
            <Card className="border-dashed border-2 border-primary/30">
              <CardContent className="py-5 sm:py-8">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold">{t("walletPage.startEarning")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t("walletPage.startEarningDesc")}</p>
                </div>
                <div className="grid gap-4">
                  <button onClick={() => navigate("/dashboard/prescriptions")} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center">
                    <div className="p-2 rounded-full bg-primary/10"><Upload className="h-5 w-5 text-primary" /></div>
                    <span className="text-sm font-medium">{t("walletPage.uploadRecords")}</span>
                    <span className="text-xs text-muted-foreground">{t("walletPage.uploadRecordsDesc")}</span>
                  </button>
                  <button onClick={() => navigate("/dashboard/research-preferences")} className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center">
                    <div className="p-2 rounded-full bg-primary/10"><Settings2 className="h-5 w-5 text-primary" /></div>
                    <span className="text-sm font-medium">{t("walletPage.setPreferences")}</span>
                    <span className="text-xs text-muted-foreground">{t("walletPage.setPreferencesDesc")}</span>
                  </button>
                  <div className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card text-center">
                    <div className="p-2 rounded-full bg-primary/10"><CheckCircle2 className="h-5 w-5 text-primary" /></div>
                    <span className="text-sm font-medium">{t("walletPage.approveRequests")}</span>
                    <span className="text-xs text-muted-foreground">{t("walletPage.approveRequestsDesc")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
