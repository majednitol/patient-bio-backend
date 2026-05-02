import { useState, useCallback, useEffect } from "react";
import { useAdminVerifications, ProviderVerification, isExpiringSoon, isExpired } from "@/hooks/useProviderVerification";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  XCircle,
  CheckCircle2,
  FileText,
  Search,
  Loader2,
  Eye,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { VerificationBulkToolbar } from "@/components/admin/VerificationBulkToolbar";
import { VerificationHistoryTimeline } from "@/components/admin/VerificationHistoryTimeline";
import { InlineDocumentPreview } from "@/components/admin/InlineDocumentPreview";
import { Label } from "@/components/ui/label";
import { EntityGradingPanel } from "@/components/admin/EntityGradingPanel";
const AdminVerificationsPage = () => {
  const { t } = useTranslation();
  const {
    verifications,
    isLoading,
    reviewVerification,
    isReviewing,
    bulkReviewVerification,
    isBulkReviewing,
    fetchVerificationHistory,
    getDocumentUrl,
  } = useAdminVerifications();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<(ProviderVerification & { provider_name?: string | null }) | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [additionalDocUrls, setAdditionalDocUrls] = useState<string[]>([]);
  const [history, setHistory] = useState<ProviderVerification[]>([]);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);
  const [bulkRejectionReason, setBulkRejectionReason] = useState("");

  const filteredVerifications = verifications.filter((v) => {
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const providerName = v.provider_name?.toLowerCase() || "";
    const matchesSearch =
      !searchQuery ||
      v.license_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.issuing_authority?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.provider_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      providerName.includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingVerifications = filteredVerifications.filter(v => v.status === "pending");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning">
            <Clock className="h-3 w-3 mr-1" />
            {t("common.pending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-secondary text-secondary-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("common.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("common.rejected")}
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="border-warning text-warning">
            {t("providerVerifications.expired")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getExpiryBadge = (v: ProviderVerification) => {
    if (!v.license_expiry_date || v.status !== "approved") return null;
    if (isExpired(v.license_expiry_date)) {
      return (
        <Badge variant="destructive" className="text-[10px] ml-1">
          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
          {t("providerVerifications.licenseExpired")}
        </Badge>
      );
    }
    if (isExpiringSoon(v.license_expiry_date)) {
      return (
        <Badge variant="outline" className="border-warning text-warning text-[10px] ml-1">
          <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
          {t("providerVerifications.expiringSoon")}
        </Badge>
      );
    }
    return null;
  };

  const handleViewDetails = useCallback(async (verification: ProviderVerification & { provider_name?: string | null }) => {
    setSelectedVerification(verification);
    setRejectionReason("");
    setAdminNotes(verification.notes || "");

    // Fetch document URLs
    if (verification.document_url) {
      const url = await getDocumentUrl(verification.document_url);
      setDocumentUrl(url);
    } else {
      setDocumentUrl(null);
    }

    // Fetch additional document URLs
    if (verification.additional_documents && verification.additional_documents.length > 0) {
      const urls = await Promise.all(
        verification.additional_documents.map(doc => getDocumentUrl(doc))
      );
      setAdditionalDocUrls(urls.filter(Boolean) as string[]);
    } else {
      setAdditionalDocUrls([]);
    }

    // Fetch history
    try {
      const h = await fetchVerificationHistory(verification.user_id);
      setHistory(h);
    } catch {
      setHistory([]);
    }
  }, [getDocumentUrl, fetchVerificationHistory]);

  const handleApprove = () => {
    if (!selectedVerification) return;
    reviewVerification(
      { verificationId: selectedVerification.id, status: "approved", adminNotes: adminNotes || undefined },
      { onSuccess: () => setSelectedVerification(null) }
    );
  };

  const handleReject = () => {
    if (!selectedVerification) return;
    reviewVerification(
      {
        verificationId: selectedVerification.id,
        status: "rejected",
        rejectionReason,
        adminNotes: adminNotes || undefined,
      },
      { onSuccess: () => setSelectedVerification(null) }
    );
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingVerifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingVerifications.map(v => v.id)));
    }
  };

  const handleBulkApprove = () => {
    bulkReviewVerification(
      { verificationIds: Array.from(selectedIds), status: "approved" },
      { onSuccess: () => setSelectedIds(new Set()) }
    );
  };

  const handleBulkReject = () => {
    setShowBulkRejectDialog(true);
  };

  const confirmBulkReject = () => {
    bulkReviewVerification(
      { verificationIds: Array.from(selectedIds), status: "rejected", rejectionReason: bulkRejectionReason },
      { onSuccess: () => { setSelectedIds(new Set()); setShowBulkRejectDialog(false); setBulkRejectionReason(""); } }
    );
  };

  const pendingCount = verifications.filter((v) => v.status === "pending").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue="verification" className="space-y-6">
      <TabsList>
        <TabsTrigger value="verification">Credential Verification</TabsTrigger>
        <TabsTrigger value="grading">Entity Grading</TabsTrigger>
      </TabsList>

      <TabsContent value="verification">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("providerVerifications.title")}
              </CardTitle>
              <CardDescription>
                {t("providerVerifications.description")}
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {t("providerVerifications.pendingBadge", { count: pendingCount })}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("providerVerifications.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("providerVerifications.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("providerVerifications.allStatus")}</SelectItem>
                <SelectItem value="pending">{t("common.pending")}</SelectItem>
                <SelectItem value="approved">{t("common.approved")}</SelectItem>
                <SelectItem value="rejected">{t("common.rejected")}</SelectItem>
                <SelectItem value="expired">{t("providerVerifications.expired")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={pendingVerifications.length > 0 && selectedIds.size === pendingVerifications.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label={t("providerVerifications.selectAll")}
                    />
                  </TableHead>
                  <TableHead>{t("providerVerifications.provider")}</TableHead>
                  <TableHead>{t("providerVerifications.typeColumn")}</TableHead>
                  <TableHead>{t("providerVerifications.licenseNumberColumn")}</TableHead>
                  <TableHead>{t("providerVerifications.issuingAuthorityColumn")}</TableHead>
                  <TableHead>{t("providerVerifications.submitted")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVerifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>{t("providerVerifications.noVerifications")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVerifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell>
                        {verification.status === "pending" && (
                          <Checkbox
                            checked={selectedIds.has(verification.id)}
                            onCheckedChange={() => toggleSelect(verification.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {verification.provider_name || (
                          <span className="text-muted-foreground italic">{t("providerVerifications.unknown")}</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {verification.provider_type.replace("_", " ")}
                      </TableCell>
                      <TableCell>{verification.license_number || "-"}</TableCell>
                      <TableCell>{verification.issuing_authority || "-"}</TableCell>
                      <TableCell>
                        {format(new Date(verification.submitted_at), "PP")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center flex-wrap gap-1">
                          {getStatusBadge(verification.status)}
                          {getExpiryBadge(verification)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(verification)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t("providerVerifications.review")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      <VerificationBulkToolbar
        selectedCount={selectedIds.size}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        onClearSelection={() => setSelectedIds(new Set())}
        isProcessing={isBulkReviewing}
      />

      {/* Bulk Reject Dialog */}
      <Dialog open={showBulkRejectDialog} onOpenChange={setShowBulkRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("providerVerifications.bulkRejectTitle")}</DialogTitle>
            <DialogDescription>
              {t("providerVerifications.bulkRejectDesc", { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("providerVerifications.rejectionReasonLabel")}</Label>
              <Textarea
                placeholder={t("providerVerifications.rejectionReasonPlaceholder")}
                value={bulkRejectionReason}
                onChange={(e) => setBulkRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowBulkRejectDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmBulkReject} disabled={isBulkReviewing}>
                {isBulkReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : t("providerVerifications.confirmReject")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog
        open={!!selectedVerification}
        onOpenChange={(open) => !open && setSelectedVerification(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("providerVerifications.reviewTitle")}</DialogTitle>
            <DialogDescription>
              {t("providerVerifications.reviewDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("providerVerifications.providerName")}</span>
                  <p className="font-medium text-lg">
                    {selectedVerification.provider_name || t("providerVerifications.unknown")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("providerVerifications.providerType")}</span>
                  <p className="font-medium capitalize">
                    {selectedVerification.provider_type.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("common.status")}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {getStatusBadge(selectedVerification.status)}
                    {getExpiryBadge(selectedVerification)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("providerVerifications.licenseNumberColumn")}</span>
                  <p className="font-medium">{selectedVerification.license_number || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("providerVerifications.issuingAuthorityColumn")}</span>
                  <p className="font-medium">{selectedVerification.issuing_authority || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("providerVerifications.country")}</span>
                  <p className="font-medium">{selectedVerification.issuing_country || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("providerVerifications.expiryDate")}</span>
                  <p className="font-medium">
                    {selectedVerification.license_expiry_date
                      ? format(new Date(selectedVerification.license_expiry_date), "PP")
                      : "-"}
                  </p>
                </div>
              </div>

              {/* Inline Document Preview */}
              {documentUrl && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t("providerVerifications.primaryDocument")}</span>
                  <InlineDocumentPreview url={documentUrl} fileName={selectedVerification.document_url || undefined} />
                </div>
              )}

              {/* Additional Documents */}
              {additionalDocUrls.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    {t("providerVerifications.additionalDocuments")} ({additionalDocUrls.length})
                  </span>
                  <div className="space-y-2">
                    {additionalDocUrls.map((url, i) => (
                      <InlineDocumentPreview
                        key={i}
                        url={url}
                        fileName={selectedVerification.additional_documents?.[i] || undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Verification History Timeline */}
              {history.length > 1 && (
                <VerificationHistoryTimeline history={history} currentId={selectedVerification.id} />
              )}

              {/* Admin Notes */}
              {selectedVerification.status === "pending" && (
                <div className="space-y-2">
                  <Label className="text-sm">{t("providerVerifications.adminNotes")}</Label>
                  <Textarea
                    placeholder={t("providerVerifications.adminNotesPlaceholder")}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {/* Show existing notes for non-pending */}
              {selectedVerification.status !== "pending" && selectedVerification.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">{t("providerVerifications.adminNotes")}</span>
                  <p className="text-sm bg-muted p-2 rounded mt-1">{selectedVerification.notes}</p>
                </div>
              )}

              {selectedVerification.status === "pending" && (
                <>
                  <div>
                    <Label className="text-sm">
                      {t("providerVerifications.rejectionReasonLabel")}
                    </Label>
                    <Textarea
                      placeholder={t("providerVerifications.rejectionReasonPlaceholder")}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReject}
                      disabled={isReviewing}
                    >
                      {isReviewing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          {t("providerVerifications.reject")}
                        </>
                      )}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleApprove}
                      disabled={isReviewing}
                    >
                      {isReviewing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {t("providerVerifications.approve")}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {selectedVerification.status === "rejected" &&
                selectedVerification.rejection_reason && (
                  <div className="bg-destructive/10 p-3 rounded-lg">
                    <span className="text-sm font-medium text-destructive">
                      {t("providerVerifications.rejectionReasonLabel")}
                    </span>
                    <p className="text-sm mt-1">
                      {selectedVerification.rejection_reason}
                    </p>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
      </TabsContent>

      <TabsContent value="grading">
        <EntityGradingPanel />
      </TabsContent>
    </Tabs>
  );
};

export default AdminVerificationsPage;
