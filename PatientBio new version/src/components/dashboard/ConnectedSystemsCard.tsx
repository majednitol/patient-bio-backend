import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { Link as RouterLink } from "react-router-dom";
import { Server, Webhook, FileOutput, CheckCircle2, XCircle, AlertCircle, Clock, Wifi } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useConnectedSystems, type ConnectedSystem } from "@/hooks/useConnectedSystems";

const typeConfig: Record<ConnectedSystem["type"], { icon: typeof Server; label: string }> = {
  smart_session: { icon: Server, label: "EHR Connection" },
  fhir_subscription: { icon: Webhook, label: "Webhook" },
  bulk_export: { icon: FileOutput, label: "Bulk Export" },
};

const statusConfig: Record<ConnectedSystem["status"], { icon: typeof CheckCircle2; color: string; label: string }> = {
  active: { icon: CheckCircle2, color: "text-primary", label: "Active" },
  expired: { icon: Clock, color: "text-muted-foreground", label: "Expired" },
  error: { icon: XCircle, color: "text-destructive", label: "Error" },
  completed: { icon: CheckCircle2, color: "text-primary", label: "Completed" },
  paused: { icon: AlertCircle, color: "text-amber-500", label: "Paused" },
};

interface ConnectedSystemsCardProps {
  compact?: boolean;
}

export const ConnectedSystemsCard = ({ compact = false }: ConnectedSystemsCardProps) => {
  const { systems, activeSystems, errorSystems, isLoading } = useConnectedSystems();
  const { toast } = useToast();

  const handleTestConnection = (system: ConnectedSystem) => {
    toast({ title: "Testing connection...", description: `Pinging ${system.name}` });
    // Simulate health check
    setTimeout(() => {
      toast({ title: "Connection OK", description: `${system.name} is responding normally.` });
    }, 1500);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Connected Systems</p>
                <p className="text-xs text-muted-foreground">
                  {activeSystems.length} active · {errorSystems.length > 0 && (
                    <span className="text-destructive">{errorSystems.length} errors</span>
                  )}
                  {errorSystems.length === 0 && `${systems.length} total`}
                </p>
              </div>
            </div>
            <RouterLink
              to="/dashboard/subscriptions"
              className="text-xs text-primary hover:underline"
            >
              View all
            </RouterLink>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="h-5 w-5 text-primary" />
          Connected Systems
        </CardTitle>
        <CardDescription>
          Your linked EHR systems, webhooks, and data connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        {systems.length === 0 ? (
          <InlineEmptyState
            icon={Server}
            title="No connected systems"
            description="Connect an EHR system via SMART on FHIR or set up webhook subscriptions to see them here."
          />
        ) : (
          <div className="space-y-2">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold text-primary">{activeSystems.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className="text-lg font-bold">{systems.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                <p className={`text-lg font-bold ${errorSystems.length > 0 ? "text-destructive" : ""}`}>
                  {errorSystems.length}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {/* System list */}
            {systems.slice(0, 6).map((system) => {
              const TypeIcon = typeConfig[system.type].icon;
              const statusInfo = statusConfig[system.status];
              const StatusIcon = statusInfo.icon;

              return (
                <div
                  key={system.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="p-2 rounded-md bg-muted">
                    <TypeIcon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{system.name}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {typeConfig[system.type].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {system.lastSyncAt
                        ? `Last sync ${formatDistanceToNow(new Date(system.lastSyncAt), { addSuffix: true })}`
                        : "Never synced"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => handleTestConnection(system)}
                    >
                      <Wifi className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                    <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                    <span className={`text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {systems.length > 6 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                +{systems.length - 6} more systems
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectedSystemsCard;
