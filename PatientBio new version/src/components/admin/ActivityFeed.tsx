import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  UserPlus,
  Shield,
  FileText,
  Share2,
  LogIn,
  Trash2,
  Eye,
  Edit,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AuditEvent {
  id: string;
  user_id: string;
  event_type: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  create: { icon: FileText, color: "text-green-600 bg-green-500/10", label: "Created" },
  insert: { icon: FileText, color: "text-green-600 bg-green-500/10", label: "Created" },
  signup: { icon: UserPlus, color: "text-green-600 bg-green-500/10", label: "Signed up" },
  login: { icon: LogIn, color: "text-blue-600 bg-blue-500/10", label: "Logged in" },
  access: { icon: Eye, color: "text-blue-600 bg-blue-500/10", label: "Accessed" },
  read: { icon: Eye, color: "text-blue-600 bg-blue-500/10", label: "Viewed" },
  update: { icon: Edit, color: "text-amber-600 bg-amber-500/10", label: "Updated" },
  share: { icon: Share2, color: "text-amber-600 bg-amber-500/10", label: "Shared" },
  role_change: { icon: Shield, color: "text-amber-600 bg-amber-500/10", label: "Role changed" },
  delete: { icon: Trash2, color: "text-red-600 bg-red-500/10", label: "Deleted" },
  revoke: { icon: Trash2, color: "text-red-600 bg-red-500/10", label: "Revoked" },
};

function getEventConfig(event: AuditEvent) {
  const type = event.event_type?.toLowerCase() || event.action?.toLowerCase() || "";
  for (const [key, config] of Object.entries(EVENT_CONFIG)) {
    if (type.includes(key)) return config;
  }
  return { icon: Activity, color: "text-muted-foreground bg-muted", label: event.action || event.event_type };
}

function getEventDescription(event: AuditEvent): string {
  const entity = event.entity_type?.replace(/_/g, " ") || "resource";
  const action = event.action || event.event_type || "performed action";
  return `${action} on ${entity}`;
}

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-activity-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_trail")
        .select("id, user_id, event_type, action, entity_type, entity_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as AuditEvent[];
    },
    refetchInterval: 30000,
  });

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Activity Feed
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-sm">Recent platform events</CardDescription>
          </div>
          <Link
            to="/admin/audit-logs"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <ActivityFeedSkeleton />
        ) : !events || events.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <ScrollArea className="h-[320px] sm:h-[380px] pr-2">
            <div className="space-y-1">
              {events.map((event, index) => {
                const config = getEventConfig(event);
                const Icon = config.icon;
                const [iconColor, iconBg] = config.color.split(" ");

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors",
                      index === 0 && "bg-muted/30"
                    )}
                  >
                    <div className={cn("p-1.5 rounded-lg flex-shrink-0 mt-0.5", iconBg)}>
                      <Icon className={cn("h-3.5 w-3.5", iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm leading-snug truncate">
                        {getEventDescription(event)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </span>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
