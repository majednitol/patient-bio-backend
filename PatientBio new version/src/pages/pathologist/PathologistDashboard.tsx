import { usePathologistProfile } from "@/hooks/usePathologistProfile";
import { usePathologistReports } from "@/hooks/usePathologistReports";
import { useDoctorPathologistShares } from "@/hooks/useDoctorPathologistShares";
import { useLabOrdersForPathologist } from "@/hooks/useLabOrdersForPathologist";
import { usePatientPathologistShares } from "@/hooks/usePatientPathologistShares";
import { PathologistProfileCompletionCard } from "@/components/pathologist/PathologistProfileCompletionCard";
import { DashboardTrendStats } from "@/components/pathologist/DashboardTrendStats";
import { NeedsAttentionCard } from "@/components/pathologist/NeedsAttentionCard";
import { ReportSparkline } from "@/components/pathologist/ReportSparkline";
import { TATTrackerCard } from "@/components/pathologist/TATTrackerCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Inbox, 
  Send, 
  Users, 
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Microscope,
  Building2,
  BarChart3,
} from "lucide-react";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const PathologistDashboard = () => {
  const { profile } = usePathologistProfile();
  const { reports } = usePathologistReports();
  const { receivedShares, pendingCount } = useDoctorPathologistShares();
  const { orders: labOrders, pendingCount: labPendingCount } = useLabOrdersForPathologist();
  const { patientShares } = usePatientPathologistShares();

  const totalWaitingCount = pendingCount + labPendingCount;

  const pendingLabOrders = labOrders.filter(o => o.status === "ordered" || o.status === "sample_collected").slice(0, 3);
  const recentShares = receivedShares.slice(0, 3);

  type WaitingItem = { id: string; type: "share" | "lab_order"; label: string; sublabel: string; status: string };
  const waitingItems: WaitingItem[] = [
    ...recentShares.map(s => ({
      id: s.id,
      type: "share" as const,
      label: "Doctor Referral",
      sublabel: s.disease_category || "General",
      status: s.status || "pending",
    })),
    ...pendingLabOrders.map(o => ({
      id: o.id,
      type: "lab_order" as const,
      label: o.hospital?.name || "Hospital Order",
      sublabel: (o.tests as any[])?.map((t: any) => t.name).join(", ") || "Lab Tests",
      status: o.status,
    })),
  ].slice(0, 4);

  return (
    <div className="space-y-6">
      <PathologistProfileCompletionCard />

      {/* Welcome Banner */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="diagnostic-gradient p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-white/80 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {getGreeting()}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {profile?.full_name || "Welcome"}
              </h1>
            </div>
            {profile?.is_verified ? (
              <Badge variant="outline" className="border-white/30 bg-white/15 text-white backdrop-blur-sm w-fit">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Verified Center
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/30 bg-white/15 text-white backdrop-blur-sm w-fit">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Pending Verification
              </Badge>
            )}
          </div>
        </div>
        {profile?.lab_name && (
          <div className="px-6 py-2.5 bg-muted/50 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{profile.lab_name}</span>
              {profile.specialization_area && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{profile.specialization_area}</span>
                </>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* TAT Alerts - auto-hides when empty */}
      <NeedsAttentionCard receivedShares={receivedShares} patientShares={patientShares} />

      {/* Trend Stats (replaces basic stats grid) */}
      <DashboardTrendStats reports={reports} receivedShares={receivedShares} pendingCount={pendingCount} />

      {/* TAT Tracker */}
      <TATTrackerCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Sparkline */}
        <ReportSparkline reports={reports} />

        {/* Waiting Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Waiting Queue</CardTitle>
              <CardDescription>Pending referrals & lab orders</CardDescription>
            </div>
            {totalWaitingCount > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/pathologist/from-doctors">
                  View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {waitingItems.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {waitingItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {item.type === "lab_order" ? (
                        <Building2 className="h-4 w-4 text-cyan-500" />
                      ) : (
                        <Users className="h-4 w-4 text-teal-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.status === "sample_collected" ? "Sample Ready" : item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/pathologist/reports">
              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              New Report
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/pathologist/from-doctors">
              <Inbox className="h-4 w-4 mr-2 text-muted-foreground" />
              Requests
              {pendingCount > 0 && (
                <Badge className="ml-auto" variant="secondary">{pendingCount}</Badge>
              )}
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/pathologist/to-doctors">
              <Send className="h-4 w-4 mr-2 text-muted-foreground" />
              Share
            </Link>
          </Button>
          <Button variant="outline" className="justify-start" asChild>
            <Link to="/pathologist/analytics">
              <BarChart3 className="h-4 w-4 mr-2 text-muted-foreground" />
              Analytics
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PathologistDashboard;
