import { useOutgoingLinkRequests, useCancelLinkRequest } from "@/hooks/useFamilyLinkRequests";
import { RELATIONSHIP_OPTIONS } from "@/hooks/useFamilyMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Send, X, Loader2, User, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export const OutgoingLinkRequests = () => {
  const { data: requests, isLoading } = useOutgoingLinkRequests();
  const cancelRequest = useCancelLinkRequest();

  const targetIds = requests?.map((r) => r.target_patient_id) || [];
  const { data: targetProfiles } = useQuery({
    queryKey: ["target-profiles", targetIds],
    queryFn: async () => {
      if (targetIds.length === 0) return {};
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", targetIds);
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.display_name || "Unknown"; });
      return map;
    },
    enabled: targetIds.length > 0,
  });

  if (isLoading || !requests || requests.length === 0) return null;

  const getRelLabel = (v: string) =>
    RELATIONSHIP_OPTIONS.find((r) => r.value === v)?.label || v;

  const now = new Date();

  const getStatus = (req: typeof requests[0]) => {
    if (req.status === "approved") return "approved";
    if (req.status === "rejected") return "rejected";
    if (req.expires_at && new Date(req.expires_at) < now) return "expired";
    return "pending";
  };

  const statusConfig = {
    pending: { icon: Clock, label: "Pending", variant: "secondary" as const, className: "" },
    approved: { icon: CheckCircle2, label: "Approved", variant: "default" as const, className: "bg-green-600 hover:bg-green-600" },
    rejected: { icon: XCircle, label: "Rejected", variant: "destructive" as const, className: "" },
    expired: { icon: AlertTriangle, label: "Expired", variant: "outline" as const, className: "text-muted-foreground" },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Send className="h-5 w-5 text-primary" />
          Outgoing Link Requests
        </CardTitle>
        <CardDescription>
          Requests you've sent to link with other patients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => {
          const status = getStatus(req);
          const config = statusConfig[status];
          const StatusIcon = config.icon;

          return (
            <div
              key={req.id}
              className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg border bg-background"
            >
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {targetProfiles?.[req.target_patient_id] || "Unknown Patient"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  As <span className="font-medium">{getRelLabel(req.relationship)}</span>
                  {" · "}
                  {format(new Date(req.created_at), "MMM d, yyyy")}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={config.variant} className={`gap-1 text-[10px] sm:text-xs ${config.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                  {status === "pending" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-6 sm:h-7 text-xs px-1.5 sm:px-2"
                      onClick={() => cancelRequest.mutate(req.id)}
                      disabled={cancelRequest.isPending}
                    >
                      {cancelRequest.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3 mr-0.5" />
                      )}
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
