import { useTranslation } from "react-i18next";
import { useDataRequests, DataAccessRequest } from "@/hooks/useDataRequests";
import { useRequesterProfiles } from "@/hooks/useRequesterProfiles";
import { useAutoApproveRules } from "@/hooks/useAutoApproveRules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoApproveRulesCard } from "@/components/dashboard/AutoApproveRulesCard";
import { useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Stethoscope, 
  FlaskConical, 
  Building2, 
  Pill,
  FileText,
  Microscope,
  Coins,
  ShieldCheck,
  Inbox,
  AlertTriangle,
  Zap,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow, format, differenceInHours, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const RequesterIcon = ({ type }: { type: string }) => {
  const iconConfig: Record<string, { icon: React.ReactNode; mobileIcon: React.ReactNode; bgClass: string }> = {
    doctor: {
      icon: <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
      mobileIcon: <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
      bgClass: "bg-blue-100 dark:bg-blue-900/40"
    },
    pathologist: {
      icon: <FlaskConical className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      mobileIcon: <FlaskConical className="h-4 w-4 text-purple-600 dark:text-purple-400" />,
      bgClass: "bg-purple-100 dark:bg-purple-900/40"
    },
    pharmacy: {
      icon: <Pill className="h-5 w-5 text-green-600 dark:text-green-400" />,
      mobileIcon: <Pill className="h-4 w-4 text-green-600 dark:text-green-400" />,
      bgClass: "bg-green-100 dark:bg-green-900/40"
    },
    lab: {
      icon: <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
      mobileIcon: <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />,
      bgClass: "bg-orange-100 dark:bg-orange-900/40"
    },
    researcher: {
      icon: <Microscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />,
      mobileIcon: <Microscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />,
      bgClass: "bg-teal-100 dark:bg-teal-900/40"
    }
  };

  const config = iconConfig[type] || {
    icon: <User className="h-5 w-5 text-muted-foreground" />,
    mobileIcon: <User className="h-4 w-4 text-muted-foreground" />,
    bgClass: "bg-muted"
  };

  return (
    <div className={cn("p-1.5 sm:p-2.5 rounded-full flex-shrink-0", config.bgClass)}>
      <span className="hidden sm:inline-flex">{config.icon}</span>
      <span className="inline-flex sm:hidden">{config.mobileIcon}</span>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    default:
      return null;
  }
};

const DiseaseCategoryPill = ({ category }: { category: string | null }) => {
  if (!category) return null;
  
  const colors: Record<string, string> = {
    cancer: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    covid19: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    diabetes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    heart_disease: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    general: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase",
      colors[category] || colors.general
    )}>
      {category.replace("_", " ")}
    </span>
  );
};

/** Urgency indicator based on how long the request has been pending */
const RequestAgeIndicator = ({ requestedAt }: { requestedAt: string }) => {
  const now = new Date();
  const requested = new Date(requestedAt);
  const hoursAgo = differenceInHours(now, requested);
  const daysAgo = differenceInDays(now, requested);

  if (daysAgo >= 7) {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] gap-1">
        <AlertTriangle className="h-2.5 w-2.5" />
        {daysAgo}d waiting
      </Badge>
    );
  }
  if (daysAgo >= 3) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1">
        <Clock className="h-2.5 w-2.5" />
        {daysAgo}d waiting
      </Badge>
    );
  }
  if (hoursAgo >= 24) {
    return (
      <Badge variant="outline" className="text-muted-foreground text-[10px] gap-1">
        <Clock className="h-2.5 w-2.5" />
        {daysAgo}d ago
      </Badge>
    );
  }
  return null;
};

const RequestSkeleton = () => (
  <Card className="diagnostic-card">
    <CardContent className="p-4">
      <div className="flex gap-4">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <div className="hidden sm:flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SummaryStats = ({ 
  pending, 
  approved, 
  rejected 
}: { 
  pending: number; 
  approved: number; 
  rejected: number;
}) => (
  <>
    {/* Mobile: Dot indicator chips */}
    <div className="flex items-center gap-3 mb-3 sm:hidden flex-wrap">
      <span className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
        pending > 0 ? "bg-yellow-500/10 text-yellow-600" : "bg-muted text-muted-foreground"
      )}>
        <span className={cn("h-1.5 w-1.5 rounded-full", pending > 0 ? "bg-yellow-500" : "bg-muted-foreground")} />
        {pending} Pending
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-600">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        {approved} Approved
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-red-500/10 text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        {rejected} Rejected
      </span>
    </div>
    {/* Desktop: Card grid */}
    <div className="hidden sm:grid grid-cols-3 gap-3 mb-6">
      <Card className={cn(
        "diagnostic-card",
        pending > 0 && "ring-2 ring-yellow-500/30"
      )}>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Clock className={cn(
              "h-4 w-4",
              pending > 0 ? "text-yellow-600" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xl font-bold",
              pending > 0 ? "text-yellow-600" : "text-foreground"
            )}>
              {pending}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </CardContent>
      </Card>
      <Card className="diagnostic-card">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-xl font-bold">{approved}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Approved</p>
        </CardContent>
      </Card>
      <Card className="diagnostic-card">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-xl font-bold">{rejected}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Rejected</p>
        </CardContent>
      </Card>
    </div>
  </>
);

interface RequestCardProps {
  request: DataAccessRequest;
  requesterProfile?: { name: string; organization: string | null; specialty: string | null };
  matchedRule?: { rule_name: string } | null;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  showActions?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  showCheckbox?: boolean;
}

const RequestCard = ({ 
  request, 
  requesterProfile,
  matchedRule,
  onApprove, 
  onReject,
  isApproving,
  isRejecting,
  showActions = true,
  isSelected,
  onToggleSelect,
  showCheckbox = false,
}: RequestCardProps) => {
  const tokenOffer = request.token_offer ? Number(request.token_offer) : 0;
  const hasTokenReward = tokenOffer > 0 && request.requester_type === "researcher";

  return (
    <Card className={cn(
      "diagnostic-card overflow-hidden transition-all",
      request.status === "pending" && "ring-1 ring-primary/20",
      isSelected && "ring-2 ring-primary/50 bg-primary/5"
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="flex items-start gap-2.5 sm:gap-4 flex-1 min-w-0">
            {showCheckbox && request.status === "pending" && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect?.(request.id)}
                className="mt-2.5 shrink-0"
              />
            )}
            <RequesterIcon type={request.requester_type} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {requesterProfile ? (
                  <span className="font-semibold text-sm sm:text-base">
                    {requesterProfile.name}
                  </span>
                ) : (
                  <span className="font-semibold capitalize text-sm sm:text-base">
                    {request.requester_type}
                  </span>
                )}
                <StatusBadge status={request.status} />
                <DiseaseCategoryPill category={request.disease_category} />
                {request.status === "pending" && (
                  <RequestAgeIndicator requestedAt={request.requested_at} />
                )}
              </div>
              {/* Requester details */}
              {requesterProfile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span className="capitalize">{request.requester_type}</span>
                  {requesterProfile.organization && (
                    <>
                      <span>•</span>
                      <span>{requesterProfile.organization}</span>
                    </>
                  )}
                  {requesterProfile.specialty && (
                    <>
                      <span>•</span>
                      <span>{requesterProfile.specialty}</span>
                    </>
                  )}
                </div>
              )}
              {/* Auto-approve match indicator */}
              {matchedRule && request.status === "pending" && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-primary">
                  <Zap className="h-3 w-3" />
                  Matches rule: {matchedRule.rule_name}
                </div>
              )}
              {request.reason && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-1.5 line-clamp-1 sm:line-clamp-2">
                  <FileText className="h-3 w-3 inline mr-1" />
                  {request.reason}
                </p>
              )}
              {hasTokenReward && request.status === "pending" && (
                <div className="mt-1.5 sm:mt-2.5 p-1.5 sm:p-2 rounded-lg bg-primary/5 border border-primary/20 inline-flex items-center gap-1.5 sm:gap-2">
                  <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  <span className="text-[11px] sm:text-sm font-medium text-primary">
                    Earn {tokenOffer.toFixed(0)} PBIO tokens
                  </span>
                </div>
              )}
              {hasTokenReward && request.status === "approved" && (
                <div className="mt-1.5 sm:mt-2.5 inline-flex items-center gap-1 text-xs sm:text-sm text-primary font-medium">
                  <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>+{tokenOffer.toFixed(0)} PBIO earned</span>
                </div>
              )}
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2.5">
                Requested {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                {request.responded_at && (
                  <span className="ml-2 hidden sm:inline">
                    • Responded {format(new Date(request.responded_at), "MMM d, yyyy")}
                  </span>
                )}
              </p>
            </div>
          </div>
          {showActions && request.status === "pending" && (
            <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-initial text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => onReject?.(request.id)}
                disabled={isRejecting}
              >
                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => onApprove?.(request.id)}
                disabled={isApproving}
              >
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                {hasTokenReward ? "Approve & Earn" : "Approve"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = ({ 
  type, 
  icon: Icon 
}: { 
  type: "pending" | "approved" | "rejected";
  icon: React.ElementType;
}) => {
  const content = {
    pending: {
      title: "You're all caught up!",
      description: "No pending requests. When doctors or researchers request access to your data, they'll appear here for your review."
    },
    approved: {
      title: "No approved requests yet",
      description: "When you approve access to your health data, those records will be shown here for your reference."
    },
    rejected: {
      title: "No rejected requests",
      description: "Rejected requests will appear here. You can always reconsider if a provider contacts you again."
    }
  };

  return (
    <Card className="diagnostic-card">
      <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6 text-center">
        <div className="p-2 sm:p-3 rounded-full bg-muted/50 mb-3 sm:mb-4">
          <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-base sm:text-lg">{content[type].title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1 sm:mt-1.5 max-w-sm">
          {content[type].description}
        </p>
      </CardContent>
    </Card>
  );
};

const DataRequestsPage = () => {
  const { t } = useTranslation();
  const { 
    incomingRequests, 
    pendingRequests,
    isLoading, 
    approveRequest, 
    rejectRequest,
    isApproving,
    isRejecting 
  } = useDataRequests();

  const { data: requesterProfiles } = useRequesterProfiles(incomingRequests);
  const { matchesRule } = useAutoApproveRules();

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pendingRequests.map((r) => r.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      approveRequest(id);
    }
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) {
      rejectRequest(id);
    }
    setSelectedIds(new Set());
    setBulkMode(false);
  };

  const approvedRequests = incomingRequests.filter((r) => r.status === "approved");
  const rejectedRequests = incomingRequests.filter((r) => r.status === "rejected");

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="diagnostic-card">
              <CardContent className="p-4 text-center">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <RequestSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-6">
        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
          <ShieldCheck className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold">{t("requestsPage.dataAccessRequests")}</h1>
          <p className="text-muted-foreground text-xs sm:text-base mt-0.5">
            {t("requestsPage.reviewAndManage")}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats 
        pending={pendingRequests.length}
        approved={approvedRequests.length}
        rejected={rejectedRequests.length}
      />

      {/* Auto-Approve Rules */}
      <div className="mb-3 sm:mb-6">
        <AutoApproveRulesCard />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-3 sm:space-y-6">
        {/* Desktop: Standard TabsList */}
        <TabsList className="hidden sm:grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative text-sm">
            <span className="truncate">{t("requestsPage.pending")}</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-sm">
            <span className="truncate">{t("requestsPage.approved")}</span>
            {approvedRequests.length > 0 && (
              <span className="ml-1.5 text-muted-foreground text-xs">
                ({approvedRequests.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-sm">
            <span className="truncate">{t("requestsPage.rejected")}</span>
            {rejectedRequests.length > 0 && (
              <span className="ml-1.5 text-muted-foreground text-xs">
                ({rejectedRequests.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        {/* Mobile: Segmented control */}
        <div className="sm:hidden">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/40 p-1 h-auto">
            <TabsTrigger value="pending" className="text-[11px] rounded-lg py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {t("requestsPage.pending")} {pendingRequests.length > 0 && pendingRequests.length}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-[11px] rounded-lg py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {t("requestsPage.approved")} {approvedRequests.length > 0 && approvedRequests.length}
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-[11px] rounded-lg py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {t("requestsPage.rejected")} {rejectedRequests.length > 0 && rejectedRequests.length}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="space-y-4">
          {/* Bulk Actions Bar */}
          {pendingRequests.length > 1 && (
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  size="sm"
                  variant={bulkMode ? "default" : "outline"}
                  className="h-6 sm:h-7 text-[10px] sm:text-xs gap-1 px-2 sm:px-3"
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    if (bulkMode) deselectAll();
                  }}
                >
                  <CheckCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {bulkMode ? t("common.cancel") : t("requestsPage.bulkActions")}
                </Button>
                {bulkMode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs px-2 sm:px-3"
                    onClick={selectedIds.size === pendingRequests.length ? deselectAll : selectAll}
                  >
                    {selectedIds.size === pendingRequests.length ? t("requestsPage.deselectAll") : t("requestsPage.selectAll")}
                  </Button>
                )}
              </div>
              {bulkMode && selectedIds.size > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">{selectedIds.size} selected</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs text-red-600 hover:text-red-700 px-2 sm:px-3"
                    onClick={handleBulkReject}
                  >
                    <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    {t("requestsPage.reject")}
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 sm:h-7 text-[10px] sm:text-xs bg-green-600 hover:bg-green-700 px-2 sm:px-3"
                    onClick={handleBulkApprove}
                  >
                    <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                    {t("requestsPage.approve")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {pendingRequests.length === 0 ? (
            <EmptyState type="pending" icon={Inbox} />
          ) : (
            pendingRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                requesterProfile={requesterProfiles?.[request.requester_id]}
                matchedRule={matchesRule(request)}
                onApprove={approveRequest}
                onReject={rejectRequest}
                isApproving={isApproving}
                isRejecting={isRejecting}
                showCheckbox={bulkMode}
                isSelected={selectedIds.has(request.id)}
                onToggleSelect={toggleSelect}
                showActions={!bulkMode}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedRequests.length === 0 ? (
            <EmptyState type="approved" icon={CheckCircle} />
          ) : (
            approvedRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                requesterProfile={requesterProfiles?.[request.requester_id]}
                showActions={false}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {rejectedRequests.length === 0 ? (
            <EmptyState type="rejected" icon={XCircle} />
          ) : (
            rejectedRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                requesterProfile={requesterProfiles?.[request.requester_id]}
                showActions={false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataRequestsPage;
