import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { FileText, Microscope, Stethoscope, FlaskConical, ArrowUpRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DataTransaction } from "@/hooks/usePatientWallet";

interface TransactionHistoryProps {
  transactions: DataTransaction[];
  isLoading?: boolean;
  showAll?: boolean;
  onViewAll?: () => void;
  filterType?: string;
  onFilterChange?: (type: string) => void;
}

const RequesterIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "researcher": return <Microscope className="h-4 w-4" />;
    case "doctor": return <Stethoscope className="h-4 w-4" />;
    case "pathologist": return <FlaskConical className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const DiseaseCategoryBadge = ({ category }: { category: string | null }) => {
  if (!category) return null;
  const colors: Record<string, string> = {
    cancer: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    heart_disease: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    diabetes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    covid19: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    general: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };
  const label = category.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge variant="outline" className={cn("text-xs capitalize", colors[category] || colors.general)}>{label}</Badge>;
};

export const TransactionHistory = ({ transactions, isLoading, showAll = false, onViewAll, filterType = "all", onFilterChange }: TransactionHistoryProps) => {
  const { t } = useTranslation();

  const FILTER_OPTIONS = [
    { value: "all", label: t("walletDetails.all") },
    { value: "researcher", label: t("walletDetails.researcher") },
    { value: "doctor", label: t("walletDetails.doctor") },
    { value: "pathologist", label: t("walletDetails.pathologist") },
  ];

  const filteredTransactions = filterType === "all" ? transactions : transactions.filter((tx) => tx.requester_type === filterType);
  const displayTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, 5);

  if (isLoading) {
    return (
      <Card><CardHeader className="pb-3"><CardTitle className="text-lg">{t("walletDetails.recentEarnings")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">{[1, 2, 3].map((i) => (<div key={i} className="flex items-center justify-between p-3 rounded-lg border"><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div></div><Skeleton className="h-5 w-16" /></div>))}</CardContent></Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card><CardHeader className="pb-3"><CardTitle className="text-lg">{t("walletDetails.recentEarnings")}</CardTitle></CardHeader>
        <CardContent><div className="flex flex-col items-center justify-center py-8 text-center"><div className="p-3 rounded-full bg-muted mb-3"><Clock className="h-6 w-6 text-muted-foreground" /></div><p className="font-medium">{t("walletDetails.noEarningsYet")}</p><p className="text-sm text-muted-foreground mt-1">{t("walletDetails.approveToEarn")}</p></div></CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{t("walletDetails.recentEarnings")}</CardTitle>
        {!showAll && transactions.length > 5 && onViewAll && <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1">{t("walletDetails.viewAll")}<ArrowUpRight className="h-4 w-4" /></Button>}
      </CardHeader>
      <CardContent className="space-y-3">
        {onFilterChange && (
          <div className="flex flex-wrap gap-2">{FILTER_OPTIONS.map((opt) => (<Button key={opt.value} variant={filterType === opt.value ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => onFilterChange(opt.value)}>{opt.label}</Button>))}</div>
        )}
        {displayTransactions.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">{t("walletDetails.noTransactionsFilter")}</p> : null}
        {displayTransactions.map((transaction) => (
          <div key={transaction.id} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
            <div className="p-1.5 sm:p-2 rounded-full bg-primary/10 text-primary shrink-0 mt-0.5"><RequesterIcon type={transaction.requester_type} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium capitalize text-sm leading-tight block">{t("walletDetails.dataShare", { type: transaction.requester_type })}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}{transaction.is_anonymized && ` • ${t("walletDetails.anonymized")}`}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-primary text-sm whitespace-nowrap">+{Number(transaction.tokens_earned).toFixed(2)} PBIO</span>
                  {transaction.transaction_hash && <p className="text-xs text-muted-foreground font-mono truncate max-w-[100px]">{transaction.transaction_hash.slice(0, 10)}…</p>}
                </div>
              </div>
              <div className="mt-1"><DiseaseCategoryBadge category={transaction.disease_category} /></div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};