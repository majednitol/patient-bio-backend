import { useState, useMemo } from "react";
import { usePatientPathologistShares, type PatientPathologistShare } from "@/hooks/usePatientPathologistShares";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Eye,
  CheckCircle,
  Clock,
  Shield,
  Loader2,
  FileText,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO, differenceInMinutes, isWithinInterval, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { DataSharingSummaryStrip } from "@/components/pathologist/DataSharingSummaryStrip";

// Resolve patient names for the shares
function useResolvedPatientNames(shares: PatientPathologistShare[]) {
  const patientIds = [...new Set(shares.map((s) => s.patient_id))];
  return useQuery({
    queryKey: ["patient-names-for-shares", patientIds.sort().join(",")],
    enabled: patientIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", patientIds);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.user_id] = p.display_name || "Patient"; });
      return map;
    },
  });
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending Review", icon: Clock, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  viewed: { label: "Viewed", icon: Eye, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Completed", icon: CheckCircle, className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  revoked: { label: "Revoked", icon: Shield, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

// Helper to determine expiry status
function getExpiryStatus(expiresAt: string | null) {
  if (!expiresAt) return null;
  const now = new Date();
  const expireDate = parseISO(expiresAt);
  const hoursLeft = differenceInMinutes(expireDate, now) / 60;
  
  if (hoursLeft <= 0) return "expired";
  if (hoursLeft <= 24) return "critical";
  if (hoursLeft <= 72) return "warning";
  return null;
}

// Helper to format response time
function formatResponseTime(sharedAt: string, viewedAt: string | null) {
  if (!viewedAt) return null;
  const minutes = differenceInMinutes(parseISO(viewedAt), parseISO(sharedAt));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

const PatientSharesPage = () => {
  const { pathologistShares, isLoading, updateShareStatus, isUpdating } = usePatientPathologistShares();
  const { data: nameMap = {} } = useResolvedPatientNames(pathologistShares);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("pending");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [completionDialog, setCompletionDialog] = useState<{ open: boolean; shareId: string; patientName: string }>({ open: false, shareId: "", patientName: "" });
  const [completionNotes, setCompletionNotes] = useState("");
  const [completedConfirmation, setCompletedConfirmation] = useState<{ open: boolean; patientName: string } | null>(null);

  // Extract unique disease categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    pathologistShares.forEach((s) => {
      if (s.disease_category) cats.add(s.disease_category);
    });
    return Array.from(cats).sort();
  }, [pathologistShares]);

  // Calculate summary stats
  const stats = useMemo(() => {
    return {
      total: pathologistShares.length,
      pending: pathologistShares.filter((s) => s.status === "pending").length,
      active: pathologistShares.filter(
        (s) => s.status !== "revoked" && (!s.expires_at || new Date(s.expires_at) > new Date())
      ).length,
      expired: pathologistShares.filter(
        (s) => s.status === "revoked" || (s.expires_at && new Date(s.expires_at) <= new Date())
      ).length,
    };
  }, [pathologistShares]);

  const filtered = useMemo(() => {
    return pathologistShares.filter((s) => {
      const name = nameMap[s.patient_id] || "";
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        (s.disease_category || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategories.size === 0 || (s.disease_category && selectedCategories.has(s.disease_category));
      if (tab === "all") return matchesSearch && matchesCategory;
      return matchesSearch && matchesCategory && s.status === tab;
    });
  }, [pathologistShares, nameMap, search, tab, selectedCategories]);

  return (
    <div className="space-y-6">
      <DataSharingSummaryStrip />

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          Patient Shared Data ({stats.total})
        </h1>
        <p className="text-muted-foreground mt-1">
          Health data shared directly by patients for your review
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-semibold">Total Shares</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="text-xs text-amber-700 dark:text-amber-300 font-semibold">Pending</div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
          <CardContent className="p-4">
            <div className="text-xs text-green-700 dark:text-green-300 font-semibold">Active</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-200">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700">
          <CardContent className="p-4">
            <div className="text-xs text-red-700 dark:text-red-300 font-semibold">Expired/Revoked</div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-200">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">FILTER BY CATEGORY</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategories.has(cat) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const newSet = new Set(selectedCategories);
                  newSet.has(cat) ? newSet.delete(cat) : newSet.add(cat);
                  setSelectedCategories(newSet);
                }}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            Pending {stats.pending > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{stats.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="viewed">Viewed</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Inbox className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="font-medium text-muted-foreground">No {tab === "all" ? "" : tab} shares found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Patient-shared data will appear here when patients share with you
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((share) => {
                const config = statusConfig[share.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                const patientName = share.is_anonymized ? "Anonymous Patient" : (nameMap[share.patient_id] || "Patient");
                const expiryStatus = getExpiryStatus(share.expires_at);
                const responseTime = share.viewed_at ? formatResponseTime(share.shared_at!, share.viewed_at) : null;

                return (
                  <Card key={share.id} className="hover:border-teal-200 dark:hover:border-teal-700/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-full bg-teal-50 dark:bg-teal-900/20 flex-shrink-0">
                            <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{patientName}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {share.disease_category && (
                                <Badge variant="outline" className="text-[10px]">{share.disease_category}</Badge>
                              )}
                              {share.is_anonymized && (
                                <Badge variant="outline" className="text-[10px] gap-0.5">
                                  <Shield className="h-2.5 w-2.5" /> Anonymized
                                </Badge>
                              )}
                              {expiryStatus === "critical" && (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] gap-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" /> Expires Soon
                                </Badge>
                              )}
                              {expiryStatus === "warning" && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] gap-0.5">
                                  <Clock className="h-2.5 w-2.5" /> Expiring
                                </Badge>
                              )}
                              {expiryStatus === "expired" && (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] gap-0.5">
                                  <Shield className="h-2.5 w-2.5" /> Expired
                                </Badge>
                              )}
                            </div>
                            {share.notes && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{share.notes}</p>
                            )}
                            <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                              <span>Shared {formatDistanceToNow(parseISO(share.shared_at!), { addSuffix: true })}</span>
                              {responseTime && <span>Responded in {responseTime}</span>}
                              {share.expires_at && (
                                <span>Expires {format(parseISO(share.expires_at), "MMM d, yyyy")}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={config.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>

                          {share.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={isUpdating}
                              onClick={() => updateShareStatus({ shareId: share.id, status: "viewed" })}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Mark Viewed
                            </Button>
                          )}
                          {share.status === "viewed" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              disabled={isUpdating}
                              onClick={() => {
                                const pName = share.is_anonymized ? "Anonymous Patient" : (nameMap[share.patient_id] || "Patient");
                                setCompletionNotes("");
                                setCompletionDialog({ open: true, shareId: share.id, patientName: pName });
                              }}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {/* Completion Notes Dialog */}
      <Dialog open={completionDialog.open} onOpenChange={(open) => setCompletionDialog((p) => ({ ...p, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Review</DialogTitle>
            <DialogDescription>
              Add optional notes for <span className="font-medium">{completionDialog.patientName}</span>'s shared data before marking as completed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Add completion notes (e.g., findings summary, recommendations)..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionDialog({ open: false, shareId: "", patientName: "" })}>
              Cancel
            </Button>
            <Button
              disabled={isUpdating}
              onClick={() => {
                updateShareStatus({
                  shareId: completionDialog.shareId,
                  status: "completed",
                  completionNotes: completionNotes || undefined,
                });
                setCompletionDialog({ open: false, shareId: "", patientName: "" });
                setCompletedConfirmation({ open: true, patientName: completionDialog.patientName });
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completion Confirmation Dialog */}
      <Dialog open={!!completedConfirmation?.open} onOpenChange={() => setCompletedConfirmation(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle>Review Completed</DialogTitle>
            <DialogDescription>
              {completedConfirmation?.patientName}'s shared data has been marked as completed.
              {completionNotes && " Your notes have been saved."}
            </DialogDescription>
            <Button onClick={() => setCompletedConfirmation(null)} className="mt-2">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientSharesPage;
