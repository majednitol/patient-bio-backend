import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, LogIn, LogOut, Users, Calendar } from "lucide-react";
import { format } from "date-fns";

interface ActivityItem {
  id: string;
  type: "admission" | "discharge" | "appointment" | "staff_joined";
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
}

interface HospitalDashboardActivityFeedProps {
  activities: ActivityItem[];
  isLoading: boolean;
}

const ICON_MAP = {
  admission: <LogIn className="h-5 w-5 text-blue-600" />,
  discharge: <LogOut className="h-5 w-5 text-green-600" />,
  appointment: <Calendar className="h-5 w-5 text-purple-600" />,
  staff_joined: <Users className="h-5 w-5 text-orange-600" />,
};

export default function HospitalDashboardActivityFeed({
  activities,
  isLoading,
}: HospitalDashboardActivityFeedProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Today's activities and events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Today's activities and events</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          No activities yet today.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Today's latest events</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                {ICON_MAP[activity.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activity.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(activity.timestamp), "h:mm a")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
