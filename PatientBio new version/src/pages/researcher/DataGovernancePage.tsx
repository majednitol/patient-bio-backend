import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataUseAgreements, DataUseAgreement } from "@/hooks/useDataUseAgreements";
import { useDataTransferAgreements, JURISDICTION_LABELS, TRANSFER_BASIS_LABELS } from "@/hooks/useDataTransferAgreements";
import { useProvenanceStats } from "@/hooks/useDataProvenance";
import { useConsentTemplates } from "@/hooks/useConsentTemplates";
import { DUAForm } from "@/components/researcher/DUAForm";
import { DUADetailDialog } from "@/components/researcher/DUADetailDialog";
import { DUAExpiryAlerts } from "@/components/researcher/DUAExpiryAlerts";
import { ProvenanceTimelineCard } from "@/components/dashboard/ProvenanceTimeline";
import {
  FileCheck, Send, Clock, CheckCircle2, AlertTriangle, Loader2, Shield,
  Search, Globe, ScrollText, Activity, ArrowRight, Handshake,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", icon: Clock, variant: "secondary" },
  submitted: { label: "Submitted", icon: Send, variant: "outline" },
  under_review: { label: "Under Review", icon: Clock, variant: "outline" },
  approved: { label: "Approved", icon: CheckCircle2, variant: "default" },
  expired: { label: "Expired", icon: AlertTriangle, variant: "destructive" },
};

const DataGovernancePage = () => {
  const { agreements, isLoading, stats, submitAgreement, getEffectiveExpiry } = useDataUseAgreements();
  const { data: transfers = [], isLoading: transfersLoading } = useDataTransferAgreements();
  const { data: provenanceStats } = useProvenanceStats();
  const { data: consentTemplates = [] } = useConsentTemplates();

  const [activeTab, setActiveTab] = useState("agreements");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [selectedDua, setSelectedDua] = useState<DataUseAgreement | null>(null);

  // Compliance score: approved / (approved + expired)
  const complianceScore = useMemo(() => {
    const relevant = stats.approved + stats.expired;
    if (relevant === 0) return 100;
    return Math.round((stats.approved / relevant) * 100);
  }, [stats]);

  // Filtered & sorted agreements
  const filteredAgreements = useMemo(() => {
    let result = agreements;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          (a.study_title || "").toLowerCase().includes(q) ||
          a.institution_name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((a) => {
        if (statusFilter === "expired") {
          return a.status === "expired" || (a.expiry_date && new Date(a.expiry_date) < new Date());
        }
        return a.status === statusFilter;
      });
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "expiry") {
        return getEffectiveExpiry(a).getTime() - getEffectiveExpiry(b).getTime();
      }
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [agreements, searchQuery, statusFilter, sortBy, getEffectiveExpiry]);

  const activeTransfers = transfers.filter((t) => !t.revoked_at);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Data Governance
          </h1>
          <p className="text-muted-foreground">Compliance hub for agreements, consent, provenance, and cross-border transfers</p>
        </div>
        <DUAForm />
      </div>

      {/* Expiry Alerts */}
      <DUAExpiryAlerts />

      {/* Dashboard KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* DUA Lifecycle Funnel */}
        <Card className="col-span-2 md:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">DUA Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Draft</span>
                  <span className="font-medium">{stats.draft}</span>
                </div>
                <Progress value={stats.total > 0 ? (stats.draft / stats.total) * 100 : 0} className="h-2" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Submitted</span>
                  <span className="font-medium">{stats.submitted}</span>
                </div>
                <Progress value={stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0} className="h-2" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Approved</span>
                  <span className="font-medium">{stats.approved}</span>
                </div>
                <Progress value={stats.total > 0 ? (stats.approved / stats.total) * 100 : 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Score */}
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className={`text-2xl font-bold ${complianceScore >= 80 ? "text-green-600" : complianceScore >= 50 ? "text-amber-500" : "text-destructive"}`}>
              {complianceScore}%
            </p>
            <p className="text-xs text-muted-foreground">Compliance Score</p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardContent className="pt-4 text-center space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> Transfers</span>
              <span className="font-medium">{activeTransfers.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Provenance</span>
              <span className="font-medium">{provenanceStats?.last30Days || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1"><ScrollText className="h-3.5 w-3.5" /> Templates</span>
              <span className="font-medium">{consentTemplates.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agreements">
            <FileCheck className="h-4 w-4 mr-1.5" /> Agreements ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="consent">
            <Handshake className="h-4 w-4 mr-1.5" /> Consent
          </TabsTrigger>
          <TabsTrigger value="provenance">
            <Activity className="h-4 w-4 mr-1.5" /> Provenance
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <Globe className="h-4 w-4 mr-1.5" /> Transfers ({activeTransfers.length})
          </TabsTrigger>
        </TabsList>

        {/* Agreements Tab */}
        <TabsContent value="agreements" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by study or institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Newest</SelectItem>
                <SelectItem value="expiry">Expiry Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agreement List */}
          {filteredAgreements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileCheck className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No Agreements Found</h3>
                <p className="text-muted-foreground text-sm text-center max-w-md mt-2">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters."
                    : "Create a DUA to formalize data sharing terms for your research studies."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAgreements.map((dua) => {
                const config = STATUS_CONFIG[dua.status] || STATUS_CONFIG.draft;
                const StatusIcon = config.icon;
                const categories = (dua.data_scope as any)?.categories || [];
                const isExpired = dua.expiry_date && new Date(dua.expiry_date) < new Date();

                return (
                  <Card
                    key={dua.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedDua(dua)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-primary" />
                            {dua.study_title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {dua.institution_name} • Retention: {dua.retention_period_days} days
                          </CardDescription>
                        </div>
                        <Badge variant={isExpired ? "destructive" : config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {isExpired ? "Expired" : config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{dua.purpose}</p>

                      {categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {categories.map((cat: string) => (
                            <Badge key={cat} variant="outline" className="text-xs">{cat.replace("_", " ")}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Created: {new Date(dua.created_at).toLocaleDateString()}</span>
                        {dua.submitted_at && <span>• Submitted: {new Date(dua.submitted_at).toLocaleDateString()}</span>}
                        {dua.approved_at && <span>• Approved: {new Date(dua.approved_at).toLocaleDateString()}</span>}
                      </div>

                      {dua.status === "draft" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); submitAgreement(dua.id); }}
                          className="gap-1.5"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Submit for Review
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Consent Tab */}
        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" />
                Consent Templates
              </CardTitle>
              <CardDescription>Active consent frameworks available for your studies</CardDescription>
            </CardHeader>
            <CardContent>
              {consentTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No active consent templates found.</p>
              ) : (
                <div className="space-y-3">
                  {consentTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-start justify-between p-3 rounded-lg border">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground">{tpl.description || tpl.purpose}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">{tpl.consent_type}</Badge>
                          {tpl.granted_to_type && (
                            <Badge variant="secondary" className="text-xs">{tpl.granted_to_type}</Badge>
                          )}
                          {tpl.expiry_days && (
                            <Badge variant="secondary" className="text-xs">{tpl.expiry_days}d expiry</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tpl.scope.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                        {tpl.scope.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{tpl.scope.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provenance Tab */}
        <TabsContent value="provenance" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{provenanceStats?.totalRecords || 0}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{provenanceStats?.last30Days || 0}</p>
                <p className="text-xs text-muted-foreground">Last 30 Days</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{provenanceStats ? Object.keys(provenanceStats.byActivity).length : 0}</p>
                <p className="text-xs text-muted-foreground">Activity Types</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{provenanceStats ? Object.keys(provenanceStats.bySource).length : 0}</p>
                <p className="text-xs text-muted-foreground">Source Systems</p>
              </CardContent>
            </Card>
          </div>
          <ProvenanceTimelineCard title="Data Provenance Audit Trail" limit={20} />
        </TabsContent>

        {/* Cross-Border Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          {transfersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : activeTransfers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Globe className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No Cross-Border Transfers</h3>
                <p className="text-muted-foreground text-sm text-center max-w-md mt-2">
                  Cross-border data transfer agreements will appear here when created through the data sharing workflow.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeTransfers.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" />
                          {JURISDICTION_LABELS[t.source_jurisdiction]} → {JURISDICTION_LABELS[t.destination_jurisdiction]}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t.recipient_name || "Unknown Recipient"} • {t.purpose}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">{TRANSFER_BASIS_LABELS[t.transfer_basis]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {t.data_categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(t.created_at).toLocaleDateString()}
                      {t.expires_at && ` • Expires: ${new Date(t.expires_at).toLocaleDateString()}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DUA Detail Dialog */}
      <DUADetailDialog
        dua={selectedDua}
        open={!!selectedDua}
        onOpenChange={(open) => { if (!open) setSelectedDua(null); }}
      />
    </div>
  );
};

export default DataGovernancePage;
