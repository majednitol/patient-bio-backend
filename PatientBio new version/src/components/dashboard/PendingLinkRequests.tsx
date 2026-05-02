import { useIncomingLinkRequests, useRespondToLinkRequest } from "@/hooks/useFamilyLinkRequests";
import { RELATIONSHIP_OPTIONS } from "@/hooks/useFamilyMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check, X, Loader2, User } from "lucide-react";
import { format } from "date-fns";

export const PendingLinkRequests = () => {
  const { data: requests, isLoading } = useIncomingLinkRequests();
  const respond = useRespondToLinkRequest();

  const requesterIds = requests?.map((r) => r.requester_id) || [];
  const { data: requesterProfiles } = useQuery({
    queryKey: ["requester-profiles", requesterIds],
    queryFn: async () => {
      if (requesterIds.length === 0) return {};
      const { data } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", requesterIds);
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.display_name || "Unknown"; });
      return map;
    },
    enabled: requesterIds.length > 0,
  });

  // Already filtered for expired in the hook
  if (isLoading || !requests || requests.length === 0) return null;

  const getRelLabel = (v: string) =>
    RELATIONSHIP_OPTIONS.find((r) => r.value === v)?.label || v;

  return (
    <Card className="border-accent bg-accent/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-accent-foreground" />
          Pending Link Requests
          <Badge variant="secondary">{requests.length}</Badge>
        </CardTitle>
        <CardDescription>
          Someone wants to manage your health records. Review and respond.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-background"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {requesterProfiles?.[req.requester_id] || "Unknown User"}
              </p>
              <p className="text-xs text-muted-foreground">
                Wants to link as <span className="font-medium">{getRelLabel(req.relationship)}</span>
                {" · "}
                {format(new Date(req.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => respond.mutate({ request_id: req.id, action: "reject" })}
                disabled={respond.isPending}
              >
                {respond.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => respond.mutate({ request_id: req.id, action: "approve" })}
                disabled={respond.isPending}
              >
                {respond.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                Approve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
