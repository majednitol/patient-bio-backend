/**
 * DataIntegrityCard - Summary widget for blockchain verification status
 * Part of Data Integrity Dashboard (Phase 4.4)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, ShieldAlert, RefreshCw, ExternalLink } from 'lucide-react';
import { useVerifyChain } from '@/hooks/useBlockchainVerification';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

interface DataIntegrityCardProps {
  className?: string;
  showDetailsLink?: boolean;
}

export const DataIntegrityCard: React.FC<DataIntegrityCardProps> = ({
  className = '',
  showDetailsLink = true,
}) => {
  const { t } = useTranslation();
  const { data: verification, isLoading, refetch, isFetching } = useVerifyChain({
    userOnly: true,
  });

  const getStatusIcon = () => {
    if (!verification) return <Shield className="h-8 w-8 text-muted-foreground" />;
    
    if (verification.integrityPercentage === 100) {
      return <ShieldCheck className="h-8 w-8 text-green-500" />;
    } else if (verification.integrityPercentage >= 90) {
      return <Shield className="h-8 w-8 text-yellow-500" />;
    } else {
      return <ShieldAlert className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    if (!verification) return null;

    if (verification.integrityPercentage === 100) {
      return <Badge variant="default" className="bg-green-500">{t("integrityPage.verifiedBadge")}</Badge>;
    } else if (verification.integrityPercentage >= 90) {
      return <Badge variant="secondary" className="bg-yellow-500 text-white">{t("integrityPage.warning")}</Badge>;
    } else {
      return <Badge variant="destructive">{t("integrityPage.issuesDetected")}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("integrityPage.dataIntegrity")}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold">
                {verification?.integrityPercentage ?? 0}%
              </span>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("integrityPage.transactionsVerified", { count: verification?.totalTransactions ?? 0 })}
            </p>
          </div>
        </div>

        {verification && verification.brokenLinks.length > 0 && (
          <div className="mt-3 p-2 bg-destructive/10 rounded-md">
            <p className="text-xs text-destructive">
              {t("integrityPage.issuesCount", { count: verification.brokenLinks.length })}
            </p>
          </div>
        )}

        {showDetailsLink && (
          <div className="mt-4 pt-3 border-t">
            <Link to="/dashboard/data-integrity">
              <Button variant="outline" size="sm" className="w-full">
                {t("integrityPage.viewDetails")}
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataIntegrityCard;
