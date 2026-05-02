import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUser, roleLabels, UserRole } from "@/hooks/useAdminUsers";
import {
  useUserProfileStats,
  useUserRecentActivity,
  useUserAccessHistory,
  useUserRoleHistory,
} from "@/hooks/useUserProfileDetails";
import { format, formatDistanceToNow } from "date-fns";
import { FileText, Key, Activity, Calendar, Shield, Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const roleColors: Record<UserRole, string> = {
  user: "bg-muted text-muted-foreground",
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  doctor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  hospital_admin: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  pathologist: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  researcher: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

interface UserProfileSheetProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatBox({ icon: Icon, label, value, isLoading }: { icon: React.ElementType; label: string; value: number; isLoading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 bg-muted/50 rounded-lg">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {isLoading ? (
        <Skeleton className="h-5 w-8" />
      ) : (
        <span className="text-lg font-bold">{value}</span>
      )}
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function UserProfileSheet({ user, open, onOpenChange }: UserProfileSheetProps) {
  const userId = user?.id ?? null;
  const { data: stats, isLoading: statsLoading } = useUserProfileStats(userId);
  const { data: recentActivity, isLoading: activityLoading } = useUserRecentActivity(userId);
  const { data: accessHistory, isLoading: accessLoading } = useUserAccessHistory(userId);
  const { data: roleHistory, isLoading: roleLoading } = useUserRoleHistory(userId);

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-primary" />
            {user.email}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", roleColors[user.role])}>
              {roleLabels[user.role]}
            </Badge>
            {user.email_confirmed_at ? (
              <Badge variant="secondary" className="text-[10px]">Verified</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Unverified</Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              Joined {format(new Date(user.created_at), "MMM d, yyyy")}
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatBox icon={FileText} label="Records" value={stats?.healthRecords ?? 0} isLoading={statsLoading} />
          <StatBox icon={Key} label="Tokens" value={stats?.accessTokens ?? 0} isLoading={statsLoading} />
          <StatBox icon={Activity} label="Events" value={stats?.auditEvents ?? 0} isLoading={statsLoading} />
          <StatBox icon={Calendar} label="Appts" value={stats?.appointments ?? 0} isLoading={statsLoading} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="activity" className="flex-1 text-xs">Recent Activity</TabsTrigger>
            <TabsTrigger value="access" className="flex-1 text-xs">Access History</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <ScrollArea className="h-[240px]">
              {activityLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !recentActivity?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((event) => (
                    <div key={event.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs truncate">
                          {event.action} — {event.entity_type?.replace(/_/g, " ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="access">
            <ScrollArea className="h-[240px]">
              {accessLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !accessHistory?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No access history</p>
              ) : (
                <div className="space-y-1">
                  {accessHistory.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs truncate">
                          {log.accessor_type} {log.accessor_email ? `(${log.accessor_email})` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {log.access_reason || "No reason specified"} • {log.city ? `${log.city}, ${log.country}` : "Unknown location"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.accessed_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Role History */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Role History
          </h4>
          {roleLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !roleHistory?.length ? (
            <p className="text-xs text-muted-foreground text-center py-3">No role changes recorded</p>
          ) : (
            <div className="space-y-1">
              {roleHistory.map((entry) => {
                const details = entry.details as Record<string, unknown> | null;
                return (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs">{entry.action?.replace(/_/g, " ")}</p>
                      {details && (
                        <p className="text-[10px] text-muted-foreground">
                          {details.from_role ? `${details.from_role} → ${details.to_role}` : JSON.stringify(details).slice(0, 60)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {format(new Date(entry.created_at!), "MMM d, yyyy")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
