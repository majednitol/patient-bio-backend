import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Webhook,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  History,
} from "lucide-react";
import {
  useFHIRSubscriptions,
  useCreateFHIRSubscription,
  useUpdateFHIRSubscription,
  useDeleteFHIRSubscription,
  useTestFHIRSubscription,
  useSubscriptionNotifications,
  SUBSCRIPTION_TOPICS,
  type FHIRSubscription,
} from "@/hooks/useFHIRSubscriptions";
import { format, formatDistanceToNow } from "date-fns";

import { ConnectedSystemsCard } from "@/components/dashboard/ConnectedSystemsCard";
import { AutoSyncScheduler } from "@/components/dashboard/AutoSyncScheduler";

const FHIRSubscriptionsPage = () => {
  const { t } = useTranslation();
  const { data: subscriptions = [], isLoading } = useFHIRSubscriptions();
  const { data: notifications = [] } = useSubscriptionNotifications();
  const createMutation = useCreateFHIRSubscription();
  const updateMutation = useUpdateFHIRSubscription();
  const deleteMutation = useDeleteFHIRSubscription();
  const testMutation = useTestFHIRSubscription();

  const [createOpen, setCreateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Create form state
  const [newEndpointUrl, setNewEndpointUrl] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [newSubscriberName, setNewSubscriberName] = useState("");

  const handleCreate = async () => {
    if (!newEndpointUrl || !newTopic) return;

    await createMutation.mutateAsync({
      subscriberName: newSubscriberName || "Webhook Subscription",
      endpointUrl: newEndpointUrl,
      topic: newTopic,
      secret: newSecret || undefined,
    });

    setCreateOpen(false);
    setNewEndpointUrl("");
    setNewTopic("");
    setNewSecret("");
    setNewSubscriberName("");
  };

  const handleToggleActive = async (subscription: FHIRSubscription) => {
    const newStatus = subscription.status === "active" ? "paused" : "active";
    await updateMutation.mutateAsync({
      id: subscription.id,
      status: newStatus,
    });
  };

  const handleTest = async (subscription: FHIRSubscription) => {
    await testMutation.mutateAsync(subscription.id);
  };

  const handleViewHistory = (subscriptionId: string) => {
    setSelectedSubscriptionId(subscriptionId);
    setHistoryOpen(true);
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (subscription: FHIRSubscription) => {
    if (subscription.status === "paused") {
      return <Badge variant="secondary">{t("fhirPage.paused")}</Badge>;
    }
    if (subscription.last_error) {
      return <Badge variant="destructive">{t("fhirPage.error")}</Badge>;
    }
    return <Badge variant="default">{t("fhirPage.active")}</Badge>;
  };

  const selectedNotifications = notifications.filter(
    (n: any) => n.subscription_id === selectedSubscriptionId
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConnectedSystemsCard />

      <AutoSyncScheduler />
      
      <Card>
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Webhook className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                {t("fhirPage.fhirSubscriptions")}
              </CardTitle>
              <CardDescription className="mt-1 text-sm md:text-base">
                {t("fhirPage.configureWebhooks")}
              </CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("fhirPage.addSubscription")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("fhirPage.createWebhook")}</DialogTitle>
                  <DialogDescription>
                    {t("fhirPage.configureEndpoint")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("fhirPage.subscriptionName")}</Label>
                    <Input
                      id="name"
                      placeholder="My EHR Integration"
                      value={newSubscriberName}
                      onChange={(e) => setNewSubscriberName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">{t("fhirPage.webhookUrl")}</Label>
                    <Input
                      id="endpoint"
                      placeholder="https://your-app.com/webhook"
                      value={newEndpointUrl}
                      onChange={(e) => setNewEndpointUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="topic">{t("fhirPage.topic")}</Label>
                    <Select value={newTopic} onValueChange={setNewTopic}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("fhirPage.selectTopic")} />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBSCRIPTION_TOPICS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secret">{t("fhirPage.webhookSecret")}</Label>
                    <Input
                      id="secret"
                      type="password"
                      placeholder="Used for HMAC signature verification"
                      value={newSecret}
                      onChange={(e) => setNewSecret(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("fhirPage.hmacDesc")}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newEndpointUrl || !newTopic || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("fhirPage.creating")}
                      </>
                    ) : (
                      t("fhirPage.createSubscription")
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <InlineEmptyState
              icon={Webhook}
              title={t("fhirPage.noWebhookSubscriptions")}
              description={t("fhirPage.noWebhookDesc")}
              action={{
                label: t("fhirPage.addSubscription"),
                onClick: () => setCreateOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="space-y-3 md:hidden">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="p-3 rounded-lg border bg-background space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{sub.subscriber_name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground truncate">{sub.endpoint_url}</p>
                        {sub.secret && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">Secret:</span>
                            <span className="font-mono text-[11px]">
                              {showSecrets[sub.id] ? sub.secret : "••••••••"}
                            </span>
                            <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => toggleShowSecret(sub.id)}>
                              {showSecrets[sub.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {getStatusBadge(sub)}
                        <Switch
                          checked={sub.status === "active"}
                          onCheckedChange={() => handleToggleActive(sub)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {SUBSCRIPTION_TOPICS.find((t) => t.value === sub.topic)?.label || sub.topic}
                      </Badge>
                      <span>
                        {sub.last_triggered_at
                          ? `Last sync ${formatDistanceToNow(new Date(sub.last_triggered_at), { addSuffix: true })}`
                          : t("fhirPage.never")}
                      </span>
                    </div>
                    {sub.last_error && (
                      <p className="text-[11px] text-destructive truncate">{sub.last_error}</p>
                    )}
                    <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleTest(sub)} disabled={testMutation.isPending}>
                        {testMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        {t("fhirPage.test") || "Test"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewHistory(sub.id)}>
                        <History className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive ml-auto">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("fhirPage.deleteSubscription")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("fhirPage.deleteSubscriptionDesc")}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(sub.id)}
                            >
                              {t("common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">{t("fhirPage.endpoint")}</TableHead>
                      <TableHead className="min-w-[100px]">{t("fhirPage.topic")}</TableHead>
                      <TableHead className="min-w-[120px]">{t("fhirPage.status")}</TableHead>
                      <TableHead className="min-w-[120px]">{t("fhirPage.lastTriggered")}</TableHead>
                      <TableHead className="text-right min-w-[120px]">{t("fhirPage.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="max-w-xs">
                          <div className="font-medium text-sm md:text-base mb-0.5">{sub.subscriber_name}</div>
                          <div className="truncate font-mono text-xs text-muted-foreground max-w-[300px]">
                            {sub.endpoint_url}
                          </div>
                          {sub.secret && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-muted-foreground">Secret:</span>
                              <span className="font-mono text-xs">
                                {showSecrets[sub.id] ? sub.secret : "••••••••"}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => toggleShowSecret(sub.id)}
                              >
                                {showSecrets[sub.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-sm">
                            {SUBSCRIPTION_TOPICS.find((t) => t.value === sub.topic)?.label || sub.topic}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(sub)}
                            <Switch
                              checked={sub.status === "active"}
                              onCheckedChange={() => handleToggleActive(sub)}
                            />
                          </div>
                          {sub.last_error && (
                            <p className="text-xs text-destructive mt-1 truncate max-w-32">{sub.last_error}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {sub.last_triggered_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(sub.last_triggered_at), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t("fhirPage.never")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleTest(sub)} disabled={testMutation.isPending}>
                              {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleViewHistory(sub.id)}>
                              <History className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("fhirPage.deleteSubscription")}</AlertDialogTitle>
                                  <AlertDialogDescription>{t("fhirPage.deleteSubscriptionDesc")}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(sub.id)}
                                  >
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("fhirPage.notificationHistory")}
            </DialogTitle>
            <DialogDescription>
              {t("fhirPage.recentDeliveries")}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {selectedNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t("fhirPage.noNotificationsSent")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedNotifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    {notification.status === "sent" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    ) : notification.status === "failed" ? (
                      <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            notification.status === "sent"
                              ? "default"
                              : notification.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {notification.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {notification.sent_at
                            ? format(new Date(notification.sent_at), "MMM d, h:mm a")
                            : "Pending"}
                        </span>
                      </div>
                      {notification.http_status && (
                        <p className="text-sm mt-1">
                          HTTP {notification.http_status}
                        </p>
                      )}
                      {notification.error_message && (
                        <p className="text-sm text-destructive mt-1">
                          {notification.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FHIRSubscriptionsPage;
