import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Share2, Link2, FlaskConical, Microscope, Search, RefreshCw, Send, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAdminDistributions } from "@/hooks/useAdminDistributions";
import AdminDistributeDataDialog from "@/components/admin/AdminDistributeDataDialog";
import { DateRangeFilter, useDateRangeFilter } from "@/components/admin/DateRangeFilter";
import { useAdminAnalyticsExport } from "@/hooks/useAdminAnalyticsExport";

interface AccessToken {
  id: string;
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
  is_revoked: boolean;
  access_count: number;
  label: string | null;
}

interface PathologistShare {
  id: string;
  doctor_id: string;
  pathologist_id: string;
  patient_id: string;
  disease_category: string | null;
  status: string;
  shared_at: string;
}

interface ResearcherShare {
  id: string;
  doctor_id: string;
  researcher_id: string;
  patient_id: string;
  disease_category: string | null;
  research_purpose: string | null;
  status: string;
  is_anonymized: boolean;
  shared_at: string;
}

export default function SharedDataPage() {
  const [activeTab, setActiveTab] = useState("tokens");
  const [search, setSearch] = useState("");
  const [distributeOpen, setDistributeOpen] = useState(false);
  const { dateRange, setDateRange } = useDateRangeFilter("30d");
  const { exportCSV, isExporting } = useAdminAnalyticsExport();

  const { distributions, isLoading: distributionsLoading, refetch: refetchDistributions, researchers, createDistribution } = useAdminDistributions();

  const { data: accessTokens, isLoading: tokensLoading, refetch: refetchTokens } = useQuery({
    queryKey: ["admin-access-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("access_tokens")
        .select("id, user_id, token, label, expires_at, is_revoked, access_count, accessed_at, recipient_type, shared_scopes, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AccessToken[];
    },
  });

  const { data: pathologistShares, isLoading: pathologistLoading, refetch: refetchPathologist } = useQuery({
    queryKey: ["admin-pathologist-shares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_pathologist_shares")
        .select("id, doctor_id, pathologist_id, patient_id, disease_category, notes, status, shared_at, completed_at")
        .order("shared_at", { ascending: false });

      if (error) throw error;
      return data as PathologistShare[];
    },
  });

  const { data: researcherShares, isLoading: researcherLoading, refetch: refetchResearcher } = useQuery({
    queryKey: ["admin-researcher-shares"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_researcher_shares")
        .select("id, doctor_id, researcher_id, patient_id, disease_category, notes, status, shared_at, research_purpose, is_anonymized")
        .order("shared_at", { ascending: false });

      if (error) throw error;
      return data as ResearcherShare[];
    },
  });

  const isLoading = tokensLoading || pathologistLoading || researcherLoading || distributionsLoading;

  const handleRefresh = () => {
    refetchTokens();
    refetchPathologist();
    refetchResearcher();
    refetchDistributions();
  };

  const filteredDistributions = distributions?.filter(
    (d) =>
      d.purpose.toLowerCase().includes(search.toLowerCase()) ||
      d.recipient_type.toLowerCase().includes(search.toLowerCase()) ||
      d.disease_categories.some((c) => c.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusBadge = (status: string, isRevoked?: boolean) => {
    if (isRevoked) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "viewed":
        return <Badge variant="outline">Viewed</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTokens = accessTokens?.filter(
    (t) =>
      t.token.toLowerCase().includes(search.toLowerCase()) ||
      t.label?.toLowerCase().includes(search.toLowerCase()) ||
      t.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPathologistShares = pathologistShares?.filter(
    (s) =>
      s.disease_category?.toLowerCase().includes(search.toLowerCase()) ||
      s.doctor_id.toLowerCase().includes(search.toLowerCase()) ||
      s.pathologist_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredResearcherShares = researcherShares?.filter(
    (s) =>
      s.disease_category?.toLowerCase().includes(search.toLowerCase()) ||
      s.research_purpose?.toLowerCase().includes(search.toLowerCase()) ||
      s.doctor_id.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    totalTokens: accessTokens?.length || 0,
    activeTokens: accessTokens?.filter((t) => !t.is_revoked).length || 0,
    pathologistShares: pathologistShares?.length || 0,
    pendingPathologist: pathologistShares?.filter((s) => s.status === "pending").length || 0,
    researcherShares: researcherShares?.length || 0,
    pendingResearcher: researcherShares?.filter((s) => s.status === "pending").length || 0,
    totalDistributions: distributions?.length || 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Shared Data</h1>
          <p className="text-muted-foreground">Monitor all data sharing activity across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => exportCSV({
              title: "Shared Data Activity",
              headers: ["Type", "Total", "Active/Pending"],
              rows: [
                ["Access Tokens", String(stats.totalTokens), `${stats.activeTokens} active`],
                ["Pathologist Shares", String(stats.pathologistShares), `${stats.pendingPathologist} pending`],
                ["Research Shares", String(stats.researcherShares), `${stats.pendingResearcher} pending`],
                ["Distributions", String(stats.totalDistributions), "anonymized"],
              ],
            })}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button onClick={() => setDistributeOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Distribute Data
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <DateRangeFilter value={dateRange} onChange={setDateRange} />

      {/* Stats Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Tokens</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTokens}</div>
            <p className="text-xs text-muted-foreground">{stats.activeTokens} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pathologist Shares</CardTitle>
            <Microscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pathologistShares}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingPathologist} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Research Shares</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.researcherShares}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingResearcher} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admin Distributions</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistributions}</div>
            <p className="text-xs text-muted-foreground">anonymized distributions</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, category, or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Access Tokens
            <Badge variant="secondary">{stats.totalTokens}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pathologist" className="flex items-center gap-2">
            <Microscope className="h-4 w-4" />
            Pathologist
            <Badge variant="secondary">{stats.pathologistShares}</Badge>
          </TabsTrigger>
          <TabsTrigger value="researcher" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Researcher
            <Badge variant="secondary">{stats.researcherShares}</Badge>
          </TabsTrigger>
          <TabsTrigger value="distributions" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Distributions
            <Badge variant="secondary">{stats.totalDistributions}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Access Tokens</CardTitle>
              <CardDescription>Time-limited links created by patients to share their data</CardDescription>
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Accesses</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTokens?.slice(0, 20).map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-mono text-xs">
                          {token.token.slice(0, 12)}...
                        </TableCell>
                        <TableCell>{token.label || "-"}</TableCell>
                        <TableCell>{format(new Date(token.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(token.expires_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{token.access_count || 0}</TableCell>
                        <TableCell>
                          {token.is_revoked ? (
                            <Badge variant="destructive">Revoked</Badge>
                          ) : new Date(token.expires_at) < new Date() ? (
                            <Badge variant="outline">Expired</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredTokens || filteredTokens.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No access tokens found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pathologist" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Doctor to Pathologist Shares</CardTitle>
              <CardDescription>Patient data shared from doctors to pathologists for testing</CardDescription>
            </CardHeader>
            <CardContent>
              {pathologistLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Shared</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPathologistShares?.slice(0, 20).map((share) => (
                      <TableRow key={share.id}>
                        <TableCell className="font-mono text-xs">{share.id.slice(0, 8)}...</TableCell>
                        <TableCell>{share.disease_category || "General"}</TableCell>
                        <TableCell>{format(new Date(share.shared_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{getStatusBadge(share.status)}</TableCell>
                      </TableRow>
                    ))}
                    {(!filteredPathologistShares || filteredPathologistShares.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No pathologist shares found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="researcher" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Doctor to Researcher Shares</CardTitle>
              <CardDescription>Patient data shared from doctors to research labs</CardDescription>
            </CardHeader>
            <CardContent>
              {researcherLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Anonymized</TableHead>
                      <TableHead>Shared</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResearcherShares?.slice(0, 20).map((share) => (
                      <TableRow key={share.id}>
                        <TableCell className="font-mono text-xs">{share.id.slice(0, 8)}...</TableCell>
                        <TableCell>{share.disease_category || "General"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {share.research_purpose || "-"}
                        </TableCell>
                        <TableCell>
                          {share.is_anonymized ? (
                            <Badge variant="outline">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(share.shared_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{getStatusBadge(share.status)}</TableCell>
                      </TableRow>
                    ))}
                    {(!filteredResearcherShares || filteredResearcherShares.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No researcher shares found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distributions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Distributions</CardTitle>
              <CardDescription>Aggregated, anonymized data distributed to research labs and pharmacy companies</CardDescription>
            </CardHeader>
            <CardContent>
              {distributionsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient Type</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDistributions?.slice(0, 20).map((dist) => (
                      <TableRow key={dist.id}>
                        <TableCell className="capitalize">{dist.recipient_type === "researcher" ? "Research Lab" : "Pharmacy"}</TableCell>
                        <TableCell>
                          {dist.disease_categories.length > 0
                            ? dist.disease_categories.map((c) => c.replace("_", " ")).join(", ")
                            : "All"}
                        </TableCell>
                        <TableCell>{dist.record_count}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{dist.purpose}</TableCell>
                        <TableCell>{format(new Date(dist.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{getStatusBadge(dist.status)}</TableCell>
                      </TableRow>
                    ))}
                    {(!filteredDistributions || filteredDistributions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No distributions yet. Click "Distribute Data" to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AdminDistributeDataDialog
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        researchers={researchers}
        onSubmit={(data) => createDistribution.mutate(data)}
        isSubmitting={createDistribution.isPending}
      />
    </div>
  );
}
