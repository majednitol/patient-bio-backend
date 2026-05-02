/**
 * DataIntegrityPage - Full blockchain verification dashboard
 * Allows patients to verify data integrity and download certificates
 * Part of Data Integrity Dashboard (Phase 4.4)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw,
  Activity,
  Clock,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { 
  useVerifyChain, 
  useBlockchainTransactions, 
  useBlockchainStats,
  formatTransactionType,
  getTransactionTypeIcon
} from '@/hooks/useBlockchainVerification';
import { format, formatDistanceToNow } from 'date-fns';
import { SkeletonCard, SkeletonTable } from '@/components/shared/SkeletonCard';
import { LazyPDFButton, type PDFContentItem } from '@/components/shared/LazyPDFExport';
import { useToast } from '@/hooks/use-toast';

const DataIntegrityPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { 
    data: verification, 
    isLoading: verificationLoading, 
    refetch: refetchVerification,
    isFetching 
  } = useVerifyChain({ userOnly: true });

  const { 
    data: transactions, 
    isLoading: transactionsLoading 
  } = useBlockchainTransactions({ limit: 100 });

  const { 
    data: stats, 
    isLoading: statsLoading 
  } = useBlockchainStats();

  const getIntegrityStatus = () => {
    if (!verification) return { color: 'gray', label: t("integrityPage.unknown"), icon: Shield };
    
    if (verification.integrityPercentage === 100) {
      return { color: 'green', label: t("integrityPage.fullyVerified"), icon: ShieldCheck };
    } else if (verification.integrityPercentage >= 90) {
      return { color: 'yellow', label: t("integrityPage.mostlyVerified"), icon: Shield };
    } else {
      return { color: 'red', label: t("integrityPage.issuesDetected"), icon: ShieldAlert };
    }
  };

  const status = getIntegrityStatus();
  const StatusIcon = status.icon;

  // Generate PDF certificate content
  const generateCertificateContent = (): PDFContentItem[] => {
    const items: PDFContentItem[] = [
      { type: 'heading', text: 'Data Integrity Verification Certificate', level: 1 },
      { type: 'spacer', height: 5 },
      { type: 'paragraph', text: 'This certificate confirms the blockchain verification status of your health records stored in Patient Bio.' },
      { type: 'divider' },
      { type: 'heading', text: 'Verification Summary', level: 2 },
      { 
        type: 'keyValue', 
        data: {
          'Status': status.label,
          'Integrity Score': `${verification?.integrityPercentage ?? 0}%`,
          'Total Transactions': String(verification?.totalTransactions ?? 0),
          'Verified Transactions': String(verification?.verifiedTransactions ?? 0),
          'Verification Date': format(new Date(), 'MMMM d, yyyy HH:mm:ss'),
        }
      },
      { type: 'spacer' },
    ];

    if (verification?.brokenLinks && verification.brokenLinks.length > 0) {
      items.push(
        { type: 'heading', text: 'Issues Found', level: 2 },
        { 
          type: 'table', 
          headers: ['Transaction ID', 'Timestamp'],
          rows: verification.brokenLinks.slice(0, 10).map(link => [
            link.transactionId.substring(0, 8) + '...',
            format(new Date(link.timestamp), 'MMM d, yyyy HH:mm'),
          ])
        },
        { type: 'spacer' }
      );
    }

    items.push(
      { type: 'heading', text: 'Recent Transactions', level: 2 },
      { 
        type: 'table', 
        headers: ['Type', 'Date', 'Status'],
        rows: (transactions?.slice(0, 15) ?? []).map(tx => [
          formatTransactionType(tx.transaction_type),
          format(new Date(tx.timestamp), 'MMM d, yyyy HH:mm'),
          tx.is_verified ? 'Verified' : 'Pending',
        ])
      },
      { type: 'spacer' },
      { type: 'divider' },
      { type: 'paragraph', text: 'This certificate is generated using cryptographic verification of the blockchain audit trail. Each transaction is linked using SHA-256 hashing to ensure data integrity and prevent tampering.' },
      { type: 'spacer', height: 10 },
      { type: 'paragraph', text: '© Patient Bio - Your Health Data. Your Control.' }
    );

    return items;
  };

  if (verificationLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <SkeletonCard variant="stat" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard variant="stat" />
          <SkeletonCard variant="stat" />
          <SkeletonCard variant="stat" />
        </div>
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            {t("integrityPage.dataIntegrity")}
          </h1>
          <p className="text-muted-foreground">
            {t("integrityPage.verifyBlockchain")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetchVerification()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {t("integrityPage.verifyNow")}
          </Button>
          <LazyPDFButton
            options={{
              filename: `patient-bio-integrity-certificate-${format(new Date(), 'yyyy-MM-dd')}`,
              title: 'Patient Bio Data Integrity Certificate',
              subtitle: `Generated on ${format(new Date(), 'MMMM d, yyyy')}`,
              content: generateCertificateContent(),
            }}
            variant="default"
            onSuccess={() => toast({ title: 'Certificate downloaded successfully' })}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("integrityPage.downloadCertificate")}
          </LazyPDFButton>
        </div>
      </div>

      {/* Main Status Card */}
      <Card className={`border-2 ${
        status.color === 'green' ? 'border-green-500/30 bg-green-500/5' :
        status.color === 'yellow' ? 'border-yellow-500/30 bg-yellow-500/5' :
        status.color === 'red' ? 'border-red-500/30 bg-red-500/5' :
        'border-muted'
      }`}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`p-4 rounded-full ${
              status.color === 'green' ? 'bg-green-500/20' :
              status.color === 'yellow' ? 'bg-yellow-500/20' :
              status.color === 'red' ? 'bg-red-500/20' :
              'bg-muted'
            }`}>
              <StatusIcon className={`h-16 w-16 ${
                status.color === 'green' ? 'text-green-500' :
                status.color === 'yellow' ? 'text-yellow-500' :
                status.color === 'red' ? 'text-red-500' :
                'text-muted-foreground'
              }`} />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <span className="text-4xl font-bold">
                  {verification?.integrityPercentage ?? 0}%
                </span>
                <Badge variant={status.color === 'green' ? 'default' : status.color === 'red' ? 'destructive' : 'secondary'}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {t("integrityPage.transactionsVerified", { verified: verification?.verifiedTransactions ?? 0, total: verification?.totalTransactions ?? 0 })}
              </p>
              {verification?.lastVerifiedAt && (
                <p className="text-sm text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Last verified {formatDistanceToNow(new Date(verification.lastVerifiedAt), { addSuffix: true })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {verification?.verifiedTransactions ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">{t("integrityPage.verified")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {(verification?.totalTransactions ?? 0) - (verification?.verifiedTransactions ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">{t("integrityPage.pendingStat")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {verification?.brokenLinks?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">{t("integrityPage.issues")}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.totalTransactions ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t("integrityPage.totalTransactions")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.last24Hours ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t("integrityPage.last24Hours")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.last7Days ?? 0}</div>
                <div className="text-xs text-muted-foreground">{t("integrityPage.last7Days")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Object.keys(stats?.byType ?? {}).length}
                </div>
                <div className="text-xs text-muted-foreground">{t("integrityPage.eventTypes")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Transactions and Issues */}
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList>
          <TabsTrigger value="transactions">
            <Activity className="h-4 w-4 mr-2" />
            {t("integrityPage.transactionHistory")}
          </TabsTrigger>
          <TabsTrigger value="issues">
            <ShieldAlert className="h-4 w-4 mr-2" />
            {t("integrityPage.issues")} ({verification?.brokenLinks?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="info">
            <Info className="h-4 w-4 mr-2" />
            {t("integrityPage.howItWorks")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("integrityPage.recentTransactions")}</CardTitle>
              <CardDescription>
                {t("integrityPage.allChangesRecorded")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <SkeletonTable rows={5} columns={4} />
              ) : transactions && transactions.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="text-2xl">
                          {getTransactionTypeIcon(tx.transaction_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {formatTransactionType(tx.transaction_type)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Hash: {tx.data_hash.substring(0, 16)}...
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {format(new Date(tx.timestamp), 'MMM d, HH:mm')}
                          </div>
                          <Badge variant={tx.is_verified ? 'default' : 'secondary'} className="text-xs">
                            {tx.is_verified ? t("integrityPage.verifiedBadge") : t("integrityPage.pendingBadge")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t("integrityPage.noTransactionsYet")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("integrityPage.integrityIssues")}</CardTitle>
              <CardDescription>
                {t("integrityPage.detectedIssues")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verification?.brokenLinks && verification.brokenLinks.length > 0 ? (
                <div className="space-y-3">
                  {verification.brokenLinks.map((link, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-destructive/10 border border-destructive/20"
                    >
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-destructive">
                            {t("integrityPage.chainLinkBroken")}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Transaction: {link.transactionId.substring(0, 12)}...
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(link.timestamp), 'MMMM d, yyyy HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="font-medium text-green-600">{t("integrityPage.noIssuesFound")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("integrityPage.chainIntact")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("integrityPage.howBlockchainWorks")}</CardTitle>
              <CardDescription>
                {t("integrityPage.understandingSecurity")}
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {t("integrityPage.sha256Hashing")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("integrityPage.sha256Desc")}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Chain Linking
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Each transaction includes the hash of the previous transaction, creating an unbreakable chain that reveals any tampering.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Merkle Trees
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Records are organized into Merkle trees, enabling O(log n) verification of any individual record without checking the entire chain.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Immutable Audit Trail
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Every access, modification, and share is permanently recorded, giving you complete visibility into who accessed your data and when.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataIntegrityPage;
