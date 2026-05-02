import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useResearcherProfile } from "@/hooks/useResearcherProfile";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { useResearcherStudyNotes } from "@/hooks/useResearcherStudyNotes";
import { ResearcherProfileCompletionCard } from "@/components/researcher/ResearcherProfileCompletionCard";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  FlaskConical,
  User,
  QrCode,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Coins,
  BookOpen,
  Radio,
  Eye,
  Activity,
} from "lucide-react";

const ResearcherDashboard = () => {
  const { user } = useAuth();
  const { profile } = useResearcherProfile();
  const { researcherShares, pendingCount } = usePatientResearcherShares();
  const { notes } = useResearcherStudyNotes();

  const completedCount = researcherShares.filter((s) => s.status === "completed").length;
  const viewedCount = researcherShares.filter((s) => s.status === "viewed").length;

  // Fetch broadcast requests for token budget
  const { data: broadcasts = [] } = useQuery({
    queryKey: ["researcher-broadcasts-dashboard", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("research_broadcast_requests")
        .select("id, disease_category, research_purpose, total_token_budget, patients_approved, patients_rejected, status, created_at")
        .eq("researcher_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: STALE_TIMES.STANDARD,
  });

  const totalBudget = broadcasts.reduce((s, b) => s + (b.total_token_budget || 0), 0);
  const totalApproved = broadcasts.reduce((s, b) => s + (b.patients_approved || 0), 0);

  // Build activity timeline
  const timelineItems = [
    ...researcherShares.slice(0, 10).map((s) => ({
      type: s.status === "completed" ? "completed" : s.status === "viewed" ? "viewed" : "shared",
      label: s.status === "completed" ? "Data analysis completed" : s.status === "viewed" ? "Data viewed" : "New data shared",
      detail: s.disease_category?.replace("_", " ") || "General",
      date: new Date(s.status === "completed" ? s.completed_at! : s.status === "viewed" ? s.viewed_at! : s.shared_at),
      icon: s.status === "completed" ? CheckCircle : s.status === "viewed" ? Eye : FileText,
    })),
    ...broadcasts.slice(0, 5).map((b) => ({
      type: "broadcast" as const,
      label: "Broadcast created",
      detail: b.research_purpose || b.disease_category || "Research",
      date: new Date(b.created_at),
      icon: Radio,
    })),
    ...notes.slice(0, 5).map((n) => ({
      type: "note" as const,
      label: "Study note updated",
      detail: n.study_title,
      date: new Date(n.updated_at),
      icon: BookOpen,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  // Getting started checklist
  const checklistItems = [
    { label: "Complete your profile", done: !!(profile?.full_name && profile?.institution_name), link: "/researcher/profile" },
    { label: "Get verified", done: !!profile?.is_verified, link: "/researcher/profile" },
    { label: "Create first broadcast", done: broadcasts.length > 0, link: "/researcher/data" },
    { label: "Receive first data share", done: researcherShares.length > 0, link: "/researcher/qr-code" },
  ];
  const allDone = checklistItems.every((c) => c.done);

  return (
    <div className="space-y-6">
      <ResearcherProfileCompletionCard />

      {/* Welcome Header with Verification Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Welcome, {profile?.full_name?.split(" ")[0] || "Researcher"}!
            {profile?.is_verified ? (
              <Badge variant="default" className="ml-2 gap-1">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-2 gap-1">
                <ShieldAlert className="h-3 w-3" /> Unverified
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {profile?.institution_name || "Research Lab Portal"}
          </p>
        </div>
        <FlaskConical className="h-12 w-12 text-primary" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Data Shares</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{researcherShares.length}</div>
            <p className="text-xs text-muted-foreground">Patient-shared data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Research completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Budget</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBudget}</div>
            <p className="text-xs text-muted-foreground">{totalApproved} patients approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clinical Data</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {researcherShares.filter((s: any) => s.include_clinical_records).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {researcherShares.length} with clinical records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Checklist (for new researchers) */}
      {!allDone && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Getting Started</CardTitle>
            <CardDescription>Complete these steps to start receiving research data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checklistItems.map((item) => (
                <Link key={item.label} to={item.link}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.done ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
                    }`}>
                      {item.done && "✓"}
                    </div>
                    <span className={item.done ? "text-muted-foreground line-through" : "font-medium"}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Link to="/researcher/data">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Research Data</div>
                    <div className="text-xs text-muted-foreground">
                      {pendingCount > 0 ? `${pendingCount} pending` : "View all data"}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/researcher/notes">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Study Notes</div>
                    <div className="text-xs text-muted-foreground">{notes.length} notes</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/researcher/profile">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">My Profile</div>
                    <div className="text-xs text-muted-foreground">Update details</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/researcher/qr-code">
              <Button variant="outline" className="w-full justify-between h-auto py-4">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Share QR Code</div>
                    <div className="text-xs text-muted-foreground">For patients to connect</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
          <CardDescription>Recent research activity across all areas</CardDescription>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity yet</p>
              <p className="text-sm">Start by sharing your QR code with patients or creating a broadcast request</p>
            </div>
          ) : (
            <div className="space-y-1">
              {timelineItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.date.toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResearcherDashboard;
